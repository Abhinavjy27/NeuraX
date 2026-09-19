from app.src.vectordb.store import get_collection
from app.src.vectordb.embedder import embed_text

def search_bio(bio_text: str, n_results: int = 3) -> list:
    """Searches the Vector DB for similar bios."""
    embedding = embed_text(bio_text)
    if not embedding:
        return []
        
    collection = get_collection()
    if not collection:
        return []
        
    results = collection.query(
        query_embeddings=[embedding],
        n_results=n_results
    )
    
    matches = []
    if results and results.get('ids') and results['ids'][0]:
        for i in range(len(results['ids'][0])):
            matches.append({
                "id": results['ids'][0][i],
                "distance": results['distances'][0][i],
                "metadata": results['metadatas'][0][i] if results.get('metadatas') else {}
            })
    return matches
