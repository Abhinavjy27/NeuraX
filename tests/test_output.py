from app.src.output.profile_renderer import render_profile
from app.src.output.report_generator import generate_markdown_report

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
        "identity": {"name": "test_user", "overall_confidence": 0.9},
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
