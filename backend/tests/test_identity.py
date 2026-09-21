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

def test_matches_candidate_identity():
    from app.src.identity.profile_attributor import matches_candidate_identity
    
    # Positive exact matches
    assert matches_candidate_identity("Murari Dundra", "https://in.linkedin.com/in/murari-dundra-5387b9290")
    assert matches_candidate_identity("Murari Dundra", "https://www.falconebiz.com/director/11422705/DUNDRA-MURARI")
    assert matches_candidate_identity("Murari Dundra", "Mr Murari Dundra, Founder & CEO, StayKaro Private Limited")
    assert matches_candidate_identity("Murari Dundra", "https://github.com/murari7995760212 murari7995760212 (MURARI DUNDRA) · GitHub")
    assert matches_candidate_identity("Kranthi Immadi", "https://instagram.com/i_am_kranthiimmadi")
    assert matches_candidate_identity("Torvalds", "https://github.com/torvalds")
    assert matches_candidate_identity("Abhishek Polisetty", "https://in.linkedin.com/in/abhishek-polisetty")
    assert matches_candidate_identity("Abhishek Polisetty", "https://www.youtube.com/@abhishekpolishetty1984 Abhishek Polisetty @abhishekpolishetty1984")

    # Negative matches without aliases (transliteration / variation rejected when alias not specified)
    assert not matches_candidate_identity("Abhishek Polisetty", "https://www.instagram.com/abhishek_as_lover_/ Abhishek Polisetti (@abhishek_as_lover_)")
    assert not matches_candidate_identity("Abhishek Polisetty", "https://www.facebook.com/abhishek.setti.18/ Abhishek Polisetti is on Facebook.")

    # Positive matches WITH explicitly specified aliases
    assert matches_candidate_identity("Abhishek Polisetty", "https://www.instagram.com/abhishek_as_lover_/ Abhishek Polisetti", aliases=["Abhishek Polisetti"])
    assert matches_candidate_identity("Abhishek Polisetty", "https://www.facebook.com/abhishek.setti.18/ Abhishek Polisetti", aliases=["Abhishek Polisetti"])
    
    # Negative matches (unmatched movies, songs, tourism, single-token overlaps, and disconnected words)
    assert not matches_candidate_identity("Murari Dundra", "https://www.imdb.com/title/tt1183907/plotsummary/ Murari (2001) - Plot")
    assert not matches_candidate_identity("Murari Dundra", "https://music.apple.com/in/song/mukunda-murari/1653079969 Mukunda Murari - Song")
    assert not matches_candidate_identity("Murari Dundra", "https://www.tripadvisor.in/Tourism-g27139188-Murari_Uttarkashi_District_Uttarakhand-Vacations.html Murari Tourism")
    assert not matches_candidate_identity("Murari Dundra", "https://letterboxd.com/film/murari/ Murari (2001) - Reviews, film + cast")
    assert not matches_candidate_identity("Murari Dundra", "https://www.rottentomatoes.com/m/murari Murari")
    assert not matches_candidate_identity("Murari Dundra", "https://recindia.nic.in/uploads/files/List-of-shareholders-transfer-to-IEPF.pdf")
    assert not matches_candidate_identity("Murari Dundra", "Murari was seen in Delhi. Meanwhile Dundra is a separate region.")

def test_prompt_parsing_with_alias():
    from app.src.identity.nlp_extractor import _rule_based_parse
    parsed = _rule_based_parse("Abhishek Polisetty, alias: Abhishek Polisetti, teaches at KMIT")
    assert parsed["candidate_name"] == "Abhishek Polisetty"
    assert "Abhishek Polisetti" in parsed["aliases"]

@pytest.mark.asyncio
async def test_text_attribute_profiles_drops_rejected_movies_and_tourism():
    from app.src.identity.profile_attributor import text_attribute_profiles
    from unittest.mock import patch
    
    profiles = [
        {
            "platform": "web",
            "url": "https://www.imdb.com/title/tt1183907/plotsummary/",
            "title": "Murari (2001) - Plot",
            "snippet": "Murari (2001) plot summary on IMDb starring Mahesh Babu."
        },
        {
            "platform": "web",
            "url": "https://www.falconebiz.com/director/11422705/DUNDRA-MURARI",
            "title": "dundra murari / 11422705",
            "snippet": "Dundra Murari Director Identification Number DIN 11422705 Staykaro"
        }
    ]
    
    # Mock _llm_attribute to reject IMDb movie and confirm Falconebiz
    async def mock_llm(context, candidate_name, platform, bio, url="", **kwargs):
        if "imdb.com" in url:
            return {"decision": "REJECTED", "score": 0.0, "reason": "Movie plot summary, not target person."}
        return {"decision": "CONFIRMED", "score": 0.9, "reason": "Director profile matching target name."}
        
    with patch("app.src.identity.profile_attributor._llm_attribute", side_effect=mock_llm):
        result = await text_attribute_profiles("murari dundra", "Murari Dundra", profiles)
        
    # The rejected movie MUST be dropped, not overridden to POSSIBLE!
    assert len(result) == 1
    assert "falconebiz" in result[0]["url"]
    assert not any("imdb.com" in p["url"] for p in result)


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


