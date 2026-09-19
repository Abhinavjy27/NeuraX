import asyncio
from app.src.scraping.search_dorker import _ddg_html_search

async def search_linkedin_profile(name: str) -> dict:
    """
    Search for a LinkedIn profile using OSINT scraping.
    """
    query = f'site:linkedin.com "{name}"'
    
    try:
        results = await _ddg_html_search(query, max_results=5)
        
        for result in results:
            if "linkedin.com/in/" in result['url'].lower():
                return {
                    "name": name,
                    "url": result['url'],
                    "snippet": result['snippet'],
                    "pre_verified": True
                }
        return {}
    except Exception as e:
        return {}
