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
import json
from typing import Dict, List, Optional
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY") or "mock-key")

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

        raw_bio = " | ".join(s.strip() for s in snippets if s.strip())[:800]
        # Ignore generic bot walls or short titles
        generic_markers = {"instagram", "google scholar", "citations", "twitter", "x", "facebook", "access denied", "403 forbidden", "security check", "loading..."}
        if raw_bio.lower().strip() in generic_markers or len(raw_bio.strip()) < 12:
            return ""
        return raw_bio

    except Exception as e:
        logger.debug(f"Bio extraction failed for {url}: {e}")
        return ""


def _matches_single_entity(name: str, text_clean: str) -> bool:
    """Matches a single candidate name or alias as an exact unified entity."""
    if not name or not text_clean:
        return False
    clean_name = re.sub(r'^(?:mr|mrs|ms|dr|prof)\.?\s+', '', name.strip(), flags=re.IGNORECASE).strip().lower()
    if not clean_name:
        return False

    # 1. Exact entity phrase match (e.g. "murari dundra")
    if clean_name in text_clean:
        return True

    parts = [p for p in re.findall(r'[a-zA-Z0-9]+', clean_name) if p]
    if len(parts) == 1:
        return parts[0] in text_clean

    # 2. Unified entity variations (treating the entire name as one single entity)
    forward_joined = "".join(parts)
    forward_hyphen = "-".join(parts)
    forward_underscore = "_".join(parts)
    forward_dot = ".".join(parts)

    inverted_phrase = " ".join(reversed(parts))
    inverted_joined = "".join(reversed(parts))
    inverted_hyphen = "-".join(reversed(parts))
    inverted_underscore = "_".join(reversed(parts))
    inverted_dot = ".".join(reversed(parts))

    unified_entity_forms = (
        forward_joined,
        forward_hyphen,
        forward_underscore,
        forward_dot,
        inverted_phrase,
        inverted_joined,
        inverted_hyphen,
        inverted_underscore,
        inverted_dot,
    )

    return any(form in text_clean for form in unified_entity_forms)


def matches_candidate_identity(candidate_name: str, text: str, aliases: Optional[List[str]] = None) -> bool:
    """
    Checks if a URL, handle, or text contains the candidate's exact name as a single unified entity,
    unless specific aliases are explicitly provided.
    Does NOT use fuzzy or loose transliteration matching.
    """
    if not text or not candidate_name:
        return False
    text_clean = text.lower()
    if _matches_single_entity(candidate_name, text_clean):
        return True

    if aliases:
        for alias in aliases:
            if alias and _matches_single_entity(alias, text_clean):
                return True

    return False


