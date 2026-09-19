from typing import Optional, Tuple, Literal
from app.models import CandidateScores

WEIGHTS = {
    "name_score": 0.20,
    "image_score": 0.20,
    "organization_overlap": 0.15,
    "source_corroboration": 0.15,
    "username_score": 0.10,
    "project_overlap": 0.10,
    "context_score": 0.10,
}
CONTRADICTION_PENALTY_WEIGHT = 0.50

def calculate_identity_score(
    name_score: Optional[float] = None,
    image_score: Optional[float] = None,
    organization_overlap: Optional[float] = None,
    source_corroboration: Optional[float] = None,
    username_score: Optional[float] = None,
    project_overlap: Optional[float] = None,
    context_score: Optional[float] = None,
    contradiction_penalty: float = 0.0
) -> Tuple[CandidateScores, Literal["confirmed", "possible", "insufficient_evidence"]]:
    """
    Calculates the multi-signal identity score and determines the verdict.
    """
    signals = {
        "name_score": name_score,
        "image_score": image_score,
        "organization_overlap": organization_overlap,
        "source_corroboration": source_corroboration,
        "username_score": username_score,
        "project_overlap": project_overlap,
        "context_score": context_score,
    }

    # Filter out None values and calculate total weights
    active_weights = {k: WEIGHTS[k] for k, v in signals.items() if v is not None}
    total_weight = sum(active_weights.values())

    if total_weight == 0:
        return CandidateScores(
            contradiction_penalty=contradiction_penalty,
            identity_score=0.0
        ), "insufficient_evidence"

    # Normalize weights so they sum to 1.0
    normalized_weights = {k: v / total_weight for k, v in active_weights.items()}

    # Calculate weighted sum
    weighted_sum = sum(signals[k] * normalized_weights[k] for k in active_weights)

    # Apply penalty
    identity_score = weighted_sum - (CONTRADICTION_PENALTY_WEIGHT * contradiction_penalty)
    
    # Clamp to [0, 1]
    identity_score = max(0.0, min(1.0, identity_score))
    
    scores = CandidateScores(
        name_score=name_score,
        image_score=image_score,
        organization_overlap=organization_overlap,
        source_corroboration=source_corroboration,
        username_score=username_score,
        project_overlap=project_overlap,
        context_score=context_score,
        contradiction_penalty=contradiction_penalty,
        identity_score=identity_score
    )

    # Verdict rules:
    # confirmed: score >= 0.75, at least 2 independent source types agree (source_corroboration >= 0.5 is a proxy for this), and at least 2 non-image signals >= 0.5
    # possible: 0.50 <= score < 0.75, or >= 0.75 but failing corroboration gate
    # insufficient_evidence: score < 0.50
    
    if identity_score < 0.50:
        return scores, "insufficient_evidence"
        
    non_image_signals_above_half = sum(
        1 for k, v in signals.items() if k != "image_score" and v is not None and v >= 0.5
    )
    
    is_corroborated = (source_corroboration is not None and source_corroboration >= 0.5) and (non_image_signals_above_half >= 2)
    
    if identity_score >= 0.75 and is_corroborated:
        return scores, "confirmed"
    else:
        return scores, "possible"
