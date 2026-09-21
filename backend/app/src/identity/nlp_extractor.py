import os
import re
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
import spacy

logger = logging.getLogger(__name__)

# Load the English NLP model. 
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy model 'en_core_web_sm' not found. Falling back to downloading it or using rule-based extraction.")
    nlp = None

_openai_client = None

def _get_openai_client() -> Optional[AsyncOpenAI]:
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            _openai_client = AsyncOpenAI(api_key=api_key)
    return _openai_client

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
        match = re.search(r'\b[A-Z][a-z]+\s[A-Z][a-z]+\b', text)
        if match:
            results["persons"].append(match.group(0))
        elif len(text.split()) <= 3:
            results["persons"].append(text.strip(',.'))
        else:
            results["persons"].append(text.split()[0].strip(',.'))
        return results

    doc = nlp(text)
    
    for i, ent in enumerate(doc.ents):
        cleaned_text = ent.text.strip()
        if ent.label_ == "PERSON":
            # If next token is an alphabetic word before punctuation (e.g. lowercase surname "immadi")
            end_idx = getattr(ent, "end", None)
            if isinstance(end_idx, int):
                try:
                    if end_idx < len(doc):
                        next_tok = doc[end_idx]
                        if getattr(next_tok, "is_alpha", False) and not getattr(next_tok, "is_stop", False) and str(next_tok).lower() not in (
                            'who', 'teaches', 'works', 'working', 'at', 'in', 'is', 'from'
                        ):
                            cleaned_text = f"{cleaned_text} {next_tok.text}"
                except Exception:
                    pass
            
            cand_title = cleaned_text.title()
            if cand_title not in results["persons"]:
                results["persons"].append(cand_title)
        elif ent.label_ == "ORG":
            if cleaned_text not in results["organizations"]:
                results["organizations"].append(cleaned_text)
        elif ent.label_ in ("GPE", "LOC"):
            if cleaned_text not in results["locations"]:
                results["locations"].append(cleaned_text)
                
    # Fallback: if no person found but text is provided, maybe the whole text is a name or username
    if not results["persons"] and len(text.split()) <= 2:
        results["persons"].append(text.strip().title())
        
    return results

def _rule_based_parse(text: str) -> Dict[str, Any]:
    """
    Robust rule-based parser that splits name and context keywords,
    handles lowercase names, prepositions, roles, and institutions.
    """
    text = text.strip()
    if not text:
        return {
            "candidate_name": "torvalds",
            "role": None,
            "organization": None,
            "location": None,
            "search_keywords": [],
            "enriched_search_query": "torvalds",
            "raw_context": text,
        }

    # 1. Check for comma / semicolon / newline separation: e.g. "Kranthi immadi, teaches at cmr"
    parts = [p.strip() for p in re.split(r'[,;\n]', text) if p.strip()]
    first_part = parts[0]
    tail = " ".join(parts[1:]) if len(parts) > 1 else ""

    # 2. Check for prepositional splits within first_part (e.g. "kranthi immadi teaches at cmr")
    prep_match = re.search(
        r'^(.*?)\s+(?:teaches\s+at|works\s+at|working\s+at|founder\s+of|creator\s+of|at|in|from)\s+(.*)$',
        first_part,
        re.IGNORECASE
    )
    
    if prep_match:
        raw_name = prep_match.group(1).strip()
        context_tail = f"{prep_match.group(2).strip()} {tail}".strip()
    elif len(first_part.split()) <= 4 and not any(w.lower() in ('who', 'teaches', 'works', 'is', 'at', 'in') for w in first_part.split()):
        raw_name = first_part
        context_tail = tail
    else:
        # Fallback: take first 2 words as name
        words = first_part.split()
        raw_name = " ".join(words[:2]) if len(words) >= 2 else words[0]
        context_tail = f"{' '.join(words[2:])} {tail}".strip()

    candidate_name = raw_name.title().strip(".,;:?!")
    
    # Extract keywords from context_tail
    words = re.findall(r'[a-zA-Z0-9]+', context_tail)
    stop_words = {'at', 'in', 'of', 'for', 'the', 'and', 'is', 'who', 'a', 'an', 'to', 'from', 'with', 'by', 'on'}
    keywords = [w for w in words if len(w) > 1 and w.lower() not in stop_words]
    
    role = None
    org = None
    role_terms = {'teaches', 'teacher', 'professor', 'lecturer', 'faculty', 'researcher', 'engineer', 'developer', 'ceo', 'founder', 'director', 'creator'}
    for kw in keywords:
        if kw.lower() in role_terms and not role:
            role = kw
        elif not org:
            org = kw

    # Extract any explicitly specified aliases: alias:, aliases:, aka:, a.k.a.:, also known as:
    alias_match = re.search(
        r'(?:alias(?:es)?|aka|a\.k\.a\.|also known as|handle(?:s)?)\s*[:=]?\s*([^;\n]+)',
        text,
        re.IGNORECASE
    )
    aliases = []
    if alias_match:
        raw_aliases = alias_match.group(1).strip("()").split(",")
        for a in raw_aliases:
            clean_a = re.sub(r'[()"\']', '', a).strip()
            clean_a = re.split(r'\s+(?:at|in|from|who|works|teaches)\s+', clean_a, flags=re.IGNORECASE)[0].strip()
            if clean_a and clean_a.lower() != candidate_name.lower():
                aliases.append(clean_a)

    if org:
        enriched_query = f'"{candidate_name}" {org}'
    elif role:
        enriched_query = f'"{candidate_name}" {role}'
    else:
        enriched_query = candidate_name

    return {
        "candidate_name": candidate_name,
        "aliases": aliases,
        "role": role,
        "organization": org,
        "location": None,
        "search_keywords": keywords,
        "enriched_search_query": enriched_query,
        "raw_context": text,
    }