async def _llm_attribute(context: str, candidate_name: str, profile_platform: str, profile_bio: str, url: str = "", aliases: Optional[List[str]] = None) -> Dict:
    """
    Ask GPT-4o whether the profile bio/snippet matches the target person's context.
    Returns {decision: CONFIRMED|POSSIBLE|REJECTED, score: float, reason: str}
    """
    if not client.api_key or not profile_bio.strip():
        if matches_candidate_identity(candidate_name, f"{url} {profile_platform}", aliases=aliases):
            return {"decision": "POSSIBLE", "score": 0.6, "reason": "Discovered candidate digital footprint matching name/handle."}
        return {"decision": "REJECTED", "score": 0.1, "reason": "No bio text available and URL does not match candidate identity."}

    aliases_str = ", ".join(aliases) if aliases else "None specified"
    prompt = f"""You are an OSINT digital identity intelligence analyst.
Analyze whether the discovered web link / social profile / article belongs to or is an attributed digital footprint of the target person.

TARGET PERSON CONTEXT:
Name: {candidate_name}
Known Context: {context}
Specified Aliases: {aliases_str}

DISCOVERED PROFILE / ARTICLE / FOOTPRINT:
Platform / Source Type: {profile_platform}
URL: {url}
Snippet / Bio / Page Content: {profile_bio}

TASK: Determine if this profile, article, publication, or web link belongs to or is an attributed digital footprint of the target person.

DECISION GUIDELINES:
- Exact Name Match: The profile/article MUST match the target's exact name (or an explicitly specified alias). Do not assume name variations or typos match unless specified in aliases.
- CONFIRMED (score 0.8-1.0): Strong direct corroboration (name + matching role, company, or location).
- POSSIBLE (score 0.4-0.79): Plausible match, personal social account, candidate paper, or public mention:
  * Personal social platforms (Instagram, Facebook, TikTok, YouTube, Reddit, Twitter/X) where individuals rarely post employment details MUST be marked POSSIBLE if the exact name or handle matches.
  * Academic papers, Google Scholar / Semantic Scholar citations, research publications, and web articles that mention or cite the candidate's exact name MUST be marked POSSIBLE so the investigator can review the finding.
- REJECTED (score 0.0-0.39): Reject if it is entertainment media (movies, TV shows, songs, lyrics, tourism/travel guides), a completely different person, an unrelated business/store, directory spam, or has zero connection to the target person.

Respond strictly with valid JSON:
{{
  "decision": "CONFIRMED" | "POSSIBLE" | "REJECTED",
  "score": <float between 0.0 and 1.0>,
  "reason": "<brief 1-sentence rationale>"
}}"""

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
    aliases: Optional[List[str]] = None,
) -> List[Dict]:
    """
    Main entry point for text-based profile attribution (no image case).

    For each profile:
      1. Scrape the bio text from the profile page
      2. Use GPT-4o to decide: CONFIRMED / POSSIBLE / REJECTED
      3. Attach attribution metadata to the profile dict
      4. Remove REJECTED profiles from the returned list (unless name matches)

    POSSIBLE and CONFIRMED profiles are kept and shown with appropriate confidence.
    """
    if not profiles:
        return profiles

    attributed = []

    async with httpx.AsyncClient(headers=HEADERS, timeout=6.0) as http_client:
        tasks = []
        for profile in profiles:
            tasks.append(_process_profile(http_client, context, candidate_name, profile, aliases=aliases))

        results = await asyncio.gather(*tasks, return_exceptions=True)

    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.warning(f"Attribution error for profile {i}: {result}")
            profiles[i]["text_attribution"] = "POSSIBLE"
            profiles[i]["attribution_score"] = 0.5
            attributed.append(profiles[i])
        elif result is not None:
            attributed.append(result)

    # ── Select Single LinkedIn Profile Matching Context ──
    # If multiple LinkedIn profiles exist, select the ONE that matches the context,
    # as a real person cannot have multiple distinct conflicting LinkedIn profiles.
    attributed = await disambiguate_linkedin_profiles(context, candidate_name, attributed)

    # ── Priority Ordering: LinkedIn first, Socials next, Scholar next, Articles next ──
    attributed = sort_profiles_by_priority(attributed)

    return attributed


def get_profile_priority(profile: Dict) -> tuple:
    """
    Returns a sorting tuple (tier, sub_rank, -confidence) based on user-defined priority:
    Tier 1: LinkedIn first
    Tier 2: Socials next (GitHub, Twitter/X, Instagram, Facebook, YouTube, TikTok, Reddit, Medium, etc.)
    Tier 3: Scholar next (Google Scholar, Semantic Scholar, Academia.edu, ResearchGate, etc.)
    Tier 4: Articles next (News, Web articles, press, blog posts)
    """
    platform = (profile.get("platform") or "").lower().strip()
    url = (profile.get("url") or "").lower().strip()

    # Tier 1: LinkedIn (Highest Priority)
    if platform == "linkedin" or "linkedin.com" in url:
        return (1, 0, -float(profile.get("confidence", 0.0)))

    # Tier 2: Socials
    social_ranks = {
        "github": 10,
        "twitter": 20,
        "x": 20,
        "twitter/x": 20,
        "instagram": 30,
        "facebook": 40,
        "youtube": 50,
        "tiktok": 60,
        "reddit": 70,
        "medium": 80,
        "threads": 90,
        "pinterest": 95,
        "kaggle": 98,
        "stackoverflow": 99,
    }
    for s_plat, s_rank in social_ranks.items():
        if platform == s_plat or f"{s_plat}.com" in url or (s_plat == "youtube" and "youtu.be" in url) or (s_plat == "x" and "x.com" in url):
            return (2, s_rank, -float(profile.get("confidence", 0.0)))

    # Tier 3: Scholar & Academic
    scholar_markers = [
        "scholar", "academia", "researchgate", "arxiv", "orcid",
        "ieee", "sciencedirect", "springer", "pubmed", "semanticscholar"
    ]
    if platform in ("scholar", "academia", "researchgate") or any(m in url for m in scholar_markers):
        scholar_sub = 10 if ("scholar" in platform or "scholar" in url) else (20 if ("academia" in platform or "academia" in url) else 30)
        return (3, scholar_sub, -float(profile.get("confidence", 0.0)))

    # Tier 4: Articles (News & Web publications/articles)
    article_sub = 10 if (platform == "news" or "news" in url) else 20
    return (4, article_sub, -float(profile.get("confidence", 0.0)))


