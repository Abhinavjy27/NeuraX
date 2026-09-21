import asyncio
import re
import html
import httpx
from typing import Optional
from app.src.scraping.search_dorker import _google_structured_search, _ddg_html_search

FB_BOT_HEADERS = {
    "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
}

async def _extract_linkedin_photo(url: str) -> Optional[str]:
    """Extract profile photo from LinkedIn public page using crawler UA."""
    try:
        async with httpx.AsyncClient(headers=FB_BOT_HEADERS, timeout=5.0, follow_redirects=True) as client:
            r = await client.get(url)
            if r.status_code == 200:
                match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)', r.text)
                if match:
                    img = html.unescape(match.group(1))
                    if "ghost" not in img.lower() and "static.licdn" not in img.lower():
                        return img
    except Exception:
        pass
    return None

async def search_linkedin_profile(name: str, context_keyword: Optional[str] = None) -> dict:
    """
    Search for a LinkedIn profile using Google Search via ScraperAPI with fallback to DDG.
    """
    query = f'site:linkedin.com/in "{name}" {context_keyword}' if context_keyword else f'site:linkedin.com/in "{name}"'
    
    try:
        # 1. Try high-accuracy structured Google search first
        results = await _google_structured_search(query)
        for result in results:
            url = result.get('url', '').lower()
            if "linkedin.com/in/" in url:
                photo_url = await _extract_linkedin_photo(result['url'])
                return {
                    "name": name,
                    "url": result['url'],
                    "title": result.get('title', f"LinkedIn: {name}"),
                    "snippet": result.get('snippet', ''),
                    "photo_url": photo_url,
                }
                
        # Fallback to name-only query if context keyword didn't match a direct /in/ link
        if context_keyword:
            results = await _google_structured_search(f'site:linkedin.com/in "{name}"')
            for result in results:
                url = result.get('url', '').lower()
                if "linkedin.com/in/" in url:
                    photo_url = await _extract_linkedin_photo(result['url'])
                    return {
                        "name": name,
                        "url": result['url'],
                        "title": result.get('title', f"LinkedIn: {name}"),
                        "snippet": result.get('snippet', ''),
                        "photo_url": photo_url,
                    }

        # 2. Fallback to DDG HTML search if Google returns empty
        ddg_results = await _ddg_html_search(f'site:linkedin.com "{name}"', max_results=5)
        for result in ddg_results:
            if "linkedin.com/in/" in result.get('url', '').lower():
                photo_url = await _extract_linkedin_photo(result['url'])
                return {
                    "name": name,
                    "url": result['url'],
                    "title": result.get('title', f"LinkedIn: {name}"),
                    "snippet": result.get('snippet', ''),
                    "photo_url": photo_url,
                }
        return {}
    except Exception as e:
        return {}

