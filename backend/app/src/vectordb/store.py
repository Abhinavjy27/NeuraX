import os
import chromadb
from chromadb.config import Settings
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Fetch the persist directory from the environment, defaulting to local app/data
PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./data/vectordb")

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
    bios_collection = client.get_or_create_collection(
        name="bios",
        metadata={"hnsw:space": "cosine"}
    )
    logger.info(f"Initialized ChromaDB at {PERSIST_DIR}")
except Exception as e:
    logger.error(f"Failed to initialize ChromaDB: {e}")
    client = None
    faces_collection = None
    bios_collection = None

def get_collection():
    return bios_collection


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

from openai import AsyncOpenAI
_openai_client = None

def _get_openai():
    global _openai_client
    if not _openai_client:
        _openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _openai_client

async def upsert_text_chunks(person_id: str, chunks: List[str]):
    """Embed text chunks and upsert to ChromaDB."""
    if bios_collection is None or not chunks:
        return False
        
    client = _get_openai()
    try:
        # Get embeddings in bulk
        resp = await client.embeddings.create(
            input=chunks,
            model="text-embedding-3-small"
        )
        embeddings = [d.embedding for d in resp.data]
        ids = [f"{person_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"person_id": person_id, "text": chunk} for chunk in chunks]
        
        bios_collection.upsert(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas
        )
        return True
    except Exception as e:
        logger.error(f"Failed to upsert text chunks for {person_id}: {e}")
        return False

async def search_text_chunks(query: str, person_id: str, n_results: int = 5) -> List[Dict]:
    """Embed the query and retrieve Top K matching text chunks for a specific person."""
    if bios_collection is None:
        return []
        
    client = _get_openai()
    try:
        resp = await client.embeddings.create(
            input=[query],
            model="text-embedding-3-small"
        )
        query_embedding = resp.data[0].embedding
        
        results = bios_collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where={"person_id": person_id}
        )
        
        formatted = []
        if results['ids'] and results['ids'][0]:
            for i in range(len(results['ids'][0])):
                formatted.append({
                    "id": results['ids'][0][i],
                    "distance": results['distances'][0][i] if 'distances' in results and results['distances'] else 0.0,
                    "metadata": results['metadatas'][0][i] if 'metadatas' in results and results['metadatas'] else {}
                })
        return formatted
    except Exception as e:
        logger.error(f"Failed to search text chunks: {e}")
        return []
