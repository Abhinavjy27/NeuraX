import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import json

from app.src.correlation.entity_resolution_agent import resolve_identity, mock_resolve_identity

@pytest.mark.asyncio
@patch('app.src.correlation.entity_resolution_agent.client.chat.completions.create', new_callable=AsyncMock)
@patch('app.src.correlation.entity_resolution_agent.client', new_callable=MagicMock)
async def test_resolve_identity_success(mock_client, mock_create):
    # Ensure api_key is present so it doesn't immediately fallback
    mock_client.api_key = "test_key"
    
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_json = {
        "claim": "Subject active",
        "source_url": "github.com",
        "confidence": 0.9,
        "verification_method": "llm",
        "conflicts": []
    }
    mock_response.choices[0].message.content = json.dumps(mock_json)
    mock_create.return_value = mock_response
    
    # We also need to patch client.api_key inside the module if we want it to bypass the check
    with patch('app.src.correlation.entity_resolution_agent.client.api_key', "test_key"):
        result = await resolve_identity("torvalds", {"links": {"GitHub": "..."}}, {})
    
    assert result["confidence"] == 0.9
    assert result["claim"] == "Subject active"

@pytest.mark.asyncio
@patch('app.src.correlation.entity_resolution_agent.client.chat.completions.create', new_callable=AsyncMock)
async def test_resolve_identity_exception_fallback(mock_create):
    mock_create.side_effect = Exception("API error")
    
    with patch('app.src.correlation.entity_resolution_agent.client.api_key', "test_key"):
        result = await resolve_identity("torvalds", {"links": {"GitHub": "..."}}, {})
        
    assert result["verification_method"] == "mock_resolution_fallback"

def test_mock_resolve_identity():
    result = mock_resolve_identity("torvalds", {"links": {"GitHub": "..."}})
    assert result["confidence"] == 0.75
    assert result["verification_method"] == "mock_resolution_fallback"
