def generate_markdown_report(profile: dict, timeline: list) -> str:
    """
    Generates a Markdown report of the intelligence gathered.
    """
    name = profile.get("identity", {}).get("name", "Unknown")
    confidence = profile.get("identity", {}).get("overall_confidence", 0.0)
    
    md = f"# NeuraX Intelligence Report: {name}\\n\\n"
    md += f"**Overall Confidence**: {confidence * 100:.1f}%\\n\\n"
    
    md += "## Platforms Discovered\\n"
    for p in profile.get("platforms", []):
        md += f"- {p}\\n"
        
    md += "\\n## Evidence Summary\\n"
    evidence = profile.get("evidence", {})
    md += f"**Claim**: {evidence.get('claim', 'None')}\\n"
    if evidence.get("source_url"):
        md += f"**Source**: {evidence['source_url']}\\n"
        
    md += "\\n## Discovery Timeline\\n"
    for event in timeline:
        md += f"- **{event['timestamp']}**: {event['event']} ({event['source']})\\n"
        
    return md
