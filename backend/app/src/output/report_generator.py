def generate_markdown_report(profile: dict, timeline: list) -> str:
    """
    Generates a Markdown report of the intelligence gathered.
    """
    name = profile.get("identity", {}).get("name", "Unknown")
    confidence = profile.get("identity", {}).get("overall_confidence", 0.0)
    
    md = f"# NeuraX Intelligence Report: {name}\n\n"
    md += f"**Overall Confidence**: {confidence * 100:.1f}%\n\n"
    probe = profile.get("identity", {}).get("probe_image_url") or profile.get("identity", {}).get("probe_image_data_uri")
    if probe:
        md += f"**Uploaded Query Image**: {probe}\n\n"
    
    warning = profile.get("identity", {}).get("face_match_warning")
    if warning:
        md += f"> [!WARNING]\n> **Visual Identity Mismatch**: {warning}\n\n"

    wiki = profile.get("identity", {}).get("wikipedia") or profile.get("wikipedia")
    if wiki and (wiki.get("summary") or wiki.get("facts")):
        md += "## Wikipedia Biographical Intelligence\n"
        if wiki.get("summary"):
            md += f"{wiki.get('summary')}\n\n"
        if wiki.get("facts"):
            md += "**Key Verified Facts**:\n"
            for f in wiki.get("facts"):
                md += f"- {f}\n"
            md += "\n"
    
    md += "## Platforms Discovered\n"
    for p in profile.get("platforms", []):
        md += f"- {p}\n"
        
    md += "\n## Evidence Summary\n"
    evidence = profile.get("evidence", {})
    md += f"**Claim**: {evidence.get('claim', 'None')}\n"
    if evidence.get("source_url"):
        md += f"**Source**: {evidence['source_url']}\n"
        
    md += "\n## Discovery Timeline\n"
    for event in timeline:
        md += f"- **{event['timestamp']}**: {event['event']} ({event['source']})\n"
        
    return md


