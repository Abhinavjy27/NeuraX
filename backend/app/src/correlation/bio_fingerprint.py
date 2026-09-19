from app.src.vectordb.embedder import embed_text
import math

def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Computes cosine similarity between two vectors."""
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

def match_bios(bio1: str, bio2: str) -> float:
    """
    Computes similarity between two bios using text embeddings.
    Returns a score between 0.0 and 1.0.
    """
    if not bio1 or not bio2:
        return 0.0
    
    emb1 = embed_text(bio1)
    emb2 = embed_text(bio2)
    
    if not emb1 or not emb2:
        return 0.0
        
    return cosine_similarity(emb1, emb2)
