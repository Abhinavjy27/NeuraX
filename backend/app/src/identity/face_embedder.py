import os
import logging
from typing import List, Optional
from deepface import DeepFace

logger = logging.getLogger(__name__)

# We use Facenet512 as it provides high accuracy for face verification.
# Other options: VGG-Face, OpenFace, DeepFace, DeepID, ArcFace, Dlib, SFace.
MODEL_NAME = "Facenet512"

def extract_embedding(image_path: str) -> Optional[List[float]]:
    """
    Extract a 512D face embedding from an image using DeepFace.
    Returns None if no face is detected or an error occurs.
    """
    if not os.path.exists(image_path):
        logger.error(f"Image not found: {image_path}")
        return None

    try:
        # enforce_detection=True ensures we fail fast if no face is in the image
        results = DeepFace.represent(
            img_path=image_path,
            model_name=MODEL_NAME,
            enforce_detection=True,
            align=True
        )
        
        # DeepFace.represent returns a list of dictionaries (one for each detected face)
        if not results or len(results) == 0:
            return None
            
        # We assume the primary subject is the most prominent face (usually the first one)
        primary_face = results[0]
        embedding = primary_face.get("embedding")
        
        return embedding

    except ValueError as e:
        # DeepFace raises ValueError if no face is detected when enforce_detection=True
        logger.warning(f"No face detected in {image_path}: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error extracting embedding from {image_path}: {str(e)}")
        return None

def verify_faces(img1_path: str, img2_path: str) -> dict:
    """
    Verify if two images contain the same person.
    Returns a dictionary with 'verified' (bool), 'distance' (float), and 'similarity' (float).
    Rule: below 50% similarity is considered a failure (not the same person).
    """
    try:
        result = DeepFace.verify(
            img1_path=img1_path,
            img2_path=img2_path,
            model_name=MODEL_NAME,
            enforce_detection=True
        )
        distance = float(result.get("distance", 1.0))
        similarity = max(0.0, min(1.0, 1.0 - distance))
        verified = bool(similarity >= 0.50)
        return {
            "verified": verified,
            "distance": distance,
            "similarity": round(similarity, 3),
            "threshold": 0.50
        }
    except Exception as e:
        logger.error(f"Face verification failed: {str(e)}")
        return {"verified": False, "distance": 1.0, "similarity": 0.0, "threshold": 0.50}
