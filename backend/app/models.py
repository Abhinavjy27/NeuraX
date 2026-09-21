from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Literal, Any

class Profile(BaseModel):
    platform: str
    username: str
    url: str
    confidence: float
    title: Optional[str] = None
    snippet: Optional[str] = None
    photo_url: Optional[str] = None

class Person(BaseModel):
    person_id: str
    canonical_name: str
    aliases: List[str]
    usernames: List[str]
    confidence: float
    profiles: List[Profile]
    avatar_url: Optional[str] = None
    probe_image_url: Optional[str] = None
    face_match_warning: Optional[str] = None
    is_face_match: Optional[bool] = None
    wikipedia: Optional[Dict[str, Any]] = None

class Entity(BaseModel):
    entity_id: str
    type: Literal["organization", "event", "project", "publication", "patent", "platform", "person"]
    name: str

class Evidence(BaseModel):
    claim_id: str
    source_url: str
    excerpt: str
    source_type: str
    confidence: float

class Claim(BaseModel):
    claim_id: str
    subject: str
    predicate: Literal["works_at", "studied_at", "member_of", "contributed_to", "authored", "presented_at", "holds_patent", "located_in"]
    object: str
    object_entity_id: Optional[str] = None
    confidence: float
    conflict_reason: Optional[str] = None
    evidence: List[Evidence]

class CandidateScores(BaseModel):
    name_score: Optional[float] = None
    image_score: Optional[float] = None
    organization_overlap: Optional[float] = None
    source_corroboration: Optional[float] = None
    username_score: Optional[float] = None
    project_overlap: Optional[float] = None
    context_score: Optional[float] = None
    contradiction_penalty: float = 0.0
    identity_score: float

class CandidateProfile(BaseModel):
    person_id: str
    canonical_name_guess: str
    verdict: Literal["confirmed", "possible", "insufficient_evidence"]
    scores: CandidateScores
    profiles_found: List[Profile]
    avatar_url: Optional[str] = None
    probe_image_url: Optional[str] = None
    face_match_warning: Optional[str] = None
    is_face_match: Optional[bool] = None
    wikipedia: Optional[Dict[str, Any]] = None
