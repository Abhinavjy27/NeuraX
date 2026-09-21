import asyncio
import logging
import urllib.parse
import httpx
from typing import Optional, List

import os

logger = logging.getLogger(__name__)

SCRAPER_API_KEY = os.getenv("SCRAPER_API_KEY")

from bs4 import BeautifulSoup

async def _ddg_html_search(query: str, max_results: int = 15) -> list:
    """OSINT search via ScraperAPI targeting DuckDuckGo HTML to get true clean URLs and bypass Datacenter IP blocks."""
    # Use duckduckgo html endpoint which doesn't dynamically mask URLs
    target_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
    url = f"http://api.scraperapi.com/?api_key={SCRAPER_API_KEY}&url={urllib.parse.quote(target_url)}&premium=true&country_code=us"
    
    results = []
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "lxml")
                
                for div in soup.find_all("div", class_="result__body"):
                    if len(results) >= max_results:
                        break
                        
                    title_elem = div.find("h2", class_="result__title")
                    a_tag = div.find("a", class_="result__url")
                    snippet_elem = div.find("a", class_="result__snippet")
                    
                    if not title_elem or not a_tag or not snippet_elem:
                        continue
                        
                    title = title_elem.text.strip()
                    raw_url = a_tag.get("href", "")
                    snippet = snippet_elem.text.strip()
                    
                    if "uddg=" in raw_url:
                        try:
                            raw_url = urllib.parse.unquote(raw_url.split("uddg=")[1].split("&")[0])
                        except Exception:
                            pass

                    results.append({
                        'url': raw_url,
                        'title': title,
                        'snippet': snippet
                    })
            else:
                logger.error(f"ScraperAPI (DDG) returned {response.status_code}: {response.text}")
                
        return results
    except Exception as e:
        logger.error(f"ScraperAPI OSINT search failed for {query}: {repr(e)}")
        return results

async def _google_structured_search(query: str) -> list:
    """True Google Search results via ScraperAPI structured endpoint."""
    if not SCRAPER_API_KEY:
        return []
    url = f"https://api.scraperapi.com/structured/google/search?api_key={SCRAPER_API_KEY}&query={urllib.parse.quote(query)}"
    
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                resp = await client.get(url)
                if resp.status_code == 429:
                    logger.warning(f"ScraperAPI structured Google returned 429 for {query}. Waiting 2s and retrying...")
                    await asyncio.sleep(2.0)
                    resp = await client.get(url)
                    
                if resp.status_code != 200:
                    logger.warning(f"ScraperAPI structured Google returned {resp.status_code}")
                    return []
                data = resp.json()
                raw_items = data.get("organic_results", [])

                async def resolve_link(item):
                    link = item.get("link", "")
                    if "google.com/goto" in link:
                        try:
                            r = await client.get(link, follow_redirects=False, timeout=4.0)
                            if "location" in r.headers:
                                link = r.headers["location"]
                        except Exception:
                            pass
                    return {
                        "title": item.get("title", ""),
                        "url": link,
                        "snippet": item.get("snippet", "")
                    }

                resolved = await asyncio.gather(*[resolve_link(item) for item in raw_items], return_exceptions=True)
                return [r for r in resolved if isinstance(r, dict) and r.get("url")]
        except Exception as e:
            if attempt == 0:
                logger.warning(f"Structured Google search attempt 1 failed for {query}: {repr(e)}. Retrying...")
                await asyncio.sleep(1.0)
                continue
            logger.warning(f"Structured Google search error for {query}: {repr(e)}")
            return []
    return []

