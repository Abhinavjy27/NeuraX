def attach_source(platform: str, username: str) -> str:
    """Returns the source URL for a given platform and username."""
    base_urls = {
        "GitHub": "https://github.com/",
        "LinkedIn": "https://linkedin.com/in/",
        "Twitter": "https://twitter.com/",
        "Instagram": "https://instagram.com/",
        "YouTube": "https://youtube.com/@"
    }
    base = base_urls.get(platform)
    if base:
        return f"{base}{username}"
    return f"https://{platform.lower()}.com/{username}"
