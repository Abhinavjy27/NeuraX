import pytest
from pydantic import ValidationError
from app.src.evidence.schema import Claim, Source, EvidenceRecord
from app.src.evidence.conflict_detector import detect_conflicts

def test_claim_schema_valid():
    claim = Claim(
        fact="Subject works at Google",
        confidence=0.9,
        source=Source(platform="LinkedIn", url="https://linkedin.com/in/test")
    )
    assert claim.fact == "Subject works at Google"
    assert claim.confidence == 0.9
    assert claim.source.platform == "LinkedIn"

def test_claim_schema_invalid():
    with pytest.raises(ValidationError):
        # Missing required fields
        Claim(
            fact="Subject works at Google",
            confidence="high" # Invalid type
        )

def test_conflict_detector():
    claims = [
        {"fact": "Subject is a Software Engineer", "confidence": 0.9, "source": "LinkedIn"},
        {"fact": "Subject is a Doctor", "confidence": 0.4, "source": "Twitter"}
    ]
    
    conflicts = detect_conflicts(claims)
    assert len(conflicts) == 1
    assert "Low confidence claims detected" in conflicts[0]
