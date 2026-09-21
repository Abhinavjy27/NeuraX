import pytest
from unittest.mock import patch, MagicMock

from app.src.scraping.github_client import get_github_profile
from app.src.scraping.username_checker import check_all_platforms

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
async def test_check_all_platforms():
    results = await check_all_platforms("torvalds")
    assert isinstance(results, dict)

@pytest.mark.asyncio
async def test_extract_wiki_summary_and_facts_rule_based():
    from app.src.scraping.search_dorker import _extract_wiki_summary_and_facts
    title = "Linus Torvalds"
    desc = "Finnish and American software engineer (born 1969)"
    extract = "Linus Benedict Torvalds is a Finnish and American software engineer who is the creator and lead developer of the Linux kernel since 1991. He also created the distributed version control system Git."
    lead_text = extract + " Torvalds was one of the recipients of the 2012 Millennium Technology Prize."
    
    summary, facts = await _extract_wiki_summary_and_facts(title, desc, extract, lead_text)
    assert summary is not None
    assert len(summary) > 0
    assert isinstance(facts, list)
    assert len(facts) >= 1
    assert any("Linux" in f or "software engineer" in f.lower() for f in facts)

@pytest.mark.asyncio
@patch('app.src.scraping.search_dorker.httpx.AsyncClient.get')
async def test_search_wikipedia_success(mock_get):
    from app.src.scraping.search_dorker import search_wikipedia
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "title": "Linus Torvalds",
        "description": "Finnish and American software engineer",
        "extract": "Linus Benedict Torvalds is the creator of the Linux kernel. He also created Git.",
        "content_urls": {"desktop": {"page": "https://en.wikipedia.org/wiki/Linus_Torvalds"}},
        "thumbnail": {"source": "https://example.com/linus.jpg"}
    }
    mock_get.return_value = mock_resp

    res = await search_wikipedia("Linus Torvalds")
    assert res["title"] == "Linus Torvalds"
    assert res["url"] == "https://en.wikipedia.org/wiki/Linus_Torvalds"
    assert res["summary"] is not None
    assert isinstance(res["facts"], list)
    assert len(res["facts"]) >= 1
    assert res["image_url"] == "https://example.com/linus.jpg"