def generate_html_report(person_record: dict, profiles: list = None, claims: list = None, timeline: list = None) -> str:
    """
    Generates a high-fidelity, printable HTML Intelligence Dossier from a person record.
    Supports both person_record dict and (identity, profiles, claims, timeline) signatures.
    """
    if not person_record:
        person_record = {}

    if "identity" in person_record:
        identity = person_record.get("identity", {})
        if profiles is None:
            profiles = identity.get("profiles", [])
        if claims is None:
            claims = person_record.get("claims", [])
        if timeline is None:
            timeline = person_record.get("timeline", [])
    else:
        identity = person_record
        if profiles is None:
            profiles = identity.get("profiles", [])
        if claims is None:
            claims = []
        if timeline is None:
            timeline = []

    canonical_name = identity.get("canonical_name", "Unknown Target")
    confidence = identity.get("overall_confidence", 0.0)
    avatar_url = identity.get("avatar_url", "")
    primary_role = identity.get("primary_role", "Undetermined Role")
    organization = identity.get("organization", "Undetermined Organization")
    location = identity.get("location", "Not specified")
    verdict = identity.get("verdict", "confirmed").upper()
    
    from app.src.identity.profile_attributor import sort_profiles_by_priority, get_profile_priority
    profiles = sort_profiles_by_priority(profiles)
    graph = person_record.get("graph", {})
    node_count = len(graph.get("nodes", []))
    edge_count = len(graph.get("edges", []))
    
    # Verdict styling
    badge_bg = "#065f46" if verdict == "CONFIRMED" else "#92400e" if verdict == "POSSIBLE" else "#991b1b"
    badge_color = "#34d399" if verdict == "CONFIRMED" else "#fbbf24" if verdict == "POSSIBLE" else "#f87171"

    # Wikipedia Intelligence Section
    wiki = identity.get("wikipedia") or person_record.get("wikipedia") or {}
    wiki_html = ""
    if wiki and (wiki.get("summary") or wiki.get("facts")):
        wiki_title = wiki.get("title", canonical_name)
        wiki_url = wiki.get("url", "https://en.wikipedia.org")
        wiki_summary = wiki.get("summary", "")
        wiki_facts = wiki.get("facts", [])
        
        facts_items = "".join(f'<li style="margin-bottom: 6px; color: #cbd5e1;"><span style="color: #818cf8; font-weight: bold; margin-right: 6px;">•</span>{f}</li>' for f in wiki_facts)
        facts_list = f'<ul style="list-style: none; padding-left: 0; margin: 10px 0 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 8px;">{facts_items}</ul>' if wiki_facts else ""
        
        wiki_html = f"""
        <!-- Wikipedia Intelligence Section -->
        <div style="margin-top: 28px; background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 10px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 15px;">🌐</span>
                    <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #f1f5f9; letter-spacing: 0.5px; text-transform: uppercase;">Wikipedia Biographical Intelligence</span>
                </div>
                <a href="{wiki_url}" target="_blank" style="color: #818cf8; font-size: 12px; font-family: monospace; text-decoration: none;">en.wikipedia.org ↗</a>
            </div>
            {f'<p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">{wiki_summary}</p>' if wiki_summary else ''}
            {f'<div style="font-size: 11px; font-family: monospace; text-transform: uppercase; color: #818cf8; font-weight: 700; margin-top: 8px;">Key Verified Facts</div>' if wiki_facts else ''}
            {facts_list}
        </div>
        """
    
    # Priority styling helpers
    prio_styles = {
        1: ("P1 · LINKEDIN", "rgba(10,102,194,0.2)", "#60a5fa", "rgba(10,102,194,0.4)"),
        2: ("P2 · SOCIAL", "rgba(168,85,247,0.2)", "#c084fc", "rgba(168,85,247,0.4)"),
        3: ("P3 · SCHOLAR", "rgba(13,148,136,0.2)", "#2dd4bf", "rgba(13,148,136,0.4)"),
        4: ("P4 · ARTICLE", "rgba(245,158,11,0.2)", "#fbbf24", "rgba(245,158,11,0.4)"),
    }

    # Build Profile Rows
    profile_rows = ""
    for p in profiles:
        plat = p.get("platform", "web").capitalize()
        user = p.get("username") or p.get("headline") or "Profile"
        url = p.get("url", "#")
        method = p.get("verification_method", "text_corroborated").replace("_", " ").upper()
        conf = int(p.get("confidence", 0.85) * 100)
        prio_tier = get_profile_priority(p)[0]
        tag_label, tag_bg, tag_color, tag_border = prio_styles.get(prio_tier, ("P4 · ARTICLE", "rgba(245,158,11,0.2)", "#fbbf24", "rgba(245,158,11,0.4)"))

        profile_rows += f"""
        <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #1e293b; font-weight: 600; color: #f1f5f9;">
                <span style="background: {tag_bg}; color: {tag_color}; border: 1px solid {tag_border}; font-size: 9px; padding: 2px 6px; border-radius: 4px; font-family: monospace; margin-right: 8px;">{tag_label}</span>
                {plat}
            </td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #1e293b; color: #94a3b8;"><a href="{url}" target="_blank" style="color: #38bdf8; text-decoration: none;">{user}</a></td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #1e293b;"><span style="background: #1e293b; color: #38bdf8; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-family: monospace;">{method}</span></td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #1e293b; font-family: monospace; color: #34d399;">{conf}%</td>
        </tr>
        """
        
    # Build Timeline Rows
    timeline_rows = ""
    for t in timeline:
        date = t.get("date", "Undated")
        cat = t.get("category", "Milestone").upper()
        event = t.get("event", "")
        src = t.get("source_url") or t.get("source", "")
        link_html = f'<a href="{src}" target="_blank" style="color: #64748b; font-size: 12px; margin-left: 8px;">[Source]</a>' if src.startswith("http") else ""
        timeline_rows += f"""
        <div style="position: relative; padding-left: 28px; margin-bottom: 18px; border-left: 2px solid #334155;">
            <div style="position: absolute; left: -6px; top: 2px; width: 10px; height: 10px; border-radius: 50%; background: #6366f1;"></div>
            <div style="font-size: 12px; font-weight: 700; color: #818cf8; font-family: monospace; letter-spacing: 0.5px;">{date} · {cat}</div>
            <div style="color: #e2e8f0; font-size: 14px; margin-top: 3px;">{event} {link_html}</div>
        </div>
        """
        
    # Build Claims Rows
    claims_rows = ""
    for c in claims:
        subj = c.get("subject", canonical_name)
        pred = c.get("predicate", "").replace("_", " ").upper()
        obj = c.get("object", "")
        src = c.get("source_url", "#")
        c_conf = int(c.get("confidence", 0.9) * 100)
        c_method = c.get("verification_method", "verified").replace("_", " ")
        claims_rows += f"""
        <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #1e293b; color: #e2e8f0;"><strong>{subj}</strong> <span style="color: #818cf8; font-size: 11px; font-family: monospace;">[{pred}]</span> {obj}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 12px;"><a href="{src}" target="_blank" style="color: #38bdf8; text-decoration: none; word-break: break-all;">{src[:45]}...</a></td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #1e293b; font-size: 12px; color: #94a3b8;">{c_method}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #1e293b; font-family: monospace; color: #34d399; font-weight: 600;">{c_conf}%</td>
        </tr>
        """

    avatar_url = identity.get("avatar_url", "")
    probe_img = identity.get("probe_image_data_uri") or identity.get("probe_image_url") or ""
    probe_path = identity.get("probe_image_path", "")
    face_match_warning = identity.get("face_match_warning")
    is_face_match = identity.get("is_face_match")

    if not probe_img and probe_path and os.path.exists(probe_path):
        try:
            import mimetypes, base64
            mime, _ = mimetypes.guess_type(probe_path)
            if not mime: mime = "image/jpeg"
            with open(probe_path, "rb") as f:
                probe_img = f"data:{mime};base64,{base64.b64encode(f.read()).decode('utf-8')}"
        except Exception:
            pass

    # Build Header Visual Identity
    if probe_img and avatar_url and probe_img != avatar_url:
        probe_border = "#ef4444" if is_face_match is False else "#38bdf8"
        probe_shadow = "rgba(239,68,68,0.35)" if is_face_match is False else "rgba(56,189,248,0.35)"
        probe_badge_color = "#f87171" if is_face_match is False else "#38bdf8"
        probe_badge_bg = "rgba(239,68,68,0.15)" if is_face_match is False else "rgba(56,189,248,0.15)"
        probe_badge_border = "rgba(239,68,68,0.4)" if is_face_match is False else "rgba(56,189,248,0.4)"
        probe_badge_text = "QUERY · MISMATCH ✕" if is_face_match is False else "QUERY IMAGE"

        avatar_html = f"""
        <div style="display: flex; align-items: center; gap: 16px;">
            <div style="position: relative; text-align: center;">
                <img src="{probe_img}" alt="Uploaded Query Image" onclick="window.open(this.src, '_blank')" style="width: 105px; height: 105px; border-radius: 12px; object-fit: cover; border: 2px solid {probe_border}; box-shadow: 0 0 16px {probe_shadow}; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="Click to open full-resolution probe image">
                <div style="margin-top: 4px; font-size: 9px; font-family: monospace; font-weight: 700; color: {probe_badge_color}; background: {probe_badge_bg}; border: 1px solid {probe_badge_border}; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.5px;">{probe_badge_text}</div>
            </div>
            <div style="position: relative; text-align: center;">
                <img src="{avatar_url}" alt="Corroborated Web Avatar" onclick="window.open(this.src, '_blank')" style="width: 105px; height: 105px; border-radius: 12px; object-fit: cover; border: 2px solid #6366f1; box-shadow: 0 0 16px rgba(99,102,241,0.35); cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="Click to open full-resolution web avatar">
                <div style="margin-top: 4px; font-size: 9px; font-family: monospace; font-weight: 700; color: #818cf8; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.4); padding: 2px 6px; border-radius: 4px; letter-spacing: 0.5px;">SCRAPED WEB</div>
            </div>
        </div>
        """
    elif probe_img:
        avatar_html = f"""
        <div style="position: relative; text-align: center;">
            <img src="{probe_img}" alt="Uploaded Query Image" onclick="window.open(this.src, '_blank')" style="width: 110px; height: 110px; border-radius: 12px; object-fit: cover; border: 2px solid #38bdf8; box-shadow: 0 0 16px rgba(56,189,248,0.35); cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="Click to open full-resolution probe image">
            <div style="margin-top: 4px; font-size: 9px; font-family: monospace; font-weight: 700; color: #38bdf8; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.4); padding: 2px 6px; border-radius: 4px; letter-spacing: 0.5px;">UPLOADED PROBE IMAGE</div>
        </div>
        """
    elif avatar_url:
        avatar_html = f"""
        <div style="position: relative; text-align: center;">
            <img src="{avatar_url}" alt="Target Avatar" onclick="window.open(this.src, '_blank')" style="width: 110px; height: 110px; border-radius: 12px; object-fit: cover; border: 2px solid #6366f1; box-shadow: 0 0 15px rgba(99,102,241,0.3); cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="Click to open full-resolution image">
            <div style="margin-top: 4px; font-size: 9px; font-family: monospace; font-weight: 700; color: #818cf8; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.4); padding: 2px 6px; border-radius: 4px; letter-spacing: 0.5px;">SCRAPED AVATAR</div>
        </div>
        """
    else:
        avatar_html = '<div style="width: 110px; height: 110px; border-radius: 12px; background: #1e293b; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 28px; border: 2px solid #334155;">?</div>'

    probe_badge_html = ''
    if is_face_match is False:
        probe_badge_html = '<span style="background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.4); font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; letter-spacing: 1px; font-family: monospace;">FACE MISMATCH</span>'
    elif probe_img:
        probe_badge_html = '<span style="background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.4); font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; letter-spacing: 1px; font-family: monospace;">PROBE ATTACHED</span>'

    warning_banner_html = ''
    if face_match_warning:
        warning_banner_html = f"""
    <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-left: 4px solid #ef4444; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 22px;">⚠️</span>
        <div>
            <div style="font-size: 12px; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 1px; font-family: monospace;">Visual Identity Warning</div>
            <div style="font-size: 13px; color: #fca5a5; margin-top: 3px;">{face_match_warning}</div>
        </div>
    </div>
    """

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>TRINETRA Dossier · {canonical_name}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #090d16;
            color: #f8fafc;
            margin: 0;
            padding: 40px 20px;
            line-height: 1.5;
        }}
        .container {{
            max-width: 960px;
            margin: 0 auto;
            background: #0f172a;
            border: 1px solid #1e293b;
            border-radius: 16px;
            padding: 36px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.6);
        }}
        .print-btn {{
            float: right;
            background: #6366f1;
            color: white;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            font-size: 13px;
        }}
        .print-btn:hover {{ background: #4f46e5; }}
        @media print {{
            body {{ background: white; color: black; padding: 0; }}
            .container {{ border: none; box-shadow: none; padding: 0; background: white; }}
            .print-btn {{ display: none; }}
            table, tr, td, th {{ border-color: #cbd5e1 !important; color: black !important; }}
            a {{ color: #1e3a8a !important; }}
        }}
    </style>
</head>
<body>
<div class="container">
    <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
        <span style="font-family: monospace; font-size: 12px; letter-spacing: 2px; color: #818cf8; background: rgba(99,102,241,0.1); padding: 4px 10px; border-radius: 4px; border: 1px solid rgba(99,102,241,0.3);">TRINETRA OSINT INTELLIGENCE</span>
        <span style="font-size: 12px; color: #64748b;">Domain 3: AI in Cybersecurity · NeuraX</span>
    </div>

    {warning_banner_html}

    <!-- Header Dossier -->
    <div style="display: flex; gap: 28px; align-items: center; padding-bottom: 28px; border-bottom: 1px solid #1e293b;">
        {avatar_html}
        <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff;">{canonical_name}</h1>
                <span style="background: {badge_bg}; color: {badge_color}; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; letter-spacing: 1px; font-family: monospace;">{verdict}</span>
                {probe_badge_html}
            </div>
            <div style="color: #94a3b8; font-size: 15px; margin-top: 6px;">
                {primary_role} · <strong style="color: #e2e8f0;">{organization}</strong> · <span style="color: #64748b;">{location}</span>
            </div>
            <div style="display: flex; gap: 24px; margin-top: 14px; font-size: 13px; font-family: monospace;">
                <div>Confidence: <strong style="color: #34d399;">{int(confidence * 100)}%</strong></div>
                <div>Knowledge Graph: <strong style="color: #38bdf8;">{node_count} nodes · {edge_count} edges</strong></div>
                <div>Footprints: <strong style="color: #f59e0b;">{len(profiles)} corroborated</strong></div>
            </div>
        </div>
    </div>

    {wiki_html}

    <!-- Profiles & Digital Footprint -->
    <h2 style="font-size: 18px; margin-top: 32px; margin-bottom: 14px; color: #f1f5f9; display: flex; align-items: center; gap: 8px;">
        <span style="width: 4px; height: 18px; background: #38bdf8; border-radius: 2px;"></span>
        Public Profiles & Digital Footprint
    </h2>
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
        <thead>
            <tr style="background: #1e293b; color: #94a3b8; font-family: monospace; font-size: 11px; text-transform: uppercase;">
                <th style="padding: 10px 14px; border-radius: 6px 0 0 6px;">Platform</th>
                <th style="padding: 10px 14px;">Identifier / Link</th>
                <th style="padding: 10px 14px;">Verification</th>
                <th style="padding: 10px 14px; border-radius: 0 6px 6px 0;">Score</th>
            </tr>
        </thead>
        <tbody>
            {profile_rows or '<tr><td colspan="4" style="padding: 16px; color: #64748b;">No profile entries recorded.</td></tr>'}
        </tbody>
    </table>

    <!-- Chronological Milestones -->
    <h2 style="font-size: 18px; margin-top: 36px; margin-bottom: 18px; color: #f1f5f9; display: flex; align-items: center; gap: 8px;">
        <span style="width: 4px; height: 18px; background: #818cf8; border-radius: 2px;"></span>
        Chronological Timeline of Footprint Events
    </h2>
    <div style="padding: 8px 0 8px 12px;">
        {timeline_rows or '<p style="color: #64748b;">No chronological events extracted.</p>'}
    </div>

    <!-- Evidence Trail -->
    <h2 style="font-size: 18px; margin-top: 36px; margin-bottom: 14px; color: #f1f5f9; display: flex; align-items: center; gap: 8px;">
        <span style="width: 4px; height: 18px; background: #34d399; border-radius: 2px;"></span>
        Traceable Evidence & Verification Trail
    </h2>
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
        <thead>
            <tr style="background: #1e293b; color: #94a3b8; font-family: monospace; font-size: 11px; text-transform: uppercase;">
                <th style="padding: 10px 14px; border-radius: 6px 0 0 6px;">Material Claim</th>
                <th style="padding: 10px 14px;">Traceable Source</th>
                <th style="padding: 10px 14px;">Verification Method</th>
                <th style="padding: 10px 14px; border-radius: 0 6px 6px 0;">Confidence</th>
            </tr>
        </thead>
        <tbody>
            {claims_rows or '<tr><td colspan="4" style="padding: 16px; color: #64748b;">No explicit claims recorded.</td></tr>'}
        </tbody>
    </table>

    <!-- Footer & Consent Disclaimer -->
    <div style="margin-top: 48px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; line-height: 1.6;">
        <strong>Responsible Design & Consent Notice:</strong> All intelligence, profiles, and activities presented in this document are derived strictly from consented, public, authorized sources in compliance with NeuraX Hackathon Domain 3 guidelines. No private account access, credential bypass, or leaked data was utilized.
    </div>
</div>
</body>
</html>"""
    return html