@pytest.mark.asyncio
async def test_social_photo_extraction_twitter_youtube_tiktok():
    from app.src.identity.face_cross_verifier import _fetch_image_url
    import httpx
    from unittest.mock import AsyncMock

    client = MagicMock(spec=httpx.AsyncClient)

    # Twitter
    tw_resp = MagicMock()
    tw_resp.status_code = 200
    tw_resp.text = '<meta property="og:image" content="https://pbs.twimg.com/profile_images/123/avatar.jpg" />'
    client.get = AsyncMock(return_value=tw_resp)
    tw_img = await _fetch_image_url(client, "twitter", {"url": "https://twitter.com/testuser"})
    assert tw_img == "https://pbs.twimg.com/profile_images/123/avatar.jpg"

    # YouTube
    yt_resp = MagicMock()
    yt_resp.status_code = 200
    yt_resp.text = '<meta property="og:image" content="https://yt3.googleusercontent.com/ytc/test_avatar.jpg" />'
    client.get = AsyncMock(return_value=yt_resp)
    yt_img = await _fetch_image_url(client, "youtube", {"url": "https://youtube.com/@testuser"})
    assert yt_img == "https://yt3.googleusercontent.com/ytc/test_avatar.jpg"

    # TikTok
    tt_resp = MagicMock()
    tt_resp.status_code = 200
    tt_resp.text = '<meta property="og:image" content="https://p16-sign-va.tiktokcdn.com/tos-maliva/test.jpeg" />'
    client.get = AsyncMock(return_value=tt_resp)
    tt_img = await _fetch_image_url(client, "tiktok", {"url": "https://tiktok.com/@testuser"})
    assert tt_img == "https://p16-sign-va.tiktokcdn.com/tos-maliva/test.jpeg"


@pytest.mark.asyncio
async def test_cross_verify_profiles_socials_with_emit_callback():
    from app.src.identity.face_cross_verifier import cross_verify_profiles
    from unittest.mock import AsyncMock

    profiles = [
        {"platform": "instagram", "username": "test_ig", "url": "https://instagram.com/test_ig", "photo_url": "https://cdn.example.com/ig.jpg"},
        {"platform": "twitter", "username": "test_tw", "url": "https://twitter.com/test_tw", "photo_url": "https://cdn.example.com/tw.jpg"},
        {"platform": "linkedin", "username": "test_li", "url": "https://linkedin.com/in/test_li", "photo_url": "https://cdn.example.com/li.jpg"},
    ]

    emitted_events = []
    async def mock_emit(msg):
        emitted_events.append(msg)

    with patch('app.src.identity.face_cross_verifier.os.path.exists', return_value=True), \
         patch('app.src.identity.face_cross_verifier._download_to_temp', new_callable=AsyncMock) as mock_dl, \
         patch('app.src.identity.face_cross_verifier._verify_faces_sync') as mock_verify:

        mock_dl.return_value = "/tmp/fake_photo.jpg"
        # 1st match (IG), 2nd mismatch (TW), 3rd match (LI)
        mock_verify.side_effect = [
            {"verified": True, "distance": 0.20, "threshold": 0.60},
            {"verified": False, "distance": 0.75, "threshold": 0.60},
            {"verified": True, "distance": 0.30, "threshold": 0.60},
        ]

        verified = await cross_verify_profiles(
            "/tmp/probe.jpg",
            profiles,
            {"target_name": "Test User"},
            emit_callback=mock_emit
        )

        assert any("Face matched on Instagram" in e for e in emitted_events)
        assert any("Face mismatch on Twitter/X" in e for e in emitted_events)
        assert any("Face matched on Linkedin" in e for e in emitted_events)
        assert len([p for p in verified if p.get("face_verified") is True]) == 2


@pytest.mark.asyncio
async def test_face_verification_similarity_threshold_below_50():
    from app.src.identity.face_cross_verifier import _verify_faces_sync, verify_probe_against_scraped
    from unittest.mock import AsyncMock

    with patch('deepface.DeepFace.verify') as mock_deepface:
        # Case 1: Distance = 0.55 -> Similarity = 45% (< 50% threshold) -> FAILS (NOT SAME)
        mock_deepface.return_value = {"verified": False, "distance": 0.55}
        res_mismatch = _verify_faces_sync("/tmp/probe.jpg", "/tmp/candidate.jpg")
        assert res_mismatch["verified"] is False
        assert res_mismatch["similarity"] == 0.45
        assert res_mismatch["similarity_threshold"] == 0.50

        # Case 2: Distance = 0.45 -> Similarity = 55% (>= 50% threshold) -> PASSES (SAME)
        mock_deepface.return_value = {"verified": True, "distance": 0.45}
        res_match = _verify_faces_sync("/tmp/probe.jpg", "/tmp/candidate.jpg")
        assert res_match["verified"] is True
        assert res_match["similarity"] == 0.55

    with patch('app.src.identity.face_cross_verifier.os.path.exists', return_value=True), \
         patch('app.src.identity.face_cross_verifier._download_to_temp', new_callable=AsyncMock) as mock_dl, \
         patch('app.src.identity.face_cross_verifier._verify_faces_sync') as mock_sync:

        mock_dl.return_value = "/tmp/avatar.jpg"
        mock_sync.return_value = {
            "verified": False,
            "distance": 0.60,
            "similarity": 0.40,
            "threshold": 0.50,
            "similarity_threshold": 0.50
        }

        probe_res = await verify_probe_against_scraped("/tmp/probe.jpg", "https://example.com/avatar.jpg")
        assert probe_res["is_match"] is False
        assert probe_res["similarity"] == 0.40
        assert "face similarity 40%" in probe_res["warning"]
        assert "The uploaded image does not belong to this person" in probe_res["warning"]





