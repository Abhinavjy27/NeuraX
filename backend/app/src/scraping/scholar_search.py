import asyncio
import logging
import os
import urllib.parse
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

from typing import Optional, List

SCRAPER_API_KEY = os.getenv("SCRAPER_API_KEY")

async def search_google_scholar(name: str, organization: Optional[str] = None, aliases: Optional[List[str]] = None) -> dict:
    """
    Searches Semantic Scholar API and Google Scholar for author publications,
    citations, and papers without hitting bot blocks.
    """
    # 1. First try Semantic Scholar public API (fast, reliable, structured)
    try:
        url = f"https://api.semanticscholar.org/graph/v1/author/search?query={urllib.parse.quote(name)}&fields=name,url,citationCount,hIndex,paperCount,papers.title,papers.year"
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                authors = data.get("data", [])
                from app.src.identity.profile_attributor import matches_candidate_identity
                matching_author = next((a for a in authors if matches_candidate_identity(name, a.get("name", ""), aliases=aliases)), None)
                if matching_author:
                    top_author = matching_author
                    papers = top_author.get("papers", [])
                    extracted_papers = []
                    for p in papers[:10]:
                        if p.get("title"):
                            extracted_papers.append({
                                "title": p.get("title"),
                                "year": p.get("year"),
                                "url": f"https://www.semanticscholar.org/paper/{p.get('paperId')}" if p.get("paperId") else None
                            })
                    paper_titles = [p["title"] for p in extracted_papers[:5]]
                    snippet = f"Semantic Scholar: {top_author.get('name')} · {top_author.get('paperCount', 0)} papers · {top_author.get('citationCount', 0)} citations."
                    if paper_titles:
                        snippet += f" Top publication: {paper_titles[0]}"
                    return {
                        "name": top_author.get("name", name),
                        "url": top_author.get("url") or f"https://www.semanticscholar.org/author/{top_author.get('authorId')}",
                        "title": f"Scholar: {top_author.get('name')}",
                        "snippet": snippet,
                        "paper_titles": paper_titles,
                        "papers": extracted_papers
                    }
    except Exception as e:
        logger.warning(f"Semantic Scholar search failed for {name}: {e}")

    # 2. Fallback to Google Scholar via ScraperAPI if key available
    if SCRAPER_API_KEY:
        try:
            scholar_q = f'"{name}" {organization}' if organization else f'"{name}"'
            target = f"https://scholar.google.com/scholar?q={urllib.parse.quote(scholar_q)}"
            proxy_url = f"http://api.scraperapi.com/?api_key={SCRAPER_API_KEY}&url={urllib.parse.quote(target)}&country_code=us"
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.get(proxy_url)
                if r.status_code == 200:
                    soup = BeautifulSoup(r.text, "lxml")
                    papers = []
                    for h in soup.find_all("h3", class_="gs_rt")[:3]:
                        clean_text = h.text.replace("[PDF]", "").strip()
                        if clean_text:
                            papers.append(clean_text)
                    if papers:
                        return {
                            "name": name,
                            "url": target,
                            "title": f"Google Scholar: {papers[0][:60]}",
                            "snippet": f"Publications found on Google Scholar: {'; '.join(papers[:2])}",
                            "paper_titles": papers
                        }
        except Exception as e:
            logger.warning(f"Google Scholar ScraperAPI search failed for {name}: {e}")

    return {}

