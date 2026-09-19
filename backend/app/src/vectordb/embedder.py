from sentence_transformers import SentenceTransformer
import threading

# Load model lazily to avoid startup delays
_model = None
_model_lock = threading.Lock()

def get_model():
    global _model
    with _model_lock:
        if _model is None:
            _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model

def embed_text(text: str) -> list[float]:
    """Generates a text embedding for bios/descriptions."""
    if not text:
        return []
    model = get_model()
    embedding = model.encode(text)
    return embedding.tolist()
