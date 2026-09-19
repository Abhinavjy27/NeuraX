import os
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Fetch GitHub token from environment for higher rate limits, but it works without it (60 req/hr)
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

HEADERS = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "NeuraX-Identity-Engine"
}
if GITHUB_TOKEN:
    HEADERS["Authorization"] = f"token {GITHUB_TOKEN}"

async def get_github_profile(query: str, is_email: bool = False) -> Optional[Dict[str, Any]]:
    """
    Search GitHub for a user by email or name, then fetch their profile.
    """
    search_q = f"{query} in:email" if is_email else f'"{query}" in:name'
    search_url = f"https://api.github.com/search/users?q={search_q}&per_page=1"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # 0. Search for the user
            search_resp = await client.get(search_url, headers=HEADERS)
            search_resp.raise_for_status()
            search_data = search_resp.json()
            
            if not search_data.get("items"):
                return None
                
            username = search_data["items"][0]["login"]
            base_url = f"https://api.github.com/users/{username}"
            
            # 1. Get Base Profile
            profile_resp = await client.get(base_url, headers=HEADERS)
            if profile_resp.status_code == 404:
                return None
            profile_resp.raise_for_status()
            
            user_data = profile_resp.json()
            
            # Extract core details
            profile = {
                "platform": "GitHub",
                "username": user_data.get("login"),
                "name": user_data.get("name"),
                "bio": user_data.get("bio"),
                "company": user_data.get("company"),
                "location": user_data.get("location"),
                "blog": user_data.get("blog"),
                "avatar_url": user_data.get("avatar_url"),
                "public_repos_count": user_data.get("public_repos"),
                "followers": user_data.get("followers"),
                "organizations": [],
                "top_repositories": []
            }
            
            # 2. Get Organizations
            orgs_resp = await client.get(f"{base_url}/orgs", headers=HEADERS)
            if orgs_resp.status_code == 200:
                orgs_data = orgs_resp.json()
                profile["organizations"] = [org.get("login") for org in orgs_data]
                
            # 3. Get Top Repositories (sorted by stars)
            repos_resp = await client.get(
                f"{base_url}/repos", 
                params={"sort": "pushed", "per_page": 10},
                headers=HEADERS
            )
            if repos_resp.status_code == 200:
                repos_data = repos_resp.json()
                # Sort by stargazers_count descending and take top 5
                sorted_repos = sorted(repos_data, key=lambda x: x.get("stargazers_count", 0), reverse=True)[:5]
                
                profile["top_repositories"] = [
                    {
                        "name": repo.get("name"),
                        "description": repo.get("description"),
                        "language": repo.get("language"),
                        "stars": repo.get("stargazers_count")
                    }
                    for repo in sorted_repos
                ]
                
            return profile

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 403 and "rate limit" in e.response.text.lower():
                logger.warning("GitHub API rate limit exceeded.")
            else:
                logger.error(f"GitHub API error for {query}: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to scrape GitHub for {query}: {e}")
            return None
