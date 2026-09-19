"""
face_cross_verifier.py

Downloads profile photos from discovered OSINT sources and cross-verifies them
against the user-supplied face image using DeepFace Facenet512.

Only profiles whose photo matches the uploaded face are marked as verified.
"""

import os
import httpx
import asyncio
import logging
import tempfile
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/113 Safari/537.36"
}


async def _fetch_image_url(client: httpx.AsyncClient, source: str, data: Dict) -> Optional[str]:
    """
    Extracts a profile photo URL from a scraped source's data dict.
    Supports: LinkedIn, GitHub, Wikipedia, Reddit, Instagram, Facebook, Twitter/X, YouTube.
    """
    import re
    try:
        url = data.get("url", "")

        if source == "linkedin":
            if url:
                r = await client.get(url, timeout=6.0, follow_redirects=True)
                if r.status_code == 200:
                    match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', r.text)
                    if match:
                        return match.group(1)

        elif source == "reddit":
            url = url.replace("/u/", "/user/")
            if url:
                r = await client.get(url.rstrip("/") + "/about.json",
                                     headers={"User-Agent": "NeuraX-OSINT/1.0"}, timeout=4.0)
                if r.status_code == 200:
                    icon = r.json().get("data", {}).get("icon_img", "")
                    if icon and "http" in icon:
                        return icon.split("?")[0]

        elif source == "github":
            avatar = data.get("avatar_url")
            if avatar:
                return avatar
            # Fallback: extract username from URL and hit the API
            if url and "github.com" in url:
                username = url.rstrip("/").split("/")[-1]
                r = await client.get(f"https://api.github.com/users/{username}", timeout=4.0)
                if r.status_code == 200:
                    return r.json().get("avatar_url")

        elif source == "wikipedia" or source == "wiki":
            name = data.get("name") or data.get("title", "")
            if name:
                api_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{name.replace(' ', '_')}"
                r = await client.get(api_url, timeout=4.0)
                if r.status_code == 200:
                    return r.json().get("originalimage", {}).get("source")

        elif source == "instagram":
            # Try og:image from the profile page
            if url:
                r = await client.get(url, timeout=6.0, follow_redirects=True)
                if r.status_code == 200:
                    match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', r.text)
                    if match:
                        return match.group(1)

        elif source in ("twitter", "twitter/x"):
            # Try og:image from profile page
            if url:
                r = await client.get(url, timeout=6.0, follow_redirects=True)
                if r.status_code == 200:
                    match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', r.text)
                    if match:
                        return match.group(1)

        elif source == "facebook":
            if url:
                r = await client.get(url, timeout=6.0, follow_redirects=True)
                if r.status_code == 200:
                    match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', r.text)
                    if match:
                        return match.group(1)

        elif source == "youtube":
            if url:
                r = await client.get(url, timeout=6.0, follow_redirects=True)
                if r.status_code == 200:
                    match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', r.text)
                    if match:
                        return match.group(1)

        # Generic fallback: try og:image on any URL
        elif url and url.startswith("http"):
            r = await client.get(url, timeout=5.0, follow_redirects=True)
            if r.status_code == 200:
                match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', r.text)
                if match:
                    return match.group(1)

    except Exception as e:
        logger.debug(f"Could not fetch image for {source}: {e}")

    return None


async def _download_to_temp(client: httpx.AsyncClient, url: str) -> Optional[str]:
    """Downloads an image URL to a temp file, returns the path."""
    try:
        r = await client.get(url, timeout=6.0, follow_redirects=True)
        if r.status_code == 200 and "image" in r.headers.get("content-type", ""):
            suffix = ".jpg"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
                f.write(r.content)
                return f.name
    except Exception as e:
        logger.debug(f"Failed to download {url}: {e}")
    return None


