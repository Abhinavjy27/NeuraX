import httpx
import asyncio
import logging
from typing import Dict

logger = logging.getLogger(__name__)

# Rotating User-Agents
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/113.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0"
]

async def _check_reddit(client: httpx.AsyncClient, username: str) -> bool:
    """Reddit has a real JSON API — use it."""
    try:
        r = await client.get(
            f"https://www.reddit.com/user/{username}/about.json",
            headers={"User-Agent": "NeuraX-OSINT/1.0"},
            follow_redirects=True,
            timeout=3.0,
        )
        if r.status_code == 200:
            data = r.json()
            return data.get("kind") == "t2"  # t2 = account object
        return False
    except Exception:
        return False

async def _check_medium(client: httpx.AsyncClient, username: str) -> bool:
    """Medium returns 404 for non-existent users."""
    try:
        r = await client.get(
            f"https://medium.com/@{username}",
            follow_redirects=True,
            timeout=3.0,
        )
        if r.status_code == 200:
            text = r.text.lower()
            # Medium's 404 page contains "page not found"
            return "page not found" not in text and username.lower() in text
        return False
    except Exception:
        return False

async def check_all_platforms(username: str) -> Dict[str, str]:
    """
    Username-guessing disabled: all platforms (Twitter, YouTube, Reddit, TikTok,
    Instagram) require JS rendering or authenticated sessions, making any naive
    HTTP GET unreliable (all return 200 regardless of whether the user exists).

    Social profiles are instead extracted from real OSINT search results
    (DuckDuckGo / Wikipedia) by the knowledge_graph_agent.
    """
    return {}

