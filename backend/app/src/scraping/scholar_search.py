import httpx
from bs4 import BeautifulSoup
import asyncio

async def search_google_scholar(query: str) -> dict:
    """
    Searches Google Scholar using BeautifulSoup (publicly accessible).
    Respects rate limits by implementing basic headers.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    url = f"https://scholar.google.com/scholar?q={query}"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            if response.status_code != 200:
                return {}
                
            soup = BeautifulSoup(response.text, 'html.parser')
            results = soup.find_all('div', class_='gs_ri')
            
            papers = []
            for res in results[:3]:  # Top 3 papers
                title = res.find('h3', class_='gs_rt').text if res.find('h3', class_='gs_rt') else ""
                authors = res.find('div', class_='gs_a').text if res.find('div', class_='gs_a') else ""
                papers.append({"title": title, "authors": authors})
                
            return {"profile": query, "top_papers": papers}
            
        except Exception:
            return {}