async def search_news_and_web(query: str, context_query: Optional[str] = None, aliases: Optional[List[str]] = None) -> dict:
    """
    Searches Google Search via ScraperAPI for News, Academic and Web results,
    falling back to DuckDuckGo HTML search.
    If context_query or aliases are provided, searches them sequentially.
    """
    try:
        results = {"news": [], "web": []}
        
        from app.src.identity.profile_attributor import matches_candidate_identity

        base_q = f'"{query.strip()}"' if " " in query.strip() and not query.strip().startswith('"') else query.strip()
        raw_q = query.strip().replace('"', '')

        queries = [raw_q]
        if base_q.lower() != raw_q.lower():
            queries.append(base_q)
        if aliases:
            for a in aliases:
                a_clean = a.strip().replace('"', '')
                if a_clean and a_clean.lower() not in [q.lower() for q in queries]:
                    queries.append(a_clean)
        if context_query:
            c_clean = context_query.strip()
            # If context_query has extra terms beyond the base query, include it first
            if c_clean.replace('"', '').lower() != raw_q.lower():
                queries.insert(0, c_clean)
        
        raw_results = []
        for q in queries[:4]:
            res = await _google_structured_search(q)
            if res:
                raw_results.extend(res)
                if len(raw_results) >= 8:
                    break
        
        # Only fallback to DDG if Google returned nothing at all
        if not raw_results:
            ddg_res = await _ddg_html_search(queries[0], max_results=20)
            raw_results.extend(ddg_res)
        
        seen_socials = set()
        seen_urls = set()
        seen_domains = set()
        
        for i, res in enumerate(raw_results):
            url = res['url'].lower()
            title = res.get('title', '')
            snippet = res.get('snippet', '')

            # Global deduplication
            if url in seen_urls:
                continue
            seen_urls.add(url)

            # Strict candidate identity pre-filter:
            # Drop results that do not match exact candidate name or specified aliases
            if not matches_candidate_identity(query, f"{url} {title} {snippet}", aliases=aliases):
                continue
            
            # Allow all social profiles to pass through, but deduplicate by platform
            # and filter out non-profile links (like posts or directories)
            is_social = False
            for platform in ["twitter.com", "instagram.com", "github.com", "linkedin.com", "tiktok.com", "youtube.com", "reddit.com", "facebook.com", "scholar.google.com", "academia.edu", "researchgate.net"]:
                if platform in url:
                    is_social = True
                    # If it's linkedin, only allow actual profiles
                    if platform == "linkedin.com" and not ("/in/" in url or "/company/" in url):
                        break # Skip this URL entirely
                        
                    # Ignore random non-profile post links for Instagram if not a user profile
                    if platform == "instagram.com" and ("/p/" in url or "/reel/" in url) and not res.get("snippet"):
                        break
                        
                    if platform not in seen_socials:
                        seen_socials.add(platform)
                        results["web"].append(res)
                    break
                    
            if is_social:
                continue
                
            # Domain deduplication for generic non-social websites
            try:
                domain = urllib.parse.urlparse(url).netloc
                if domain.startswith("www."):
                    domain = domain[4:]
            except Exception:
                domain = url
                
            if domain and domain in seen_domains:
                continue
            seen_domains.add(domain)
                
            # Heuristic for news vs web
            if "news" in url or "article" in url or "post" in url:
                results["news"].append(res)
            else:
                results["web"].append(res)
                
        if not results["news"] and not results["web"]:
            raise Exception("Empty results")
        return results
    except Exception as e:
        logger.error(f"Failed to fetch News/Web data for {query}: {e}. Returning empty results.")
        return {"news": [], "web": []}

import httpx
import urllib.parse
import json
import re