async def parse_target_prompt(text: str) -> Dict[str, Any]:
    """
    Parses an OSINT query into structured target components:
    - candidate_name: Canonical capitalized name
    - aliases: Explicitly specified alternate names, handles, or aliases
    - role: Stated occupation / role
    - organization: Stated company / university / institution
    - location: Stated location
    - search_keywords: Key disambiguating tokens
    - enriched_search_query: Best query combining name and disambiguation context
    Uses GPT-4o when available with fast fallback to robust rule-based parser.
    """
    if not text or not text.strip():
        return _rule_based_parse(text)

    client = _get_openai_client()
    if client and client.api_key:
        prompt = f"""You are an expert OSINT digital identity intelligence parsing engine.
Parse the following user target input into structured search parameters:
INPUT: "{text}"

OUTPUT REQUIREMENTS:
- candidate_name: Full human name of the target person (properly capitalized, e.g. "Kranthi Immadi" or "Linus Torvalds"). If it's an alias or handle, keep it.
- aliases: List of any explicitly specified alternate names, handles, or aliases mentioned in the input (e.g. from 'alias: ...', 'aka: ...', 'also known as ...'). If none specified, return [].
- role: Any stated profession, role, title (e.g. 'teacher', 'software engineer', 'researcher') or null.
- organization: Any stated company, university, college, institute, or organization (e.g. 'CMR', 'Google') or null.
- location: Any stated city, state, or country, or null.
- search_keywords: List of key disambiguating keywords (e.g. ["cmr", "teaches"]).
- enriched_search_query: Best Google search query combining name and disambiguation keywords (e.g. '"Kranthi Immadi" cmr').

Return JSON only conforming to these fields."""
        try:
            resp = await asyncio.wait_for(
                client.chat.completions.create(
                    model="gpt-4o",
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.0,
                    max_tokens=150,
                ),
                timeout=4.0
            )
            content = resp.choices[0].message.content
            data = json.loads(content)
            name = data.get("candidate_name") or data.get("name")
            if name:
                enriched = data.get("enriched_search_query")
                if not enriched or enriched.strip() == name.strip():
                    org = data.get("organization")
                    role = data.get("role")
                    if org:
                        enriched = f'"{name.strip()}" {org}'
                    elif role:
                        enriched = f'"{name.strip()}" {role}'
                    else:
                        enriched = f'"{name.strip()}"'

                return {
                    "candidate_name": name.strip(),
                    "aliases": data.get("aliases") or [],
                    "role": data.get("role"),
                    "organization": data.get("organization"),
                    "location": data.get("location"),
                    "search_keywords": data.get("search_keywords") or [],
                    "enriched_search_query": enriched,
                    "raw_context": text,
                }
        except Exception as e:
            logger.warning(f"LLM target prompt parsing failed or timed out ({e}). Using rule-based fallback.")

    return _rule_based_parse(text)

def get_primary_candidate(text: str) -> str:
    """
    Extracts the most likely primary candidate username/name from the context.
    """
    parsed = _rule_based_parse(text)
    return parsed["candidate_name"]
