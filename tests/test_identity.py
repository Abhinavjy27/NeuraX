import pytest
from unittest.mock import patch, MagicMock

from app.src.identity.face_embedder import extract_embedding, verify_faces
from app.src.identity.nlp_extractor import extract_entities, get_primary_candidate

@patch('app.src.identity.face_embedder.DeepFace.represent')
@patch('app.src.identity.face_embedder.os.path.exists')
def test_extract_embedding_success(mock_exists, mock_represent):
    mock_exists.return_value = True
    mock_represent.return_value = [{"embedding": [0.1, 0.2, 0.3]}]
    
    emb = extract_embedding("dummy.jpg")
    assert emb == [0.1, 0.2, 0.3]

@patch('app.src.identity.face_embedder.os.path.exists')
def test_extract_embedding_file_not_found(mock_exists):
    mock_exists.return_value = False
    
    emb = extract_embedding("missing.jpg")
    assert emb is None

@patch('app.src.identity.face_embedder.DeepFace.verify')
def test_verify_faces_success(mock_verify):
    mock_verify.return_value = {"verified": True, "distance": 0.25, "threshold": 0.4}
    
    res = verify_faces("img1.jpg", "img2.jpg")
    assert res["verified"] is True
    assert res["distance"] == 0.25

@patch('app.src.identity.nlp_extractor.nlp')
def test_extract_entities(mock_nlp):
    # If nlp is None in nlp_extractor due to missing model, the mock won't work perfectly
    # But let's assume it was loaded or we patch the module attribute
    mock_doc = MagicMock()
    
    mock_ent1 = MagicMock()
    mock_ent1.text = "Linus Torvalds"
    mock_ent1.label_ = "PERSON"
    
    mock_ent2 = MagicMock()
    mock_ent2.text = "Linux Foundation"
    mock_ent2.label_ = "ORG"
    
    mock_doc.ents = [mock_ent1, mock_ent2]
    mock_nlp.return_value = mock_doc
    
    res = extract_entities("Linus Torvalds created the Linux Foundation.")
    assert "Linus Torvalds" in res["persons"]
    assert "Linux Foundation" in res["organizations"]

@patch('app.src.identity.nlp_extractor.extract_entities')
def test_get_primary_candidate(mock_extract):
    mock_extract.return_value = {"persons": ["Linus Torvalds"], "organizations": [], "locations": []}
    
    candidate = get_primary_candidate("Linus Torvalds is great.")
    assert candidate == "linustorvalds"