async def _extract_wiki_summary_and_facts(title: str, description: str, extract: str, lead_text: str) -> tuple[str, list[str]]:
    """
    Extracts a concise 2-3 line summary and 4-7 crisp factual bullet points
    from Wikipedia content using GPT-4o, with a robust rule-based fallback.
    """
    # 1. Try GPT-4o extraction
    try:
        from app.src.identity.nlp_extractor import _get_openai_client
        client = _get_openai_client()
        if client:
            system_prompt = (
                "You are an elite OSINT intelligence analyst. "
                "Given verified Wikipedia data for a queried individual, return a JSON object with two fields:\n"
                "1. 'summary': A factual, high-impact 2-3 line biographical summary overviewing who they are and their primary significance.\n"
                "2. 'facts': A JSON array of 4-7 concise, high-signal bullet points (each 1 sentence) covering: key creations/inventions, notable positions/roles, awards/honors, birth/nationality, and major milestones."
            )
            user_prompt = (
                f"Subject: {title}\n"
                f"Short Tag: {description}\n"
                f"Wikipedia Extract: {extract}\n"
                f"Lead Text: {lead_text[:1200] if lead_text else ''}"
            )
            resp = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                timeout=8.0
            )
            content = resp.choices[0].message.content
            if content:
                parsed = json.loads(content)
                summary_val = parsed.get("summary")
                facts_val = parsed.get("facts")
                if summary_val and isinstance(facts_val, list) and len(facts_val) > 0:
                    clean_facts = [str(f).strip().lstrip("•-* ") for f in facts_val if str(f).strip()]
                    return summary_val.strip(), clean_facts[:7]
    except Exception as e:
        logger.warning(f"GPT-4o Wikipedia fact synthesis failed ({e}). Using rule-based extraction.")

    # 2. Rule-based fallback
    summary = extract or lead_text or (f"{title} — {description}" if description else f"{title} (Wikipedia entry)")
    facts: list[str] = []
    
    if description:
        facts.append(description.capitalize())

    # Split lead_text or extract into sentences
    source_text = lead_text if lead_text and len(lead_text) > len(extract or "") else (extract or "")
    sentences = re.split(r'(?<=[.!?])\s+', source_text)
    for s in sentences:
        s_clean = s.strip()
        # Filter out very short or boilerplate fragments
        if len(s_clean) > 25 and not any(s_clean in existing for existing in facts):
            facts.append(s_clean)
        if len(facts) >= 6:
            break

    if not facts and summary:
        facts.append(summary)

    return summary, facts


async def search_wikipedia(query: str) -> dict:
    """
    Searches Wikipedia using the official REST API and Action API.
    Returns:
      - title: Canonical Wikipedia title
      - url: Direct Wikipedia desktop link
      - description: Short descriptive tag
      - summary: Clean 2-3 line biographical overview
      - facts: 4-7 crisp bullet-point facts
      - image_url: High-res portrait/thumbnail if available
    """
    clean_query = query.strip()
    if not clean_query:
        return {}

    formatted_query = clean_query.replace(" ", "_")
    summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(formatted_query)}"
    
    headers = {
        "User-Agent": "NeuraX_OSINT_Bot/1.0 (contact@neurax.com)"
    }
    
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(summary_url, headers=headers)
            data = None
            
            if resp.status_code == 200:
                data = resp.json()
            elif resp.status_code == 404:
                # Fallback: search Wikipedia Action API to find the canonical page title
                search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(clean_query)}&utf8=&format=json"
                sr_resp = await client.get(search_url, headers=headers)
                if sr_resp.status_code == 200:
                    sr_data = sr_resp.json()
                    search_results = sr_data.get("query", {}).get("search", [])
                    if search_results:
                        top_title = search_results[0].get("title")
                        if top_title:
                            top_formatted = top_title.replace(" ", "_")
                            top_summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(top_formatted)}"
                            top_resp = await client.get(top_summary_url, headers=headers)
                            if top_resp.status_code == 200:
                                data = top_resp.json()

            if not data or not data.get("title"):
                return {}

            title = data.get("title")
            description = data.get("description", "")
            extract = data.get("extract", "")
            page_url = data.get("content_urls", {}).get("desktop", {}).get("page")
            img = data.get("originalimage", {}).get("source") or data.get("thumbnail", {}).get("source")

            # Fetch full intro extract from Action API to get deeper context for facts
            lead_text = ""
            try:
                intro_url = f"https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles={urllib.parse.quote(title)}&redirects=1&format=json"
                intro_resp = await client.get(intro_url, headers=headers)
                if intro_resp.status_code == 200:
                    pages = intro_resp.json().get("query", {}).get("pages", {})
                    for _, pdata in pages.items():
                        lead_text = pdata.get("extract", "")
                        break
            except Exception as e:
                logger.debug(f"Could not fetch full intro extract for {title}: {e}")

            # Synthesize 2-3 line summary and 4-7 bullet-point facts
            summary, facts = await _extract_wiki_summary_and_facts(
                title=title,
                description=description,
                extract=extract,
                lead_text=lead_text
            )

            return {
                "title": title,
                "url": page_url,
                "description": description,
                "summary": summary,
                "facts": facts,
                "image_url": img
            }

    except Exception as e:
        logger.error(f"Wikipedia API failed for {query}: {e}")
        return {}
