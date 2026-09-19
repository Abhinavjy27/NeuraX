import httpx
import logging
import urllib.parse
from typing import Dict, Optional

logger = logging.getLogger(__name__)

HEADERS = {
    'User-Agent': 'NeuraX-Identity-Engine/1.0 (contact@neurax.com)'
}

async def get_wikidata_socials(candidate_name: str) -> Dict[str, str]:
    """
    Finds the Wikipedia page for a candidate and queries Wikidata for their official social profiles.
    This guarantees accurate profiles for notable people and avoids search engine blockades.
    """
    socials = {}
    
    # Format name for Wikipedia (e.g. "tim cook" -> "Tim_Cook")
    title = urllib.parse.quote(candidate_name.strip().title().replace(" ", "_"))
    url = f"https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles={title}&redirects=1&format=json"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url, headers=HEADERS)
            if r.status_code != 200:
                return socials
                
            pages = r.json().get('query', {}).get('pages', {})
            wikidata_id = None
            for page_id, page_data in pages.items():
                if int(page_id) < 0:
                    # Page does not exist
                    continue
                wikidata_id = page_data.get('pageprops', {}).get('wikibase_item')

            if wikidata_id:
                wd_url = f"https://www.wikidata.org/w/api.php?action=wbgetentities&ids={wikidata_id}&format=json&props=claims"
                wd_r = await client.get(wd_url, headers=HEADERS)
                if wd_r.status_code == 200:
                    claims = wd_r.json().get('entities', {}).get(wikidata_id, {}).get('claims', {})
                    
                    # P2002: Twitter username
                    if 'P2002' in claims: 
                        socials['twitter'] = f"https://twitter.com/{claims['P2002'][0]['mainsnak']['datavalue']['value']}"
                    # P2053: Instagram username
                    if 'P2053' in claims: 
                        socials['instagram'] = f"https://instagram.com/{claims['P2053'][0]['mainsnak']['datavalue']['value']}"
                    # P2013: Facebook username/ID
                    if 'P2013' in claims: 
                        socials['facebook'] = f"https://facebook.com/{claims['P2013'][0]['mainsnak']['datavalue']['value']}"
                    # P2397: YouTube channel ID
                    if 'P2397' in claims:
                        socials['youtube'] = f"https://youtube.com/channel/{claims['P2397'][0]['mainsnak']['datavalue']['value']}"
                    # P3267: Flickr
                    if 'P3267' in claims:
                        socials['flickr'] = f"https://flickr.com/people/{claims['P3267'][0]['mainsnak']['datavalue']['value']}"
                        
        logger.info(f"Wikidata socials found for {candidate_name}: {socials}")
        return socials
        
    except Exception as e:
        logger.warning(f"Failed to fetch Wikidata socials for {candidate_name}: {e}")
        return socials
