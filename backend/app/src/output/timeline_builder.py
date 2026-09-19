import datetime

def build_timeline(evidence: dict, platforms: list) -> list:
    """
    Builds a chronological timeline based on evidence.
    """
    now = datetime.datetime.now().isoformat()
    
    events = []
    events.append({
        "timestamp": now,
        "event": "Identity Resolution Started",
        "source": "NeuraX System"
    })
    
    for platform in platforms:
        events.append({
            "timestamp": now,
            "event": f"Active profile discovered on {platform}",
            "source": platform
        })
        
    if evidence.get("claim"):
        events.append({
            "timestamp": now,
            "event": f"LLM Conclusion: {evidence['claim']}",
            "source": "Entity Resolution Agent"
        })
        
    return events
