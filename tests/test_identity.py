import pytest
from unittest.mock import patch, MagicMock

from app.src.identity.face_embedder import extract_embedding, verify_faces
from app.src.identity.nlp_extractor import extract_entities, get_primary_candidate

@patch('app.src.identity.face_embedder.DeepFace.represent')
@patch('app.src.identity.face_embedder.os.path.exists')
def test_extract_embedding_success(mock_exists, mock_represent):
    mock_exists.return_value = True
    mock_represent.return_value = [{"embedding": [0.1, 0.2, 0.3]}]
    
    emb = extract_embedding("dummy.jpg")
    assert emb == [0.1, 0.2, 0.3]

@patch('app.src.identity.face_embedder.os.path.exists')
def test_extract_embedding_file_not_found(mock_exists):
    mock_exists.return_value = False
    
    emb = extract_embedding("missing.jpg")
    assert emb is None

@patch('app.src.identity.face_embedder.DeepFace.verify')
def test_verify_faces_success(mock_verify):
    mock_verify.return_value = {"verified": True, "distance": 0.25, "threshold": 0.4}
    
    res = verify_faces("img1.jpg", "img2.jpg")
    assert res["verified"] is True
    assert res["distance"] == 0.25

@patch('app.src.identity.nlp_extractor.nlp')
def test_extract_entities(mock_nlp):
    # If nlp is None in nlp_extractor due to missing model, the mock won't work perfectly
    # But let's assume it was loaded or we patch the module attribute
    mock_doc = MagicMock()
    
    mock_ent1 = MagicMock()
    mock_ent1.text = "Linus Torvalds"
    mock_ent1.label_ = "PERSON"
    
    mock_ent2 = MagicMock()
    mock_ent2.text = "Linux Foundation"
    mock_ent2.label_ = "ORG"
    
    mock_doc.ents = [mock_ent1, mock_ent2]
    mock_nlp.return_value = mock_doc
    
    res = extract_entities("Linus Torvalds created the Linux Foundation.")
    assert "Linus Torvalds" in res["persons"]
    assert "Linux Foundation" in res["organizations"]

def test_get_primary_candidate():
    candidate = get_primary_candidate("Linus Torvalds is great.")
    assert candidate == "Linus Torvalds"

def test_prompt_parsing_kranthi_immadi():
    from app.src.identity.nlp_extractor import _rule_based_parse
    parsed = _rule_based_parse("Kranthi immadi, teaches at cmr")
    assert parsed["candidate_name"] == "Kranthi Immadi"
    assert parsed["role"] == "teaches"
    assert parsed["organization"] == "cmr"
    assert "cmr" in parsed["enriched_search_query"].lower()
    assert "Kranthi Immadi" in parsed["enriched_search_query"]

def test_get_primary_candidate_kranthi():
    candidate = get_primary_candidate("Kranthi immadi, teaches at cmr")
    assert candidate == "Kranthi Immadi"

@pytest.mark.asyncio
async def test_disambiguate_linkedin_profiles_selects_context_match():
    from app.src.identity.profile_attributor import disambiguate_linkedin_profiles
    
    profiles = [
        {
            "platform": "linkedin",
            "url": "https://in.linkedin.com/in/kranthi-immadi-tpo-palvoncha",
            "title": "Kranthi Immadi - TPO at Educational Institution",
            "snippet": "TPO at Educational Institution in Palvoncha",
            "attribution_score": 0.5,
            "confidence": 0.6
        },
        {
            "platform": "linkedin",
            "url": "https://in.linkedin.com/in/kranthi-immadi-cmr",
            "title": "Kranthi Immadi - Assistant Professor at CMR Technical Campus",
            "snippet": "Teaches at CMR Technical Campus in Hyderabad",
            "attribution_score": 0.9,
            "confidence": 0.85
        },
        {
            "platform": "instagram",
            "url": "https://instagram.com/kranthi",
            "title": "Instagram",
            "confidence": 0.7
        }
    ]
    
    context = "Kranthi immadi, teaches at cmr"
    result = await disambiguate_linkedin_profiles(context, "Kranthi Immadi", profiles)
    
    # Exactly one LinkedIn profile should remain
    li_results = [p for p in result if p.get("platform") == "linkedin"]
    assert len(li_results) == 1
    # The selected profile must be the CMR teacher
    assert "cmr" in li_results[0]["url"]
    assert li_results[0]["text_attribution"] == "CONFIRMED"
    # Other platforms must remain untouched
    assert any(p.get("platform") == "instagram" for p in result)