def sort_profiles_by_priority(profiles: List[Dict]) -> List[Dict]:
    """
    Sorts a list of profile dictionaries strictly following user priority:
    1. LinkedIn first
    2. Socials next
    3. Scholar next
    4. Articles next
    """
    if not profiles:
        return []
    return sorted(profiles, key=get_profile_priority)



def _normalize_li_url(url: str) -> str:
    """Normalize LinkedIn URLs to avoid duplicate tracking."""
    if not url:
        return ""
    u = url.split("?")[0].split("#")[0].rstrip("/").lower()
    u = re.sub(r"^https?://(?:[a-z]{2,3}\.)?linkedin\.com", "linkedin.com", u)
    return u


async def disambiguate_linkedin_profiles(
    context: str,
    candidate_name: str,
    profiles: List[Dict],
) -> List[Dict]:
    """
    If multiple LinkedIn profiles exist, selects ONLY the one that best matches
    the user-supplied context, and drops the conflicting / imposter profiles.
    """
    li_profiles = [p for p in profiles if p.get("platform") == "linkedin"]
    if len(li_profiles) <= 1:
        return profiles

    # 1. Deduplicate identical LinkedIn URLs first
    seen_urls = {}
    deduped_li = []
    for p in li_profiles:
        norm = _normalize_li_url(p.get("url", ""))
        if norm not in seen_urls:
            seen_urls[norm] = p
            deduped_li.append(p)
        else:
            # Merge richer info from duplicate into existing
            existing = seen_urls[norm]
            if not existing.get("snippet") and p.get("snippet"):
                existing["snippet"] = p["snippet"]
            if not existing.get("photo_url") and p.get("photo_url"):
                existing["photo_url"] = p["photo_url"]
            if p.get("attribution_score", 0) > existing.get("attribution_score", 0):
                existing["attribution_score"] = p["attribution_score"]
                existing["text_attribution"] = p.get("text_attribution", existing.get("text_attribution"))
                existing["attribution_reason"] = p.get("attribution_reason", existing.get("attribution_reason"))

    if len(deduped_li) <= 1:
        other_profiles = [p for p in profiles if p.get("platform") != "linkedin"]
        return other_profiles + deduped_li

    logger.info(f"[disambiguate] Found {len(deduped_li)} distinct LinkedIn profiles for '{candidate_name}'. Disambiguating against context: '{context}'...")

    candidates_data = []
    for idx, p in enumerate(deduped_li):
        candidates_data.append({
            "index": idx,
            "url": p.get("url", ""),
            "title": p.get("title", ""),
            "snippet": p.get("snippet", ""),
            "attribution_score": p.get("attribution_score", 0.5),
            "text_attribution": p.get("text_attribution", "POSSIBLE"),
            "attribution_reason": p.get("attribution_reason", "")
        })

    prompt = f"""You are an OSINT digital identity resolution expert.
Multiple distinct LinkedIn profiles were discovered matching the name "{candidate_name}".
A real person can only have ONE true professional LinkedIn profile. You must select the ONE LinkedIn profile that genuinely matches the target's known context, and eliminate any conflicting namesake, imposter, or unrelated profiles.

TARGET PERSON CONTEXT:
Name: {candidate_name}
Known Context: {context}

CANDIDATE LINKEDIN PROFILES:
{json.dumps(candidates_data, indent=2)}

TASK:
1. Carefully compare each profile's headline, organization, role, and location against the target's known context.
2. Select the index of the SINGLE profile that best matches the context.
3. If one profile matches the organization, company, role, or location mentioned in the context (e.g. CMR, teacher, professor, engineer, etc.), select it.
4. If none of the profiles match the context, select null.

Respond strictly with valid JSON:
{{
  "selected_index": <int 0-based index or null>,
  "confidence": <float between 0.0 and 1.0>,
  "reason": "<1-2 sentence explanation of why this profile matches the context and was chosen over the others>"
}}"""

    selected_idx = None
    selection_reason = ""
    try:
        if client.api_key:
            resp = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.0,
                max_tokens=180,
            )
            res = json.loads(resp.choices[0].message.content)
            idx_val = res.get("selected_index")
            if idx_val is not None and isinstance(idx_val, int) and 0 <= idx_val < len(deduped_li):
                selected_idx = idx_val
                selection_reason = res.get("reason", "Context-matched LinkedIn profile.")
    except Exception as e:
        logger.warning(f"[disambiguate] LLM disambiguation call failed: {e}")

    # Fallback heuristic: score based on context keyword overlap + attribution score
    if selected_idx is None:
        context_words = set(re.findall(r'\w+', context.lower())) - {
            "the", "a", "an", "is", "at", "in", "of", "and", "or", "for", "to", "with", "from", "on"
        }
        best_score = -1.0
        for idx, p in enumerate(deduped_li):
            p_text = f"{p.get('title', '')} {p.get('snippet', '')} {p.get('url', '')}".lower()
            keyword_matches = sum(1 for w in context_words if len(w) > 2 and w in p_text)
            attr_score = p.get("attribution_score", 0.5)
            score = (keyword_matches * 2.0) + attr_score
            if score > best_score:
                best_score = score
                selected_idx = idx
                selection_reason = f"Selected based on context keywords match ({keyword_matches} matches)."

    selected_profile = deduped_li[selected_idx] if selected_idx is not None else None

    if selected_profile:
        selected_profile["text_attribution"] = "CONFIRMED"
        selected_profile["confidence"] = max(selected_profile.get("confidence", 0.7), 0.85)
        if selection_reason:
            selected_profile["attribution_reason"] = selection_reason
        logger.info(f"[disambiguate] ✅ Selected LinkedIn profile {selected_profile.get('url')} (dropped {len(deduped_li) - 1} conflicting profile(s)): {selection_reason}")

    other_profiles = [p for p in profiles if p.get("platform") != "linkedin"]
    if selected_profile:
        return other_profiles + [selected_profile]
    return other_profiles


