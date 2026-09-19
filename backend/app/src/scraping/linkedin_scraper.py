import asyncio
from duckduckgo_search import DDGS

async def search_linkedin_profile(name: str) -> dict:
    """
    Since LinkedIn aggressively blocks scraping, we use OSINT (Search Engine Dorking)
    via DuckDuckGo to safely find the profile without triggering LinkedIn's rate limits.
    """
    query = f"site:linkedin.com/in/ {name}"
    
    try:
        # Run synchronous duckduckgo in thread
        def do_search():
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=1))
                return results
                
        results = await asyncio.to_thread(do_search)
        
        if results:
            first_result = results[0]
            return {
                "name": name,
                "url": first_result.get("href"),
                "snippet": first_result.get("body")
            }
        return {}
    except Exception as e:
        return {}
