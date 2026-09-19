import os
import json
import logging
from openai import AsyncOpenAI
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Initialize AsyncOpenAI client using the API key from environment
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def resolve_identity(candidate_name: str, scraping_results: Dict[str, Any], db_results: Dict[str, Any]) -> Dict[str, Any]:
    """
    Uses GPT-4o to analyze all gathered OSINT signals and output a structured Evidence Schema.
    """
    if not client.api_key:
        logger.warning("OPENAI_API_KEY not found. Using fallback mock resolution.")
        return mock_resolve_identity(candidate_name, scraping_results)

    system_prompt = """
    You are an expert Cybersecurity OSINT Entity Resolution Agent.
    Your task is to analyze signals from web scraping and facial recognition databases, and determine if they belong to the same real-world identity.
    
    You MUST output valid JSON conforming strictly to the following schema:
    {
      "claim": "Subject is active on [Platforms] as [Name]",
      "source_url": "Comma separated list of URLs or primary platform",
      "confidence": float between 0.0 and 1.0,
      "verification_method": "llm_entity_resolution",
      "conflicts": [{"conflicting_claim": "...", "source_url": "...", "confidence": 0.0}],
      "rejected_platforms": ["List of platforms that describe completely different people or are false positive generic matches"],
      "last_verified": "2026-09-19"
    }
    
    CRITICAL INSTRUCTION: You MUST add ANY platform from 'links' to `rejected_platforms` if it does not have corresponding rich bio/snippet context provided in the signals. Do NOT guess or assume generic URLs belong to the subject unless you have OSINT data to prove it. You must be AGGRESSIVE in rejecting platforms.
    """

    user_prompt = f"""
    Candidate Name: {candidate_name}
    
    Discovery Signals (Scraping):
    {json.dumps(scraping_results, indent=2)}
    
    Identity/VectorDB Signals:
    {json.dumps(db_results, indent=2)}
    
    Analyze these signals and provide the final JSON resolution.
    """

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2
        )
        
        result_content = response.choices[0].message.content
        return json.loads(result_content)
        
    except Exception as e:
        logger.error(f"Error during LLM resolution: {e}")
        return mock_resolve_identity(candidate_name, scraping_results)

def mock_resolve_identity(candidate_name: str, scraping_results: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback if OpenAI fails or key is missing."""
    links = scraping_results.get("links", [])
    platforms = [p.get("platform", "unknown") for p in links] if isinstance(links, list) else list(links.keys())
    return {
        "claim": f"Subject appears to be active on {len(platforms)} platforms.",
        "source_url": ", ".join(platforms),
        "confidence": 0.75,
        "verification_method": "mock_resolution_fallback",
        "conflicts": [],
        "rejected_platforms": [],
        "last_verified": "2026-09-19"
    }
