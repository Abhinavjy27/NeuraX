import httpx
import asyncio
import logging
from typing import Dict

logger = logging.getLogger(__name__)

PLATFORMS = {
    "Instagram": "https://www.instagram.com/{username}/",
    "Twitter/X": "https://twitter.com/{username}",
    "YouTube": "https://www.youtube.com/@{username}",
    "TikTok": "https://www.tiktok.com/@{username}",
    "Reddit": "https://www.reddit.com/user/{username}",
    "Medium": "https://medium.com/@{username}"
}

# Rotating User-Agents to mimic real browsers and prevent immediate 403 blocks
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0"
]

async def check_platform(client: httpx.AsyncClient, platform: str, url: str) -> bool:
    """
    Performs a simple GET request to see if the user's profile page exists (Status 200).
    """
    try:
        response = await client.get(url, follow_redirects=True)
        # If the page loads successfully without a 404, we assume the username is taken/active
        if response.status_code == 200:
            # Some sites return 200 but say "page not found" in text, we do a basic check
            text = response.text.lower()
            if "page not found" not in text and "this account doesn" not in text:
                return True
        return False
    except httpx.RequestError:
        return False

async def check_all_platforms(username: str) -> Dict[str, str]:
    """
    Checks the username across all defined platforms concurrently using rotating User-Agents.
    Returns a dictionary of platform -> URL if found.
    """
    results = {}
    
    import random
    headers = {"User-Agent": random.choice(USER_AGENTS)}

    async with httpx.AsyncClient(headers=headers, timeout=5.0) as client:
        tasks = []
        platform_names = []
        
        for name, url_template in PLATFORMS.items():
            url = url_template.format(username=username)
            platform_names.append(name)
            tasks.append(check_platform(client, name, url))
            
        checks = await asyncio.gather(*tasks)
        
        for platform_name, is_found in zip(platform_names, checks):
            if is_found:
                results[platform_name] = PLATFORMS[platform_name].format(username=username)
                
    return results
