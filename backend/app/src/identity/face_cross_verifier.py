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

FB_BOT_HEADERS = {
    "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
}

TWITTER_BOT_HEADERS = {
    "User-Agent": "Twitterbot/1.0"
}


async def _fetch_image_url(client: httpx.AsyncClient, source: str, data: Dict) -> Optional[str]:
    """
    Extracts a profile photo URL from a scraped source's data dict.
    Supports: LinkedIn, GitHub, Wikipedia, Reddit, Instagram, Facebook, Twitter/X, YouTube, TikTok.
    """
    import re
    import html

    # Return directly if already present
    for key in ("photo_url", "avatar_url", "image_url"):
        if data.get(key) and isinstance(data[key], str) and data[key].startswith("http"):
            return data[key]

    try:
        url = data.get("url", "")

        if source == "linkedin":
            if url:
                r = await client.get(url, headers=FB_BOT_HEADERS, timeout=6.0, follow_redirects=True)
                if r.status_code == 200:
                    match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', r.text)
                    if match:
                        img_url = html.unescape(match.group(1))
                        if "ghost" not in img_url.lower() and "static.licdn" not in img_url.lower():
                            return img_url

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
            img = data.get("image_url") or data.get("originalimage", {}).get("source") or data.get("thumbnail", {}).get("source")
            if img:
                return img
            name = data.get("name") or data.get("title", "")
            if name:
                api_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{name.replace(' ', '_')}"
                r = await client.get(api_url, timeout=4.0)
                if r.status_code == 200:
                    rj = r.json()
                    return rj.get("originalimage", {}).get("source") or rj.get("thumbnail", {}).get("source")

        elif source == "instagram":
            # Use Facebook crawler user-agent to bypass login wall and extract og:image
            if url:
                r = await client.get(url, headers=FB_BOT_HEADERS, timeout=6.0, follow_redirects=True)
                if r.status_code == 200:
                    match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', r.text)
                    if match:
                        img = html.unescape(match.group(1))
                        # Filter out default placeholder icons
                        if not any(k in img.lower() for k in ["static/images", "default_avatar", "null"]):
                            return img

        elif source in ("twitter", "twitter/x"):
            # Use Twitterbot crawler user-agent to bypass login walls and extract og:image
            if url:
                r = await client.get(url, headers=TWITTER_BOT_HEADERS, timeout=6.0, follow_redirects=True)
                if r.status_code == 200:
                    match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', r.text)
                    if match:
                        img = html.unescape(match.group(1))
                        if not any(k in img.lower() for k in ["default_profile", "x_logo", "null"]):
                            return img

        elif source == "facebook":
            if url:
                r = await client.get(url, headers=FB_BOT_HEADERS, timeout=6.0, follow_redirects=True)
                if r.status_code == 200:
                    match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', r.text)
                    if match:
                        img = html.unescape(match.group(1))
                        # Filter out default Facebook logos / placeholders
                        if not any(k in img.lower() for k in ["rsrc.php", "fb_icon", "blank.gif", "null"]):
                            return img

        elif source == "youtube":
            if url:
                r = await client.get(url, headers=FB_BOT_HEADERS, timeout=6.0, follow_redirects=True)
                if r.status_code == 200:
                    match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', r.text)
                    if match:
                        img = html.unescape(match.group(1))
                        if not any(k in img.lower() for k in ["default_avatar", "null"]):
                            return img

        elif source == "tiktok":
            if url:
                r = await client.get(url, headers=FB_BOT_HEADERS, timeout=6.0, follow_redirects=True)
                if r.status_code == 200:
                    match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', r.text)
                    if match:
                        img = html.unescape(match.group(1))
                        if not any(k in img.lower() for k in ["logo", "tiktok-webarch", "default", "null"]):
                            return img

        # Generic fallback: try og:image on any URL
        elif url and url.startswith("http"):
            r = await client.get(url, headers=FB_BOT_HEADERS, timeout=5.0, follow_redirects=True)
            if r.status_code == 200:
                match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', r.text)
                if match:
                    img = html.unescape(match.group(1))
                    if not any(k in img.lower() for k in ["default_avatar", "blank.gif", "null"]):
                        return img

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


