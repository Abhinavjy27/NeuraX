import os
import chromadb
from chromadb.config import Settings
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Fetch the persist directory from the environment, defaulting to local app/data
PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "/app/data/vectordb")

# Initialize ChromaDB in Persistent mode
try:
    client = chromadb.PersistentClient(
        path=PERSIST_DIR,
        settings=Settings(anonymized_telemetry=False)
    )
    # We use cosine similarity for face embeddings
    faces_collection = client.get_or_create_collection(
        name="faces",
        metadata={"hnsw:space": "cosine"}
    )
    logger.info(f"Initialized ChromaDB at {PERSIST_DIR}")
except Exception as e:
    logger.error(f"Failed to initialize ChromaDB: {e}")
    client = None
    faces_collection = None


def upsert_face(face_id: str, embedding: List[float], metadata: Dict[str, Any] = None):
    """
    Store or update a face embedding in the Vector DB.
    """
    if faces_collection is None:
        logger.warning("ChromaDB not initialized. Skipping upsert.")
        return False
        
    try:
        faces_collection.upsert(
            ids=[face_id],
            embeddings=[embedding],
            metadatas=[metadata] if metadata else [{}]
        )
        return True
    except Exception as e:
        logger.error(f"Failed to upsert face {face_id}: {e}")
        return False


def search_face(embedding: List[float], n_results: int = 3) -> List[Dict[str, Any]]:
    """
    Search for similar faces based on the embedding.
    Returns a list of dictionaries with id, distance, and metadata.
    """
    if faces_collection is None:
        logger.warning("ChromaDB not initialized. Skipping search.")
        return []

    try:
        results = faces_collection.query(
            query_embeddings=[embedding],
            n_results=n_results
        )
        
        # Format results
        formatted_results = []
        if results['ids'] and results['ids'][0]:
            for i in range(len(results['ids'][0])):
                formatted_results.append({
                    "id": results['ids'][0][i],
                    "distance": results['distances'][0][i] if 'distances' in results and results['distances'] else 0.0,
                    "metadata": results['metadatas'][0][i] if 'metadatas' in results and results['metadatas'] else {}
                })
        return formatted_results
    except Exception as e:
        logger.error(f"Failed to search face: {e}")
        return []
