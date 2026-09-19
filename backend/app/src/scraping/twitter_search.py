import asyncio
from duckduckgo_search import DDGS

async def search_twitter_profile(name: str) -> dict:
    """
    Use OSINT Dorking to find Twitter profiles instead of aggressive scraping,
    as X/Twitter blocks unauthorized access.
    """
    query = f"site:twitter.com {name}"
    
    try:
        def do_search():
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=1))
                return results
                
        results = await asyncio.to_thread(do_search)
        
        if results:
            first_result = results[0]
            # Try to extract handle from URL
            url = first_result.get("href", "")
            handle = url.split("twitter.com/")[-1].split("/")[0] if "twitter.com/" in url else name
            
            return {
                "handle": handle,
                "url": url,
                "bio_snippet": first_result.get("body")
            }
        return {}
    except Exception as e:
        return {}