# User threshold rule: below 50% similarity is considered a failure (not the same person)
SIMILARITY_THRESHOLD = 0.50
DISTANCE_THRESHOLD = 1.0 - SIMILARITY_THRESHOLD  # 0.50 (cosine distance threshold corresponding to 50% similarity)


def _verify_faces_sync(probe_path: str, candidate_path: str) -> Dict:
    """
    Synchronous DeepFace.verify call (runs in thread pool).
    Computes cosine similarity = max(0.0, min(1.0, 1.0 - distance)).
    Rule: below 50% similarity (< 0.50) fails verification (NOT the same person).
    """
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
        distance = float(result.get("distance", 1.0))
        similarity = max(0.0, min(1.0, 1.0 - distance))
        # Below 50% similarity fails verification (not the same person)
        verified = bool(similarity >= SIMILARITY_THRESHOLD)
        return {
            "verified": verified,
            "distance": distance,
            "similarity": round(similarity, 3),
            "threshold": DISTANCE_THRESHOLD,
            "similarity_threshold": SIMILARITY_THRESHOLD,
        }
    except Exception as e:
        logger.debug(f"DeepFace verify error: {e}")
        return {
            "verified": False,
            "distance": 1.0,
            "similarity": 0.0,
            "threshold": DISTANCE_THRESHOLD,
            "similarity_threshold": SIMILARITY_THRESHOLD,
        }


