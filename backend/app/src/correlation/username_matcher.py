from difflib import SequenceMatcher

def match_usernames(username1: str, username2: str) -> float:
    """
    Computes a fuzzy match score between two usernames using SequenceMatcher.
    Returns a score between 0.0 (no match) and 1.0 (exact match).
    """
    if not username1 or not username2:
        return 0.0
    u1, u2 = username1.lower(), username2.lower()
    return SequenceMatcher(None, u1, u2).ratio()