@pytest.mark.asyncio
async def test_disambiguate_linkedin_profiles_deduplicates_same_url():
    from app.src.identity.profile_attributor import disambiguate_linkedin_profiles
    
    profiles = [
        {
            "platform": "linkedin",
            "url": "https://in.linkedin.com/in/kranthi-immadi-9ab460296",
            "title": "LinkedIn: Kranthi Immadi",
            "confidence": 0.7
        },
        {
            "platform": "linkedin",
            "url": "https://www.linkedin.com/in/kranthi-immadi-9ab460296/",
            "title": "Kranthi Immadi - Teacher",
            "snippet": "Teaches at CMR",
            "confidence": 0.8
        }
    ]
    
    result = await disambiguate_linkedin_profiles("Kranthi immadi, teaches at cmr", "Kranthi Immadi", profiles)
    li_results = [p for p in result if p.get("platform") == "linkedin"]
    assert len(li_results) == 1
    assert li_results[0].get("snippet") == "Teaches at CMR"


def test_sort_profiles_by_priority():
    from app.src.identity.profile_attributor import sort_profiles_by_priority

    input_profiles = [
        {"platform": "web", "url": "https://telugustop.com/article/123", "title": "Article", "confidence": 0.6},
        {"platform": "instagram", "url": "https://instagram.com/kranthi", "title": "Instagram", "confidence": 0.7},
        {"platform": "news", "url": "https://thehindu.com/news/123", "title": "News", "confidence": 0.8},
        {"platform": "scholar", "url": "https://scholar.google.com/citations?user=123", "title": "Google Scholar", "confidence": 0.85},
        {"platform": "twitter", "url": "https://x.com/kranthi", "title": "Twitter", "confidence": 0.75},
        {"platform": "academia", "url": "https://independent.academia.edu/Kranthi", "title": "Academia", "confidence": 0.8},
        {"platform": "linkedin", "url": "https://in.linkedin.com/in/kranthi-immadi", "title": "LinkedIn", "confidence": 0.9},
        {"platform": "github", "url": "https://github.com/kranthi", "title": "GitHub", "confidence": 0.85},
    ]

    sorted_profiles = sort_profiles_by_priority(input_profiles)

    # 1. LinkedIn first
    assert sorted_profiles[0]["platform"] == "linkedin"

    # 2. Socials next (GitHub, Twitter, Instagram)
    social_platforms = [p["platform"] for p in sorted_profiles[1:4]]
    assert set(social_platforms) == {"github", "twitter", "instagram"}

    # 3. Scholar next (Scholar, Academia)
    scholar_platforms = [p["platform"] for p in sorted_profiles[4:6]]
    assert set(scholar_platforms) == {"scholar", "academia"}

    # 4. Articles next (News, Web)
    article_platforms = [p["platform"] for p in sorted_profiles[6:]]
    assert set(article_platforms) == {"news", "web"}


@pytest.mark.asyncio
async def test_resolve_candidate_avatar_prioritizes_linkedin():
    from app.src.identity.face_cross_verifier import resolve_candidate_avatar
    
    profiles = [
        {"platform": "linkedin", "url": "https://linkedin.com/in/test", "photo_url": "https://media.licdn.com/dms/image/photo.jpg"},
        {"platform": "instagram", "url": "https://instagram.com/test", "photo_url": "https://scontent.cdninstagram.com/ig.jpg"},
        {"platform": "facebook", "url": "https://facebook.com/test", "photo_url": "https://lookaside.fbsbx.com/fb.jpg"},
    ]
    avatar = await resolve_candidate_avatar(profiles, {})
    assert avatar == "https://media.licdn.com/dms/image/photo.jpg"


