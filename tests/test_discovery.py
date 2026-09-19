import pytest
from unittest.mock import patch, MagicMock

from app.src.scraping.github_client import get_github_profile
from app.src.scraping.username_checker import check_all_platforms, check_platform

@pytest.mark.asyncio
@patch('app.src.scraping.github_client.httpx.AsyncClient.get')
async def test_get_github_profile_success(mock_get):
    # Mock responses for search, profile, orgs, and repos
    mock_search_resp = MagicMock()
    mock_search_resp.status_code = 200
    mock_search_resp.json.return_value = {
        "items": [{"login": "torvalds"}]
    }

    mock_profile_resp = MagicMock()
    mock_profile_resp.status_code = 200
    mock_profile_resp.json.return_value = {
        "login": "torvalds",
        "name": "Linus Torvalds",
        "bio": "Creator of Linux",
        "followers": 1000,
        "avatar_url": "https://example.com/torvalds.png"
    }
    
    mock_orgs_resp = MagicMock()
    mock_orgs_resp.status_code = 200
    mock_orgs_resp.json.return_value = [{"login": "linuxfoundation"}]
    
    mock_repos_resp = MagicMock()
    mock_repos_resp.status_code = 200
    mock_repos_resp.json.return_value = [
        {"name": "linux", "stargazers_count": 100000},
        {"name": "git", "stargazers_count": 50000}
    ]
    
    mock_get.side_effect = [mock_search_resp, mock_profile_resp, mock_orgs_resp, mock_repos_resp]
    
    profile = await get_github_profile("torvalds")
    
    assert profile is not None
    assert profile["username"] == "torvalds"
    assert profile["name"] == "Linus Torvalds"
    assert "linuxfoundation" in profile["organizations"]
    assert len(profile["top_repositories"]) == 2
    assert profile["top_repositories"][0]["name"] == "linux"

@pytest.mark.asyncio
@patch('app.src.scraping.github_client.httpx.AsyncClient.get')
async def test_get_github_profile_not_found(mock_get):
    mock_search_resp = MagicMock()
    mock_search_resp.status_code = 200
    mock_search_resp.json.return_value = {"items": []}
    mock_get.return_value = mock_search_resp
    
    profile = await get_github_profile("missing_user")
    assert profile is None

@pytest.mark.asyncio
@patch('app.src.scraping.username_checker.httpx.AsyncClient.get')
async def test_check_all_platforms(mock_get):
    # Mocking check_platform GET requests
    mock_resp_success = MagicMock()
    mock_resp_success.status_code = 200
    mock_resp_success.text = "Profile exists here"
    
    mock_resp_fail = MagicMock()
    mock_resp_fail.status_code = 404
    
    def side_effect(url, **kwargs):
        if "instagram" in url or "twitter" in url:
            return mock_resp_success
        return mock_resp_fail
        
    mock_get.side_effect = side_effect
    
    results = await check_all_platforms("torvalds")
    assert "Instagram" in results
    assert "Twitter/X" in results
    assert "YouTube" not in results
