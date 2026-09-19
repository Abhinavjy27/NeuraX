from pydantic import BaseModel
from typing import List

class Source(BaseModel):
    platform: str
    url: str

class Claim(BaseModel):
    fact: str
    confidence: float
    source: Source

class EvidenceRecord(BaseModel):
    identity_name: str
    claims: List[Claim]
    conflicts: List[str] = []
