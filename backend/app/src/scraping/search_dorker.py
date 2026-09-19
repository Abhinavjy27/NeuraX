import asyncio
import logging
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)

async def search_news_and_web(query: str) -> dict:
    """
    Searches DuckDuckGo for News and Web results.
    Returns a combined context payload.
    """
    try:
        def do_search():
            results = {"news": [], "web": []}
            with DDGS() as ddgs:
                # Top 3 News
                news_results = list(ddgs.news(query, max_results=3))
                if news_results:
                    for n in news_results:
                        results["news"].append({
                            "title": n.get("title"),
                            "url": n.get("url"),
                            "snippet": n.get("body"),
                            "date": n.get("date")
                        })
                
                # Top 3 Web
                web_results = list(ddgs.text(query, max_results=3))
                if web_results:
                    for w in web_results:
                        # Filter out OSINT platforms we natively scrape
                        url = w.get("href", "").lower()
                        if not any(x in url for x in ["twitter.com", "instagram.com", "github.com", "linkedin.com", "tiktok.com", "youtube.com"]):
                            results["web"].append({
                                "title": w.get("title"),
                                "url": w.get("href"),
                                "snippet": w.get("body")
                            })
            return results
            
        data = await asyncio.to_thread(do_search)
        return data
    except Exception as e:
        logger.error(f"Failed to fetch News/Web data for {query}: {e}")
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
