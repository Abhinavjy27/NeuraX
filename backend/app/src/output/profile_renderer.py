def render_profile(name: str, confidence: float, platforms: list, evidence: dict, graph: dict) -> dict:
    """
    Combines all data into a unified IdentityProfile JSON object.
    """
    return {
        "identity": {
            "name": name,
            "overall_confidence": confidence
        },
        "platforms": platforms,
        "evidence": evidence,
        "graph_summary": {
            "nodes": len(graph.get("nodes", [])),
            "edges": len(graph.get("links", []))
        }
    }
