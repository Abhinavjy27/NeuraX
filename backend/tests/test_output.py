from app.src.output.profile_renderer import render_profile
from app.src.output.report_generator import generate_markdown_report, generate_html_report

def test_render_profile():
    profile = render_profile(
        name="test_user",
        confidence=0.85,
        platforms=["GitHub"],
        evidence={"claim": "Works at Open Source"},
        graph={"nodes": [1, 2], "links": [1]}
    )
    assert profile["identity"]["name"] == "test_user"
    assert profile["identity"]["overall_confidence"] == 0.85
    assert profile["platforms"] == ["GitHub"]
    assert profile["graph_summary"]["nodes"] == 2
    assert profile["graph_summary"]["edges"] == 1

def test_generate_markdown_report():
    profile = {
        "identity": {
            "name": "test_user",
            "overall_confidence": 0.9,
            "probe_image_url": "/api/uploads/probe_pic.jpg"
        },
        "platforms": ["GitHub"],
        "evidence": {"claim": "Works at Open Source", "source_url": "http://github.com"}
    }
    timeline = [
        {"timestamp": "2026-01-01", "event": "Created", "source": "System"}
    ]
    
    report = generate_markdown_report(profile, timeline)
    
    assert "NeuraX Intelligence Report: test_user" in report
    assert "90.0%" in report
    assert "- GitHub" in report
    assert "http://github.com" in report
    assert "2026-01-01" in report
    assert "/api/uploads/probe_pic.jpg" in report

def test_generate_html_report_includes_uploaded_query_image():
    identity = {
        "canonical_name": "Satya Nadella",
        "overall_confidence": 0.95,
        "avatar_url": "https://media.licdn.com/satya.jpg",
        "probe_image_url": "/api/uploads/test_probe.jpg",
        "probe_image_data_uri": "data:image/jpeg;base64,dGVzdA=="
    }
    profiles = [
        {"platform": "LinkedIn", "profile_url": "https://linkedin.com/in/satyanadella", "username": "satyanadella", "confidence": 0.95}
    ]
    claims = [
        {"subject": "Satya Nadella", "predicate": "works_at", "object": "Microsoft", "confidence": 0.95, "source_url": "https://microsoft.com"}
    ]
    timeline = [
        {"date": "2014", "category": "career", "event": "Became CEO of Microsoft"}
    ]
    html = generate_html_report(identity, profiles, claims, timeline)
    assert "data:image/jpeg;base64,dGVzdA==" in html
    assert "QUERY IMAGE" in html
    assert "SCRAPED WEB" in html
    assert "PROBE ATTACHED" in html

def test_generate_html_report_probe_only():
    identity = {
        "canonical_name": "Test Subject",
        "overall_confidence": 0.88,
        "probe_image_url": "/api/uploads/subject.jpg",
    }
    html = generate_html_report(identity, [], [], [])
    assert "/api/uploads/subject.jpg" in html
    assert "UPLOADED PROBE IMAGE" in html
    assert "PROBE ATTACHED" in html

def test_generate_html_report_face_match_warning():
    identity = {
        "canonical_name": "Tom Holland",
        "overall_confidence": 0.35,
        "avatar_url": "https://upload.wikimedia.org/tom_holland.jpg",
        "probe_image_url": "/api/uploads/imposter.jpg",
        "face_match_warning": "Warning: The uploaded image does not match the image scraped for Tom Holland. The image does not belong to this person.",
        "is_face_match": False
    }
    html = generate_html_report(identity, [], [], [])
    assert "Visual Identity Warning" in html
    assert "The uploaded image does not match the image scraped for Tom Holland" in html
    assert "The image does not belong to this person" in html
    assert "MISMATCH" in html
    assert "FACE MISMATCH" in html

def test_generate_markdown_report_face_match_warning():
    profile = {
        "identity": {
            "name": "Tom Holland",
            "overall_confidence": 0.35,
            "probe_image_url": "/api/uploads/imposter.jpg",
            "face_match_warning": "Warning: The uploaded image does not match the image scraped for Tom Holland. The image does not belong to this person.",
            "is_face_match": False
        },
        "platforms": ["Wikipedia"],
        "evidence": {}
    }
    report = generate_markdown_report(profile, [])
    assert "[!WARNING]" in report
    assert "The uploaded image does not match the image scraped for Tom Holland" in report
    assert "The image does not belong to this person" in report

def test_generate_html_report_wikipedia():
    identity = {
        "canonical_name": "Linus Torvalds",
        "overall_confidence": 0.95,
        "wikipedia": {
            "title": "Linus Torvalds",
            "url": "https://en.wikipedia.org/wiki/Linus_Torvalds",
            "summary": "Linus Benedict Torvalds is a Finnish and American software engineer who is the creator and lead developer of the Linux kernel.",
            "facts": [
                "Creator and lead developer of the Linux kernel since 1991",
                "Created the Git distributed version control system in 2005",
                "Born on 28 December 1969 in Helsinki, Finland"
            ]
        }
    }
    html = generate_html_report(identity, [], [], [])
    assert "Wikipedia Biographical Intelligence" in html
    assert "Linus Benedict Torvalds is a Finnish and American software engineer" in html
    assert "Creator and lead developer of the Linux kernel since 1991" in html
    assert "Created the Git distributed version control system in 2005" in html
    assert "https://en.wikipedia.org/wiki/Linus_Torvalds" in html

def test_generate_markdown_report_wikipedia():
    profile = {
        "identity": {
            "name": "Linus Torvalds",
            "overall_confidence": 0.95,
            "wikipedia": {
                "title": "Linus Torvalds",
                "url": "https://en.wikipedia.org/wiki/Linus_Torvalds",
                "summary": "Creator of Linux and Git.",
                "facts": [
                    "Creator and lead developer of the Linux kernel",
                    "Created the Git distributed version control system"
                ]
            }
        },
        "platforms": ["Wikipedia"],
        "evidence": {}
    }
    md = generate_markdown_report(profile, [])
    assert "## Wikipedia Biographical Intelligence" in md
    assert "Creator of Linux and Git." in md
    assert "- Creator and lead developer of the Linux kernel" in md
    assert "- Created the Git distributed version control system" in md
