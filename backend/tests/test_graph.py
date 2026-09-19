from app.src.graph.builder import build_identity_graph

def test_build_identity_graph():
    platforms = {"GitHub": "github.com", "Twitter": "twitter.com"}
    db_matches = {"db_id": "face_123"}
    
    data = build_identity_graph("Linus Torvalds", platforms, db_matches)
    
    assert "nodes" in data
    assert "links" in data
    
    nodes = data["nodes"]
    node_ids = [n["id"] for n in nodes]
    assert "linus_torvalds" in node_ids
    assert "GitHub_linus_torvalds" in node_ids
    assert "face_123" in node_ids
    
    links = data["links"]
    assert len(links) == 3