def _verify_faces_sync(probe_path: str, candidate_path: str) -> Dict:
    """Synchronous DeepFace.verify call (runs in thread pool)."""
    try:
        from deepface import DeepFace
        result = DeepFace.verify(
            img1_path=probe_path,
            img2_path=candidate_path,
            model_name="Facenet512",
            enforce_detection=False,  # Tolerate low-quality scraped thumbnails
            detector_backend="retinaface",  # More accurate face detection
            align=True,
            silent=True,
        )
        return {
            "verified": result.get("verified", False),
            "distance": result.get("distance", 1.0),
            "threshold": result.get("threshold", 0.3),
        }
    except Exception as e:
        logger.debug(f"DeepFace verify error: {e}")
        return {"verified": False, "distance": 1.0, "threshold": 0.3}


async def cross_verify_profiles(
    probe_image_path: str,
    profiles: List[Dict],
    scraping_payload: Dict,
) -> List[Dict]:
    """
    Main entry point. For each profile in `profiles`, tries to:
      1. Find a profile photo URL from the corresponding scraping data
      2. Download the photo to a temp file
      3. Run DeepFace.verify against the uploaded probe image

    Returns a new profiles list with `face_verified` and `face_confidence` added.
    Profiles without a downloadable photo pass through unchanged (face_verified=None).
    Profiles with a photo that FAILS verification are excluded entirely.
    """
    if not probe_image_path or not os.path.exists(probe_image_path):
        # No probe image — pass all profiles through, unverified
        for p in profiles:
            p["face_verified"] = None
        return profiles

    verified_profiles = []

    async with httpx.AsyncClient(headers=HEADERS, timeout=6.0) as client:
        for profile in profiles:
            platform = profile.get("platform", "").lower()

            # Map platform → scraping_payload key (with fallback to profile URL)
            source_data = None
            if platform == "linkedin":
                source_data = scraping_payload.get("linkedin") or {"url": profile.get("url", "")}
            elif platform == "reddit":
                source_data = {"url": profile.get("url", "")}
            elif platform == "github":
                source_data = scraping_payload.get("github") or {"url": profile.get("url", "")}
            elif platform in ("wikipedia", "wiki"):
                source_data = scraping_payload.get("wikipedia") or {}
            elif platform in ("instagram", "twitter", "twitter/x", "facebook", "youtube", "tiktok"):
                source_data = {"url": profile.get("url", "")}

            # Try to get a photo URL
            photo_url = None
            if source_data:
                photo_url = await _fetch_image_url(client, platform, source_data)

            if not photo_url:
                # No photo available — keep profile, mark as unverified
                profile["face_verified"] = None
                verified_profiles.append(profile)
                logger.info(f"[face_verify] No photo for {platform} — keeping unverified")
                continue

            # Download photo
            candidate_path = await _download_to_temp(client, photo_url)
            if not candidate_path:
                profile["face_verified"] = None
                verified_profiles.append(profile)
                continue

            # Run DeepFace in thread pool
            try:
                result = await asyncio.to_thread(_verify_faces_sync, probe_image_path, candidate_path)
                face_verified = result["verified"]
                distance = result["distance"]
                threshold = result["threshold"]
                face_confidence = max(0.0, 1.0 - (distance / threshold)) if threshold > 0 else 0.0

                if face_verified:
                    profile["face_verified"] = True
                    profile["face_confidence"] = round(face_confidence, 3)
                    profile["confidence"] = round(min(0.99, profile.get("confidence", 0.8) + 0.15), 3)
                    verified_profiles.append(profile)
                    logger.info(f"[face_verify] ✅ MATCH {platform} (dist={distance:.3f})")
                else:
                    # Face doesn't match — exclude this profile to prevent false positives
                    logger.info(f"[face_verify] ❌ MISMATCH {platform} (dist={distance:.3f}) — excluded")

            except Exception as e:
                logger.warning(f"[face_verify] Error verifying {platform}: {e}")
                profile["face_verified"] = None
                verified_profiles.append(profile)
            finally:
                try:
                    os.unlink(candidate_path)
                except Exception:
                    pass

    return verified_profiles