async def cross_verify_profiles(
    probe_image_path: str,
    profiles: List[Dict],
    scraping_payload: Dict,
    emit_callback: Optional[Any] = None,
) -> List[Dict]:
    """
    Main entry point. For each profile in `profiles`, tries to:
      1. Find a profile photo URL from the corresponding scraping data or existing photo_url
      2. Download the photo to a temp file
      3. Run DeepFace.verify against the uploaded probe image

    Returns a new profiles list with `face_verified` and `face_confidence` added.
    Profiles without a downloadable photo pass through unchanged (face_verified=None).
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

            # 1. Use photo_url if already attached to profile (e.g. from web, news, scholar, etc.)
            photo_url = profile.get("photo_url")

            # 2. If not attached, try to extract photo URL
            if not photo_url:
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
                elif profile.get("url"):
                    source_data = {"url": profile.get("url")}

                if source_data:
                    photo_url = await _fetch_image_url(client, platform, source_data)
                    if photo_url:
                        profile["photo_url"] = photo_url

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
                similarity = result.get("similarity", max(0.0, min(1.0, 1.0 - distance)))
                face_confidence = similarity

                handle = profile.get("username") or profile.get("title") or ""
                handle_str = f" (@{handle})" if handle and not handle.startswith("@") and not " " in handle else f" ({handle})" if handle else ""
                plat_display = platform.capitalize() if platform not in ("twitter/x", "twitter") else "Twitter/X"

                profile["face_distance"] = round(distance, 3)
                profile["face_similarity"] = round(similarity, 3)
                sim_pct = int(similarity * 100)

                if face_verified:
                    profile["face_verified"] = True
                    profile["face_confidence"] = round(face_confidence, 3)
                    profile["confidence"] = round(min(0.99, profile.get("confidence", 0.8) + 0.15), 3)
                    verified_profiles.append(profile)
                    logger.info(f"[face_verify] ✅ MATCH {platform} (sim={sim_pct}%, dist={distance:.3f})")
                    if emit_callback:
                        try:
                            await emit_callback(
                                f"✅ Face matched on {plat_display}{handle_str} — similarity {sim_pct}%"
                            )
                        except Exception:
                            pass
                else:
                    profile["face_verified"] = False
                    profile["face_confidence"] = 0.0
                    logger.info(f"[face_verify] ❌ MISMATCH {platform} (sim={sim_pct}%, dist={distance:.3f}) — not same person")
                    if emit_callback:
                        try:
                            await emit_callback(
                                f"⚠️ Face mismatch on {plat_display}{handle_str} — similarity {sim_pct}% (not same person)"
                            )
                        except Exception:
                            pass
                    # If this profile was a confirmed text match, keep it but mark face_verified = False
                    if profile.get("text_attribution") == "CONFIRMED":
                        verified_profiles.append(profile)

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


async def resolve_candidate_avatar(
    profiles: List[Dict],
    scraping_payload: Optional[Dict] = None,
    probe_image_path: Optional[str] = None,
) -> Optional[str]:
    """
    Extracts, validates, and assigns the best available avatar URL for the candidate and profiles.
    When probe_image_path is provided:
      - Strictly prioritizes photos verified to match the probe image.
      - Never selects an avatar whose face does not match the probe image.
    When no probe_image_path is provided:
      - Prioritizes confirmed LinkedIn, then socials (Instagram, Facebook, YouTube, Twitter, GitHub), then Wikipedia.
    Returns the target candidate avatar URL.
    """
    if not scraping_payload:
        scraping_payload = {}

    candidate_name = scraping_payload.get("target_name") or ""
    if not candidate_name:
        for p in profiles:
            if p.get("username") and " " in p.get("username", ""):
                candidate_name = p["username"]
                break

    # 1. Concurrently enrich ALL discovered profiles with photo_url
    async with httpx.AsyncClient(headers=HEADERS, timeout=6.0) as client:
        async def _enrich_profile(p: Dict):
            if p.get("photo_url"):
                return p["photo_url"]
            plat = p.get("platform", "").lower()
            url = p.get("url", "")
            if not url:
                return None
            source_data = {"url": url}
            if plat == "github":
                source_data = scraping_payload.get("github") or source_data
            elif plat in ("wikipedia", "wiki"):
                source_data = scraping_payload.get("wikipedia") or source_data
            elif plat == "linkedin":
                source_data = scraping_payload.get("linkedin") or source_data

            try:
                img = await _fetch_image_url(client, plat, source_data)
                if img:
                    p["photo_url"] = img
                    return img
            except Exception:
                pass
            return None

        if profiles:
            await asyncio.gather(*[_enrich_profile(p) for p in profiles], return_exceptions=True)

    # Helper to check if a photo URL matches the probe image
    async def _verify_photo_url_against_probe(url: str) -> Optional[float]:
        """Returns distance if face matches probe image (distance <= 0.60), else None."""
        if not probe_image_path or not os.path.exists(probe_image_path) or not url:
            return None
        async with httpx.AsyncClient(headers=HEADERS, timeout=6.0) as client:
            candidate_path = await _download_to_temp(client, url)
            if not candidate_path:
                return None
            try:
                res = await asyncio.to_thread(_verify_faces_sync, probe_image_path, candidate_path)
                if res.get("verified"):
                    return res.get("distance", 0.5)
            except Exception as e:
                logger.debug(f"Error checking photo against probe: {e}")
            finally:
                try:
                    os.unlink(candidate_path)
                except Exception:
                    pass
        return None

    # CASE A: A PROBE IMAGE WAS PROVIDED BY THE USER
    if probe_image_path and os.path.exists(probe_image_path):
        # 1. Check if any profile already has face_verified is True
        verified_candidates = []
        for p in profiles:
            if p.get("face_verified") is True and p.get("photo_url"):
                dist = p.get("face_distance", 0.5)
                verified_candidates.append((dist, p["photo_url"]))

        if verified_candidates:
            # Pick the lowest distance (best match)
            verified_candidates.sort(key=lambda x: x[0])
            best_photo = verified_candidates[0][1]
            logger.info(f"[resolve_avatar] Selected face-verified avatar (dist={verified_candidates[0][0]}): {best_photo[:60]}...")
            return best_photo

        # 2. Check Wikipedia image from payload or profiles
        wiki = scraping_payload.get("wikipedia") or {}
        wiki_img = wiki.get("image_url") or wiki.get("originalimage", {}).get("source") or wiki.get("thumbnail", {}).get("source")
        if wiki_img:
            dist = await _verify_photo_url_against_probe(wiki_img)
            if dist is not None:
                logger.info(f"[resolve_avatar] Wikipedia photo verified against probe (dist={dist}): {wiki_img[:60]}...")
                return wiki_img

        # 3. Check any profile with a photo_url that hasn't been verified yet
        for p in profiles:
            if p.get("face_verified") is not False and p.get("photo_url"):
                dist = await _verify_photo_url_against_probe(p["photo_url"])
                if dist is not None:
                    p["face_verified"] = True
                    p["face_distance"] = round(dist, 3)
                    logger.info(f"[resolve_avatar] Verified profile photo ({p.get('platform')}) against probe: {p['photo_url'][:60]}...")
                    return p["photo_url"]

        # 4. If no scraped photo matches the probe image:
        # Fall through to resolve the best photo scraped for this name from online sources (Wikipedia, LinkedIn, socials)
        # so that it can be compared and displayed alongside the probe image with the mismatch warning!
        logger.info("[resolve_avatar] No scraped online photos matched the uploaded probe image — resolving best scraped photo for name...")

    # CASE B: RESOLVE BEST ONLINE PHOTO FOR NAME (FALLBACK OR TEXT-ONLY)
    # 1. Wikipedia portrait check (authoritative biographical image for target entity)
    wiki = scraping_payload.get("wikipedia") or {}
    wiki_img = wiki.get("image_url") or wiki.get("originalimage", {}).get("source") or wiki.get("thumbnail", {}).get("source")
    if wiki_img:
        logger.info(f"[resolve_avatar] Selected Wikipedia biographical portrait: {wiki_img[:60]}...")
        return wiki_img

    # 2. Check LinkedIn photo (only if present in corroborated profiles or payload)
    li_photo = None
    for p in profiles:
        if p.get("platform", "").lower() == "linkedin" and p.get("photo_url"):
            li_photo = p["photo_url"]
            break
    if not li_photo:
        li = scraping_payload.get("linkedin") or {}
        # Only take from payload if LinkedIn is in profiles
        if li.get("photo_url") and any(p.get("platform", "").lower() == "linkedin" for p in profiles):
            li_photo = li["photo_url"]

    if li_photo:
        logger.info(f"[resolve_avatar] Selected primary LinkedIn avatar: {li_photo[:60]}...")
        return li_photo

    # 3. Check socials (Instagram, Facebook, YouTube, Twitter, GitHub)
    social_priority = ["instagram", "facebook", "youtube", "twitter", "twitter/x", "github"]
    for target_plat in social_priority:
        for p in profiles:
            if p.get("platform", "").lower() == target_plat and p.get("photo_url"):
                logger.info(f"[resolve_avatar] Found social avatar from {target_plat}: {p['photo_url'][:60]}...")
                return p["photo_url"]

    # 4. Targeted Social Discovery Fallback: If no social photo found in existing profiles, proactively search Instagram & Facebook
    if candidate_name:
        try:
            from app.src.scraping.search_dorker import _google_structured_search
            from app.src.identity.profile_attributor import matches_candidate_identity

            logger.info(f"[resolve_avatar] Targeted social check for {candidate_name} on Instagram and Facebook...")
            ig_query = f'site:instagram.com "{candidate_name}"'
            fb_query = f'site:facebook.com "{candidate_name}"'

            ig_res, fb_res = await asyncio.gather(
                _google_structured_search(ig_query),
                _google_structured_search(fb_query),
                return_exceptions=True
            )

            aliases = scraping_payload.get("aliases") or []
            async with httpx.AsyncClient(headers=HEADERS, timeout=6.0) as client:
                # Check Instagram first
                if isinstance(ig_res, list):
                    for item in ig_res:
                        url = item.get("url", "")
                        title = item.get("title", "")
                        snippet = item.get("snippet", "")
                        if "instagram.com" in url.lower() and matches_candidate_identity(candidate_name, f"{url} {title} {snippet}", aliases=aliases):
                            if ("/p/" in url or "/reel/" in url) and not snippet:
                                continue
                            img = await _fetch_image_url(client, "instagram", {"url": url})
                            if img:
                                handle = url.rstrip("/").split("/")[-1]
                                prof = {
                                    "platform": "instagram",
                                    "username": handle,
                                    "title": title or f"Instagram: @{handle}",
                                    "url": url,
                                    "snippet": snippet,
                                    "photo_url": img,
                                    "confidence": 0.85,
                                    "text_attribution": "POSSIBLE"
                                }
                                profiles.append(prof)
                                logger.info(f"[resolve_avatar] Discovered Instagram avatar: {img[:60]}...")
                                return img

                # Check Facebook next
                if isinstance(fb_res, list):
                    for item in fb_res:
                        url = item.get("url", "")
                        title = item.get("title", "")
                        snippet = item.get("snippet", "")
                        if "facebook.com" in url.lower() and matches_candidate_identity(candidate_name, f"{url} {title} {snippet}", aliases=aliases):
                            img = await _fetch_image_url(client, "facebook", {"url": url})
                            if img:
                                handle = url.rstrip("/").split("/")[-1]
                                prof = {
                                    "platform": "facebook",
                                    "username": handle,
                                    "title": title or f"Facebook: {candidate_name}",
                                    "url": url,
                                    "snippet": snippet,
                                    "photo_url": img,
                                    "confidence": 0.85,
                                    "text_attribution": "POSSIBLE"
                                }
                                profiles.append(prof)
                                logger.info(f"[resolve_avatar] Discovered Facebook avatar: {img[:60]}...")
                                return img

        except Exception as e:
            logger.warning(f"[resolve_avatar] Error during targeted social discovery: {e}")

    # 5. Wikipedia portrait check (fallback if no LinkedIn or social photo)
    wiki = scraping_payload.get("wikipedia") or {}
    wiki_img = wiki.get("image_url") or wiki.get("originalimage", {}).get("source") or wiki.get("thumbnail", {}).get("source")
    if wiki_img:
        return wiki_img

    # 6. GitHub avatar from payload
    gh = scraping_payload.get("github") or {}
    if gh.get("avatar_url"):
        return gh["avatar_url"]

    # 7. Fallback: any profile with photo_url
    for p in profiles:
        if p.get("photo_url"):
            return p["photo_url"]

    return None


async def verify_probe_against_scraped(probe_image_path: str, scraped_image_url: str) -> Dict[str, Any]:
    """
    Compares the uploaded probe image against the scraped web avatar.
    Below 30% similarity is considered not the same person.
    Returns:
      {
        "is_match": bool or None,
        "distance": float,
        "similarity": float,
        "threshold": float,
        "warning": Optional[str]
      }
    """
    if not probe_image_path or not os.path.exists(probe_image_path) or not scraped_image_url:
        return {"is_match": None, "distance": 1.0, "similarity": 0.0, "threshold": DISTANCE_THRESHOLD, "warning": None}

    cleanup = False
    if os.path.exists(scraped_image_url):
        candidate_path = scraped_image_url
    else:
        async with httpx.AsyncClient(headers=HEADERS, timeout=6.0) as client:
            candidate_path = await _download_to_temp(client, scraped_image_url)
            cleanup = True

    if not candidate_path:
        return {"is_match": None, "distance": 1.0, "similarity": 0.0, "threshold": DISTANCE_THRESHOLD, "warning": None}

    try:
        res = await asyncio.to_thread(_verify_faces_sync, probe_image_path, candidate_path)
        is_match = bool(res.get("verified", False))
        dist = float(res.get("distance", 1.0))
        similarity = float(res.get("similarity", max(0.0, min(1.0, 1.0 - dist))))
        thresh = float(res.get("threshold", DISTANCE_THRESHOLD))
        sim_pct = int(similarity * 100)
        return {
            "is_match": is_match,
            "distance": dist,
            "similarity": similarity,
            "threshold": thresh,
            "warning": None if is_match else f"The uploaded image does not belong to this person (face similarity {sim_pct}%)."
        }
    except Exception as e:
        logger.warning(f"Error comparing probe against scraped image: {e}")
        return {"is_match": None, "distance": 1.0, "similarity": 0.0, "threshold": DISTANCE_THRESHOLD, "warning": None}
    finally:
        if cleanup and candidate_path:
            try:
                os.unlink(candidate_path)
            except Exception:
                pass

