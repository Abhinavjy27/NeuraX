import asyncio
import logging
import urllib.parse
import httpx

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
        async with httpx.AsyncClient(timeout=90.0) as client:
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

async def search_news_and_web(query: str) -> dict:
    """
    Searches DuckDuckGo via ScraperAPI for News and Web results.
    """
    try:
        results = {"news": [], "web": []}
        # Fetch up to 30 results for deep OSINT footprint analysis
        raw_results = await _ddg_html_search(query, max_results=30)
        
        seen_socials = set()
        seen_urls = set()
        
        for i, res in enumerate(raw_results):
            url = res['url'].lower()
            
            # Global deduplication
            if url in seen_urls:
                continue
            seen_urls.add(url)
            
            # Allow all social profiles to pass through, but deduplicate by platform
            # and filter out non-profile links (like posts or directories)
            is_social = False
            for platform in ["twitter.com", "instagram.com", "github.com", "linkedin.com", "tiktok.com", "youtube.com", "reddit.com", "facebook.com"]:
                if platform in url:
                    is_social = True
                    # If it's linkedin, only allow actual profiles
                    if platform == "linkedin.com" and not ("/in/" in url or "/company/" in url):
                        break # Skip this URL entirely
                        
                    if platform not in seen_socials:
                        seen_socials.add(platform)
                        results["web"].append(res)
                    break
                    
            if is_social:
                continue
                
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

async def search_wikipedia(query: str) -> dict:
    """
    Searches Wikipedia using the official REST API for a high-quality summary.
    """
    # Format query for Wikipedia (e.g. "Linus Torvalds" -> "Linus_Torvalds")
    formatted_query = query.strip().replace(" ", "_")
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{formatted_query}"
    
    headers = {
        "User-Agent": "NeuraX_OSINT_Bot/1.0"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "title": data.get("title"),
                    "url": data.get("content_urls", {}).get("desktop", {}).get("page"),
                    "summary": data.get("extract")
                }
            return {}
    except Exception as e:
        logger.error(f"Wikipedia API failed for {query}: {e}")
        return {}
