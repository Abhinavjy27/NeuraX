import asyncio
import logging
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)

async def search_google_scholar(name: str) -> dict:
    """
    Since Google Scholar aggressively blocks scrapers (and often returns empty pages),
    we use DuckDuckGo to search Semantic Scholar which provides rich public profiles
    containing h-index, citations, and papers.
    """
    query = f"site:semanticscholar.org author {name}"
    
    try:
        def do_search():
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=2))
                return results
                
        results = await asyncio.to_thread(do_search)
        
        if results:
            first_result = results[0]
            # Semantic Scholar snippets usually look like: "Semantic Scholar profile for Linus Torvalds, with 49 highly influential citations and 12 scientific research papers."
            return {
                "name": name,
                "url": first_result.get("href"),
                "snippet": first_result.get("body")
            }
        return {}
    except Exception as e:
        logger.warning(f"Scholar search failed for {name}: {e}")
        return {}
