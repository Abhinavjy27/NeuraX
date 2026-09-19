import os
import json
import logging
from openai import AsyncOpenAI
from typing import Dict, Any

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def synthesize_knowledge_graph(candidate_name: str, scraping_results: Dict[str, Any]) -> Dict[str, Any]:
    """
    Uses GPT-4o to extract nodes, edges, claims, and timeline events from raw OSINT data.
    """
    if not client.api_key:
        logger.warning("OPENAI_API_KEY not found. Using fallback mock graph.")
        return mock_synthesize_graph(candidate_name)

    system_prompt = """
    You are an expert Cybersecurity OSINT Knowledge Graph Extractor.
    Your task is to analyze raw signals from web scraping and generate a rich intelligence graph.
    
    You MUST output valid JSON conforming strictly to the following schema:
    {
      "claims": [
        {
          "predicate": "worked_at | studied_at | lives_in | known_for | uses_platform",
          "object": "String value",
          "confidence": float (0.0 - 1.0),
          "source_url": "URL if available"
        }
      ],
      "timeline": [
        {
          "date": "YYYY or YYYY-MM",
          "event": "Description of the footprint event",
          "confidence": float (0.0 - 1.0)
        }
      ],
      "graph": {
        "nodes": [
          {"id": "unique_string", "label": "Display Name", "type": "person | organization | project | event | platform | location"}
        ],
        "edges": [
          {"source": "node_id_1", "target": "node_id_2", "relation": "WORKS_AT | STUDIED_AT | LIVES_IN | KNOWN_FOR | USES_PLATFORM | CONTRIBUTES_TO"}
        ]
      }
    }
    
    CRITICAL RULES:
    1. The main person node MUST have id: "person_root".
    2. Extract organizations, locations, awards, and known facts from LinkedIn, Wikipedia, and News sources.
    3. For the 'social_media' key: create a 'platform' type node for EACH platform found (e.g. Instagram, Twitter/X, TikTok). Link each to person_root with the relation USES_PLATFORM.
    4. For GitHub repos: ONLY add repos to the graph if the GitHub 'name' field clearly matches the candidate's real name. If the name doesn't match, IGNORE the repo data entirely to avoid polluting the graph with unrelated data.
    5. DO NOT hallucinate data that is not present in the input.
    6. Make the graph rich — include every location, organization, award, and platform you find.
    """

    user_prompt = f"""
    Candidate Name (Main Node ID: person_root): {candidate_name}
    
    Discovery Signals (Scraping):
    {json.dumps(scraping_results, indent=2)}
    
    IMPORTANT: The 'social_media' key contains confirmed platform footprints. Create a node for EACH platform listed and link it to person_root with USES_PLATFORM.
    
    Analyze these signals and construct the structured knowledge graph payload.
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
        
        content = response.choices[0].message.content
        if not content:
            logger.error("LLM returned None content for graph synthesis.")
            return mock_synthesize_graph(candidate_name)
            
        result = json.loads(content)
        
        # Ensure the main person node exists
        if "graph" in result and "nodes" in result["graph"]:
            has_root = any(n.get("id") == "person_root" for n in result["graph"]["nodes"])
            if not has_root:
                result["graph"]["nodes"].append({"id": "person_root", "label": candidate_name, "type": "person"})
                
        return result
        
    except Exception as e:
        logger.error(f"Error during LLM graph synthesis: {e}")
        return mock_synthesize_graph(candidate_name)

def mock_synthesize_graph(candidate_name: str) -> Dict[str, Any]:
    return {
        "claims": [],
        "timeline": [{"date": "2026", "event": "Profile Generated", "confidence": 0.9}],
        "graph": {"nodes": [{"id": "person_root", "label": candidate_name, "type": "person"}], "edges": []}
    }