async def _process_profile(
    http_client: httpx.AsyncClient,
    context: str,
    candidate_name: str,
    profile: Dict,
    aliases: Optional[List[str]] = None,
) -> Optional[Dict]:
    """Process a single profile — retains confirmed, possible, and candidate footprints."""
    
    # ── Bypass for official/hardcoded profiles (never bypass LinkedIn) ──
    if profile.get("pre_verified") and profile.get("platform") != "linkedin":
        profile["text_attribution"] = "CONFIRMED"
        profile["attribution_score"] = 0.95
        profile["attribution_reason"] = "Officially verified via Wikidata or trusted source."
        return profile
        
    url = profile.get("url", "")
    platform = profile.get("platform", "unknown")

    # Combine search title, snippet, and page bio
    search_info = f"{profile.get('title', '')} - {profile.get('snippet', '')}".strip(" -")
    page_bio = await _extract_bio_from_page(http_client, url)
    
    bio_parts = [p for p in [search_info, page_bio] if p]
    bio = " | ".join(bio_parts)[:1000]
        
    logger.info(f"[text_attr] {platform}: bio_len={len(bio)}")

    # LLM attribution
    attr = await _llm_attribute(context, candidate_name, platform, bio, url=url, aliases=aliases)

    decision = attr["decision"]
    score = attr["score"]
    reason = attr["reason"]

    # If the LLM evaluated the bio and rejected the link, DO NOT override it for web, news, or scholar!
    # For personal social accounts only: if bio was absent/minimal but handle explicitly matches candidate identity, retain as POSSIBLE
    if decision == "REJECTED":
        is_social = platform in ("instagram", "facebook", "tiktok", "youtube", "twitter", "reddit")
        name_matched = matches_candidate_identity(candidate_name, f"{url} {profile.get('title', '')}", aliases=aliases)
        if is_social and name_matched and len(bio.strip()) < 50:
            decision = "POSSIBLE"
            score = 0.6
            reason = f"Personal social account matching target name/handle ({platform})."
        else:
            logger.info(f"[text_attr] Dropping rejected profile: {platform} - {url} ({reason})")
            return None  # Drop truly unrelated noise, movies, songs, tourism, directory spam

    profile["text_attribution"] = decision
    profile["attribution_score"] = score
    profile["attribution_reason"] = reason
    # Blend attribution score into confidence
    profile["confidence"] = round(
        (profile.get("confidence", 0.7) * 0.5) + (score * 0.5), 3
    )
    return profile
