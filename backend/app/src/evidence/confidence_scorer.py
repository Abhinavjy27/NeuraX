def normalize_confidence(raw_score: float) -> float:
    """Clamps a confidence score between 0.0 and 1.0"""
    return max(0.0, min(1.0, float(raw_score)))

def score_evidence(evidence_dict: dict) -> dict:
    """Normalizes the confidence field in an evidence payload."""
    if "confidence" in evidence_dict:
        evidence_dict["confidence"] = normalize_confidence(evidence_dict["confidence"])
    return evidence_dict
