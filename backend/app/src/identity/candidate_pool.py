"""
NeuraX Candidate Identity Pool.
Builds candidate identity pool from name, transliterations, usernames, and explicit aliases.
"""
from typing import List, Optional
from app.src.identity.username_generator import generate_usernames, _get_token_variants

def build_candidate_pool(base_name: str, aliases: Optional[List[str]] = None, max_variations: int = 30) -> List[str]:
    """
    Builds the full candidate username and alias pool for identity discovery and verification.
    Includes exact name entity forms, transliteration variants (e.g. abhishek_polishetty, abhishek.polishetty),
    and user-specified aliases.
    """
    return generate_usernames(base_name, max_variations=max_variations, aliases=aliases)

def get_candidate_variations(candidate_name: str, aliases: Optional[List[str]] = None) -> List[str]:
    """
    Convenience wrapper returning candidate variations for matching and attribution.
    """
    return build_candidate_pool(candidate_name, aliases=aliases)