@pytest.mark.asyncio
async def test_resolve_candidate_avatar_falls_back_to_socials_when_no_linkedin():
    from app.src.identity.face_cross_verifier import resolve_candidate_avatar
    
    profiles = [
        {"platform": "linkedin", "url": "https://linkedin.com/in/test", "photo_url": None},
        {"platform": "instagram", "url": "https://instagram.com/test", "photo_url": "https://scontent.cdninstagram.com/ig.jpg"},
        {"platform": "facebook", "url": "https://facebook.com/test", "photo_url": "https://lookaside.fbsbx.com/fb.jpg"},
    ]
    avatar = await resolve_candidate_avatar(profiles, {})
    assert avatar == "https://scontent.cdninstagram.com/ig.jpg"


@pytest.mark.asyncio
async def test_resolve_candidate_avatar_selects_facebook_if_no_instagram():
    from app.src.identity.face_cross_verifier import resolve_candidate_avatar
    
    profiles = [
        {"platform": "linkedin", "url": "https://linkedin.com/in/test", "photo_url": None},
        {"platform": "facebook", "url": "https://facebook.com/test", "photo_url": "https://lookaside.fbsbx.com/fb.jpg"},
        {"platform": "scholar", "url": "https://scholar.google.com/citations?user=123", "photo_url": None},
    ]
    avatar = await resolve_candidate_avatar(profiles, {})
    assert avatar == "https://lookaside.fbsbx.com/fb.jpg"


@pytest.mark.asyncio
async def test_fetch_image_url_rejects_placeholders():
    from app.src.identity.face_cross_verifier import _fetch_image_url
    from unittest.mock import AsyncMock, MagicMock
    import httpx
    
    client = MagicMock(spec=httpx.AsyncClient)
    
    # Facebook placeholder test
    fb_resp = MagicMock()
    fb_resp.status_code = 200
    fb_resp.text = '<meta property="og:image" content="https://static.xx.fbcdn.net/rsrc.php/v3/y1/r/fb_icon.png" />'
    client.get = AsyncMock(return_value=fb_resp)
    fb_img = await _fetch_image_url(client, "facebook", {"url": "https://facebook.com/test"})
    assert fb_img is None
    
    # Real Facebook image test
    fb_real = MagicMock()
    fb_real.status_code = 200
    fb_real.text = '<meta property="og:image" content="https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=12345" />'
    client.get = AsyncMock(return_value=fb_real)
    fb_real_img = await _fetch_image_url(client, "facebook", {"url": "https://facebook.com/test"})
    assert fb_real_img == "https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=12345"


def test_candidate_pool_abhishek_polishetty():
    from app.src.identity.username_generator import generate_usernames
    from app.src.identity.candidate_pool import build_candidate_pool
    from app.src.identity.profile_attributor import matches_candidate_identity

    # From base name "Abhishek Polisetty", candidate pool includes exact permutations
    pool = generate_usernames("Abhishek Polisetty")
    assert "abhishek_polisetty" in pool
    assert "abhishek.polisetty" in pool
    assert "abhishekpolisetty" in pool
    # Loose transliterations like polishetty/polisetti should NOT be auto-generated
    assert "abhishek_polishetty" not in pool
    assert "abhishek_polisetti" not in pool

    # From candidate_pool module with explicit alias
    pool_with_alias = build_candidate_pool("Abhishek Polisetty", aliases=["Abhishek Polishetty"])
    assert "abhishek_polishetty" in pool_with_alias
    assert "abhishek.polishetty" in pool_with_alias
    assert "abhishek_polisetty" in pool_with_alias

    # From username with underscore/dot
    pool_underscore = generate_usernames("abhishek_polishetty")
    assert "abhishek_polishetty" in pool_underscore
    assert "abhishek.polishetty" in pool_underscore

    pool_dot = generate_usernames("abhishek.polishetty")
    assert "abhishek_polishetty" in pool_dot
    assert "abhishek.polishetty" in pool_dot

    # Identity matching against candidate pool aliases
    assert matches_candidate_identity("Abhishek Polisetty", "https://www.instagram.com/abhishek_polisetty/", aliases=pool) is True
    assert matches_candidate_identity("Abhishek Polisetty", "https://github.com/abhishek.polisetty", aliases=pool) is True
    assert matches_candidate_identity("Abhishek Polisetty", "https://www.instagram.com/abhishek_polishetty/", aliases=pool_with_alias) is True



