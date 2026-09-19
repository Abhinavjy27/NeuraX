from unittest.mock import patch, MagicMock

@patch("app.src.vectordb.store.faces_collection")
def test_upsert_face(mock_faces):
    from app.src.vectordb.store import upsert_face
    
    # Act
    result = upsert_face("test_identity", [0.1, 0.2, 0.3])
    
    # Assert
    assert result is True
    mock_faces.upsert.assert_called_once_with(
        ids=["test_identity"],
        embeddings=[[0.1, 0.2, 0.3]],
        metadatas=[{}]
    )

@patch("app.src.vectordb.store.faces_collection")
def test_search_face(mock_faces):
    # Setup mock query response
    mock_faces.query.return_value = {
        "ids": [["test_identity"]],
        "distances": [[0.1]],
        "metadatas": [[{"name": "test_identity"}]]
    }
    
    from app.src.vectordb.store import search_face
    
    # Act
    results = search_face([0.1, 0.2, 0.3])
    
    # Assert
    assert len(results) == 1
    assert results[0]["id"] == "test_identity"
    assert results[0]["distance"] == 0.1
    assert results[0]["metadata"]["name"] == "test_identity"
