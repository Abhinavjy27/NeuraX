import re
from typing import List, Set

def generate_usernames(base_name: str, max_variations: int = 5) -> List[str]:
    """
    Takes a raw name (e.g., 'John Doe') and generates common username variations.
    Capped at max_variations to avoid hitting rate limits too aggressively.
    """
    if not base_name:
        return []

    # Clean the name: remove special chars, trim, convert to lower
    clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', base_name).strip().lower()
    parts = clean_name.split()

    variations: Set[str] = set()
    
    if len(parts) == 1:
        # Single word name/alias (e.g., 'mrbeast', 'linus')
        variations.add(parts[0])
        variations.add(f"{parts[0]}123")
        variations.add(f"{parts[0]}official")
        variations.add(f"the{parts[0]}")
    elif len(parts) >= 2:
        first = parts[0]
        last = parts[-1]
        
        # john_doe
        variations.add(f"{first}_{last}")
        # johndoe
        variations.add(f"{first}{last}")
        # john.doe
        variations.add(f"{first}.{last}")
        # jdoe
        variations.add(f"{first[0]}{last}")
        # johnd
        variations.add(f"{first}{last[0]}")
        # doejohn
        variations.add(f"{last}{first}")
        
    # Also add the exact raw string stripped of spaces, just in case it's a known handle
    variations.add(base_name.replace(" ", "").lower())

    # Sort to prioritize the most common ones (johndoe, john_doe, jdoe)
    # Convert to list and limit
    prioritized = []
    
    # Priority 1: Exact matches or firstlast
    exact = base_name.replace(" ", "").lower()
    if exact in variations:
        prioritized.append(exact)
        variations.remove(exact)
        
    # Priority 2: Add others
    for v in sorted(list(variations), key=len):
        if len(prioritized) < max_variations:
            prioritized.append(v)
            
    return prioritized[:max_variations]
