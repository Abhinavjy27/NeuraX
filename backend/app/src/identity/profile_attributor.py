"""
profile_attributor.py

When no face image is available, verifies that each discovered profile actually
belongs to the target person by comparing the profile's scraped bio/snippet
against the user-supplied context seed using GPT-4o.

For each profile:
  - Fetches the profile page and extracts bio text (name, headline, location, etc.)
  - Asks GPT-4o: "Does this bio describe the same person as this context?"
  - Returns attribution_score (0-1) and a decision: CONFIRMED / POSSIBLE / REJECTED
"""

import os
import httpx
import asyncio
import logging
import re
from typing import Dict, List, Optional
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/113 Safari/537.36"
}


async def _extract_bio_from_page(http_client: httpx.AsyncClient, url: str) -> str:
    """Fetch a profile page and extract readable text snippets (meta description, og:description, h1, etc.)"""
    try:
        r = await http_client.get(url, timeout=5.0, follow_redirects=True)
        if r.status_code != 200:
            return ""
        html = r.text

        snippets = []

        # og:description (richest signal — LinkedIn, GitHub, Reddit all set this)
        m = re.search(r'<meta[^>]+(?:property=["\']og:description["\']|name=["\']description["\'])[^>]+content=["\'](.*?)["\']', html, re.IGNORECASE)
        if m:
            snippets.append(m.group(1))

        # og:title
        m = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\'](.*?)["\']', html, re.IGNORECASE)
        if m:
            snippets.append(m.group(1))

        # <title> tag
        m = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        if m:
            snippets.append(re.sub(r'\s+', ' ', m.group(1)).strip())

        return " | ".join(s.strip() for s in snippets if s.strip())[:800]

    except Exception as e:
        logger.debug(f"Bio extraction failed for {url}: {e}")
        return ""


async def _llm_attribute(context: str, candidate_name: str, profile_platform: str, profile_bio: str) -> Dict:
    """
    Ask GPT-4o whether the profile bio matches the target person's context.
    Returns {decision: CONFIRMED|POSSIBLE|REJECTED, score: float, reason: str}
    """
    if not client.api_key or not profile_bio.strip():
        # Can't verify without LLM or bio — mark as possible
        return {"decision": "POSSIBLE", "score": 0.5, "reason": "No bio text available to verify."}

    prompt = f"""You are an OSINT identity attribution expert. Your task is to determine whether a social profile belongs to a specific person.

TARGET PERSON CONTEXT (what the analyst knows about them):
{context}

DISCOVERED PROFILE:
Platform: {profile_platform}
Profile Bio / Page Text: {profile_bio}

TASK: Does this profile belong to the same person described in the context above?

Respond ONLY with valid JSON:
{{
  "decision": "CONFIRMED" | "POSSIBLE" | "REJECTED",
  "score": <float 0.0-1.0>,
  "reason": "<one sentence explanation>"
}}

Rules:
- CONFIRMED (score 0.8-1.0): Strong evidence (name + org/location/role matches)
- POSSIBLE (score 0.4-0.79): Name matches but bio is thin or ambiguous
- REJECTED (score 0.0-0.39): Clear mismatch, different person, or generic placeholder"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=150,
        )
        import json
        result = json.loads(response.choices[0].message.content)
        return {
            "decision": result.get("decision", "POSSIBLE"),
            "score": float(result.get("score", 0.5)),
            "reason": result.get("reason", ""),
        }
    except Exception as e:
        logger.warning(f"LLM attribution failed: {e}")
        return {"decision": "POSSIBLE", "score": 0.5, "reason": "LLM attribution unavailable."}


async def text_attribute_profiles(
    context: str,
    candidate_name: str,
    profiles: List[Dict],
) -> List[Dict]:
    """
    Main entry point for text-based profile attribution (no image case).

    For each profile:
      1. Scrape the bio text from the profile page
      2. Use GPT-4o to decide: CONFIRMED / POSSIBLE / REJECTED
      3. Attach attribution metadata to the profile dict
      4. Remove REJECTED profiles from the returned list

    POSSIBLE and CONFIRMED profiles are kept and shown with appropriate confidence.
    """
    if not profiles:
        return profiles

    attributed = []

    async with httpx.AsyncClient(headers=HEADERS, timeout=6.0) as http_client:
        tasks = []
        for profile in profiles:
            tasks.append(_process_profile(http_client, context, candidate_name, profile))

        results = await asyncio.gather(*tasks, return_exceptions=True)

    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.warning(f"Attribution error for profile {i}: {result}")
            profiles[i]["text_attribution"] = "POSSIBLE"
            profiles[i]["attribution_score"] = 0.5
            attributed.append(profiles[i])
        elif result is not None:
            attributed.append(result)

    return attributed


async def _process_profile(
    http_client: httpx.AsyncClient,
    context: str,
    candidate_name: str,
    profile: Dict,
) -> Optional[Dict]:
    """Process a single profile — returns None if REJECTED."""
    url = profile.get("url", "")
    platform = profile.get("platform", "unknown")

    # Fetch bio
    bio = await _extract_bio_from_page(http_client, url)
    logger.info(f"[text_attr] {platform}: bio_len={len(bio)}")

    # LLM attribution
    attr = await _llm_attribute(context, candidate_name, platform, bio)

    decision = attr["decision"]
    score = attr["score"]
    reason = attr["reason"]

    logger.info(f"[text_attr] {platform}: {decision} (score={score:.2f}) — {reason}")

    if decision == "REJECTED":
        return None  # Drop this profile

    profile["text_attribution"] = decision
    profile["attribution_score"] = score
    profile["attribution_reason"] = reason
    # Blend attribution score into confidence
    profile["confidence"] = round(
        (profile.get("confidence", 0.7) * 0.5) + (score * 0.5), 3
    )
    return profile
