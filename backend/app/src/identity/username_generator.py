import re
from typing import List, Set, Optional

def _get_token_variants(token: str) -> List[str]:
    """Returns the token as-is without loose transliterations."""
    return [token.lower()]

def generate_usernames(base_name: str, max_variations: int = 30, aliases: Optional[List[str]] = None) -> List[str]:
    """
    Takes a raw name or username (e.g., 'Abhishek Polisetty', 'abhishek_polishetty', 'abhishek.polishetty')
    and generates common username variations, including transliteration variants
    (e.g. 'abhishek_polishetty', 'abhishek.polishetty', 'abhishekpolisetti')
    and any explicitly specified aliases, adding them to the candidate pool.
    """
    if not base_name:
        return []

    candidate_pool: List[str] = []
    seen: Set[str] = set()

    def add_variation(val: str):
        v = val.strip().lower()
        if v and v not in seen:
            seen.add(v)
            candidate_pool.append(v)

    def _process_name_tokens(tokens: List[str]):
        if not tokens:
            return
        if len(tokens) == 1:
            single = tokens[0]
            for p in _get_token_variants(single):
                add_variation(p)
                add_variation(f"{p}123")
                add_variation(f"{p}official")
                add_variation(f"the{p}")
        else:
            first_token = tokens[0]
            last_token = tokens[-1]
            first_variants = _get_token_variants(first_token)
            last_variants = _get_token_variants(last_token)

            # 1. Primary: exact full name entity forms
            add_variation("".join(tokens))
            add_variation("_".join(tokens))
            add_variation(".".join(tokens))
            add_variation("-".join(tokens))

            # 2. Add transliteration variants for surname (e.g. abhishek_polishetty, abhishek.polishetty)
            for lv in last_variants:
                if lv != last_token:
                    if len(tokens) == 2:
                        add_variation(f"{first_token}_{lv}")
                        add_variation(f"{first_token}.{lv}")
                        add_variation(f"{first_token}{lv}")
                        add_variation(f"{first_token}-{lv}")
                    else:
                        mid = tokens[1:-1]
                        add_variation(f"{first_token}_{'_'.join(mid)}_{lv}")
                        add_variation(f"{first_token}.{'.'.join(mid)}.{lv}")
                        add_variation(f"{first_token}{''.join(mid)}{lv}")

            # 3. Add transliteration variants for first name
            for fv in first_variants:
                if fv != first_token:
                    if len(tokens) == 2:
                        add_variation(f"{fv}_{last_token}")
                        add_variation(f"{fv}.{last_token}")
                        add_variation(f"{fv}{last_token}")
                        add_variation(f"{fv}-{last_token}")

            # 4. Add inverted forms
            add_variation("".join(reversed(tokens)))
            add_variation("_".join(reversed(tokens)))
            add_variation(".".join(reversed(tokens)))

            for lv in last_variants:
                if lv != last_token:
                    add_variation(f"{lv}_{first_token}")
                    add_variation(f"{lv}.{first_token}")
                    add_variation(f"{lv}{first_token}")

    # Add raw base_name if it looks like a clean handle
    clean_raw = base_name.strip().lower()
    if clean_raw:
        add_variation(clean_raw)

    # Split base_name by whitespace, underscore, dot, or hyphen
    parts = [p for p in re.split(r'[\s._-]+', clean_raw) if p]
    _process_name_tokens(parts)

    # If explicit aliases were supplied, add their variations too
    if aliases:
        for alias in aliases:
            a_clean = alias.strip().lower()
            if a_clean:
                add_variation(a_clean)
                a_parts = [p for p in re.split(r'[\s._-]+', a_clean) if p]
                _process_name_tokens(a_parts)

    return candidate_pool[:max_variations]
