import spacy
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Load the English NLP model. 
# Make sure to run `python -m spacy download en_core_web_trf` or `en_core_web_sm`
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy model 'en_core_web_sm' not found. Falling back to downloading it or using rule-based extraction.")
    nlp = None

def extract_entities(text: str) -> Dict[str, List[str]]:
    """
    Extracts Persons (candidates), Organizations, and Locations from raw context text.
    """
    results = {
        "persons": [],
        "organizations": [],
        "locations": []
    }
    
    if not text:
        return results
        
    if nlp is None:
        import re
        match = re.search(r'\b[A-Z][a-z]+\s[A-Z][a-z]+\b', text)
        if match:
            results["persons"].append(match.group(0))
        elif len(text.split()) <= 3:
            results["persons"].append(text.strip(',.'))
        else:
            results["persons"].append(text.split()[0].strip(',.'))
        return results

    doc = nlp(text)
    
    for ent in doc.ents:
        cleaned_text = ent.text.strip()
        if ent.label_ == "PERSON":
            if cleaned_text not in results["persons"]:
                results["persons"].append(cleaned_text)
        elif ent.label_ == "ORG":
            if cleaned_text not in results["organizations"]:
                results["organizations"].append(cleaned_text)
        elif ent.label_ in ("GPE", "LOC"):
            if cleaned_text not in results["locations"]:
                results["locations"].append(cleaned_text)
                
    # Fallback: if no person found but text is provided, maybe the whole text is a name or username
    if not results["persons"] and len(text.split()) <= 2:
        results["persons"].append(text.strip())
        
    return results

def get_primary_candidate(text: str) -> str:
    """
    Extracts the most likely primary candidate username/name from the context.
    """
    entities = extract_entities(text)
    if entities["persons"]:
        return entities["persons"][0]
    
    # Fallback: Find first capitalized two-word phrase
    import re
    match = re.search(r'\b[A-Z][a-z]+\s[A-Z][a-z]+\b', text)
    if match:
        return match.group(0)
    
    # Ultimate fallback
    return text.split()[0].strip(".,")
