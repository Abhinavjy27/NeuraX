"""
NeuraX — Python FastAPI AI Engine
Serves the intelligence pipeline + SSE streaming endpoint.
"""

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
import asyncio
import uuid
import json
import os
import logging
import mimetypes
import base64
from typing import AsyncGenerator, Optional
import redis.asyncio as aioredis

from app.models import CandidateProfile, CandidateScores, Profile, Person, Claim, Evidence, Entity

logger = logging.getLogger(__name__)

app = FastAPI(
    title="NeuraX AI Engine",
    description="Digital Identity Intelligence — AI Pipeline",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis client (persistent store — survives container restarts)
REDIS_URL = os.getenv("REDIS_URL", "redis://neurax-redis:6379")
redis_client: aioredis.Redis = None

@app.on_event("startup")
async def startup():
    global redis_client
    redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
    logger.info(f"Connected to Redis at {REDIS_URL}")

@app.on_event("shutdown")
async def shutdown():
    if redis_client:
        await redis_client.aclose()

# Storage layer — Redis with transparent in-memory fallback for local execution and tests
JOB_TTL = 86400
PERSON_TTL = 86400

job_store: dict[str, dict] = {}
person_store: dict[str, dict] = {}

async def job_get(job_id: str) -> dict | None:
    if redis_client is not None:
        try:
            raw = await redis_client.get(f"job:{job_id}")
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.debug(f"Redis get failed: {e}")
    return job_store.get(job_id)

async def job_set(job_id: str, data: dict):
    job_store[job_id] = data
    if redis_client is not None:
        try:
            await redis_client.setex(f"job:{job_id}", JOB_TTL, json.dumps(data))
        except Exception as e:
            logger.debug(f"Redis set failed: {e}")

async def person_get(person_id: str) -> dict | None:
    if redis_client is not None:
        try:
            raw = await redis_client.get(f"person:{person_id}")
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.debug(f"Redis get failed: {e}")
    return person_store.get(person_id)

async def person_set(person_id: str, data: dict):
    person_store[person_id] = data
    if redis_client is not None:
        try:
            await redis_client.setex(f"person:{person_id}", PERSON_TTL, json.dumps(data))
        except Exception as e:
            logger.debug(f"Redis set failed: {e}")

# SSE queues stay in-memory (per-process, per-request lifetime only)
job_streams: dict[str, asyncio.Queue] = {}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

class AnalyzeRequest(BaseModel):
    job_id: str
    image_path: str
    context: str = ""

class PipelineEvent(BaseModel):
    type: str
    step: str
    message: str
    data: dict = {}
    confidence: float = 0.0

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "neurax-ai-engine"}

@app.post("/api/analyze")
async def analyze(
    image: UploadFile = File(None),
    context: str = Form(""),
    consent_confirmed: str = Form("false"),
    background_tasks: BackgroundTasks = None
):
    if consent_confirmed.lower() != "true":
        raise HTTPException(status_code=400, detail="BAD_INPUT: Consent required")
    if not context:
        raise HTTPException(status_code=400, detail="BAD_INPUT: Context seed required")
        
    job_id = str(uuid.uuid4())
    await job_set(job_id, {"status": "processing", "candidates": []})
    job_streams[job_id] = asyncio.Queue()
    
    # Save uploaded file temporarily
    image_path = ""
    if image:
        os.makedirs("data/input", exist_ok=True)
        image_path = f"data/input/{job_id}_{image.filename}"
        with open(image_path, "wb") as f:
            f.write(await image.read())

    background_tasks.add_task(run_pipeline, job_id, image_path, context)

    return {"job_id": job_id, "status": "processing"}

@app.get("/api/stream/{job_id}")
async def stream(job_id: str):
    if job_id not in job_streams:
        job_streams[job_id] = asyncio.Queue()
    return EventSourceResponse(event_generator(job_id))

@app.get("/api/candidates/{job_id}")
async def get_candidates(job_id: str):
    job = await job_get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return {
        "job_id": job_id,
        "status": job["status"],
        "candidates": job.get("candidates", [])
    }

@app.get("/api/identity/{person_id}")
async def get_identity(person_id: str):
    person = await person_get(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return person["identity"]

@app.get("/api/claims/{person_id}")
async def get_claims(person_id: str):
    person = await person_get(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return person.get("claims", [])

@app.get("/api/timeline/{person_id}")
async def get_timeline(person_id: str):
    person = await person_get(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return person.get("timeline", [])

@app.get("/api/graph/{person_id}")
async def get_graph(person_id: str):
    person = await person_get(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return person.get("graph", {"nodes": [], "edges": []})

@app.get("/api/report/{person_id}", response_class=HTMLResponse)
async def get_report(person_id: str):
    person = await person_get(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    from app.src.output.report_generator import generate_html_report
    return HTMLResponse(content=generate_html_report(person))

def get_image_data_uri(image_path: str) -> Optional[str]:
    """Encodes a local image as a base64 data URI for self-contained HTML reports."""
    if not image_path or not os.path.exists(image_path):
        return None
    try:
        mime, _ = mimetypes.guess_type(image_path)
        if not mime:
            mime = "image/jpeg"
        with open(image_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
        return f"data:{mime};base64,{encoded}"
    except Exception as e:
        logger.warning(f"Could not encode image to data URI: {e}")
        return None

@app.get("/api/uploads/{filename}")
async def get_uploaded_image(filename: str):
    """Serves uploaded probe images."""
    clean_name = os.path.basename(filename)
    filepath = os.path.join("data/input", clean_name)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Uploaded file not found")
    return FileResponse(filepath)

class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat/{person_id}")
async def chat_with_graph(person_id: str, request: ChatRequest):
    person = await person_get(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
        
    from openai import AsyncOpenAI
    import os
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    # === LAYER 1: KEYWORD EXTRACTION ===
    kwd_prompt = f"Extract 1 to 4 core OSINT keywords from this question to search a vector database for information about {person.get('identity', {}).get('canonical_name', 'the subject')}. Respond ONLY with the keywords space-separated, nothing else."
    try:
        kwd_resp = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": f"{kwd_prompt}\nQuestion: {request.message}"}],
            temperature=0.1,
            max_tokens=20
        )
        search_query = kwd_resp.choices[0].message.content.strip()
    except Exception as e:
        search_query = request.message

    # === LAYER 2: VECTOR RETRIEVAL ===
    from app.src.vectordb.store import search_text_chunks
    retrieved_chunks = await search_text_chunks(search_query, person_id, n_results=5)
    
    rag_context = ""
    if retrieved_chunks:
        rag_context = "\n\n---\n\n".join([c.get("metadata", {}).get("text", "") for c in retrieved_chunks])
    else:
        rag_context = "No specific intelligence footprint matched the query."
        
    subject_name = person.get("identity", {}).get("canonical_name", "the subject")

    # Structured Dossier Summary (always grounded regardless of vector search distance)
    summary_context = f"Subject: {subject_name}\n"
    if person.get("timeline"):
        summary_context += "Chronological Milestones & Projects:\n"
        for t in person.get("timeline", []):
            summary_context += f"- [{t.get('date', '?')}] {t.get('event', '?')}\n"
    if person.get("claims"):
        summary_context += "Verified Claims:\n"
        for c in person.get("claims", []):
            summary_context += f"- {c.get('predicate')}: {c.get('object')}\n"

    # === LAYER 3: SYNTHESIZED GENERATION ===
    system_prompt = f"""You are a highly analytical OSINT Intelligence Agent for NeuraX.
Your task is to answer the user's question about {subject_name} using the extracted intelligence dossier, chronological milestones, and retrieved knowledge graph chunks provided below.

=== STRUCTURED DOSSIER MILESTONES & CLAIMS ===
{summary_context}

=== RETRIEVED INTELLIGENCE CONTEXT ===
{rag_context}
======================================

RULES:
1. Ground your answer in the provided dossier milestones, verified claims, Wikipedia biography, and intelligence chunks.
2. You can synthesize and infer answers from the chronological timeline (e.g. latest projects, recent movies/films, employment history, publications).
3. If the user asks about recent or latest works (such as latest movie, recent job, latest publication), inspect the chronological milestones to identify the most recent relevant entry.
4. Only state "I do not have enough evidence in the current intelligence graph to answer that." if the provided context is genuinely completely devoid of any relevant information.
5. Be concise, direct, and analytical."""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ],
            temperature=0.3
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def emit(job_id: str, event: PipelineEvent):
    print(f"[{job_id}] {event.step.upper()}: {event.message}")
    if job_id in job_streams:
        await job_streams[job_id].put(event.model_dump())

async def event_generator(job_id: str) -> AsyncGenerator:
    queue = job_streams[job_id]
    while True:
        event = await queue.get()
        if event is None:
            break
        yield {"data": json.dumps(event)}

async def run_pipeline(job_id: str, image_path: str, context: str):
    person_id = f"person_{job_id}"
    try:
        await emit(job_id, PipelineEvent(type="PROGRESS", step="identity", message="🔍 Extracting face embedding..."))
        from app.src.identity.face_embedder import extract_embedding
        embedding = await asyncio.to_thread(extract_embedding, image_path) if image_path else None
            
        if embedding:
            await emit(job_id, PipelineEvent(type="FINDING", step="identity", message=f"✅ Face embedding extracted"))

        from app.src.identity.nlp_extractor import parse_target_prompt
        from app.src.identity.username_generator import generate_usernames
        
        parsed_target = await parse_target_prompt(context) if context else {
            "candidate_name": "torvalds",
            "role": None,
            "organization": None,
            "location": None,
            "search_keywords": [],
            "enriched_search_query": "torvalds",
            "raw_context": context
        }
        candidate_name = parsed_target.get("candidate_name") or "torvalds"
        enriched_search_query = parsed_target.get("enriched_search_query") or candidate_name
        org_keyword = parsed_target.get("organization")
        role_keyword = parsed_target.get("role")
        target_keywords = parsed_target.get("search_keywords", [])
        aliases = parsed_target.get("aliases", [])

        # Emit informative target identification finding
        finding_msg = f"🎯 Target identified: {candidate_name}"
        if aliases:
            finding_msg += f" (aliases: {', '.join(aliases)})"
        elif org_keyword and role_keyword:
            finding_msg += f" ({role_keyword} at {org_keyword})"
        elif org_keyword:
            finding_msg += f" (affiliated with {org_keyword})"
        elif role_keyword:
            finding_msg += f" ({role_keyword})"
        await emit(job_id, PipelineEvent(type="FINDING", step="identity", message=finding_msg))

        candidate_usernames = generate_usernames(candidate_name, aliases=aliases, max_variations=30)
        candidate_pool_aliases = list(dict.fromkeys((aliases or []) + candidate_usernames))

        from app.src.scraping.linkedin_scraper import search_linkedin_profile
        from app.src.scraping.search_dorker import search_news_and_web, search_wikipedia
        from app.src.scraping.scholar_search import search_google_scholar
        from app.src.scraping.github_client import get_github_profile
        from app.src.scraping.wikidata_client import get_wikidata_socials
        from app.src.scraping.username_checker import check_all_platforms

        # Determine base username
        base_username = candidate_usernames[0] if candidate_usernames else candidate_name.lower().replace(" ", "")

        await emit(job_id, PipelineEvent(type="PROGRESS", step="scraping", message="🌐 Querying Wikipedia, GitHub, Scholar, OSINT footprints and Wikidata..."))
        
        # Concurrently gather data with enriched queries and candidate pool
        wiki_task = asyncio.create_task(search_wikipedia(candidate_name))
        github_task = asyncio.create_task(get_github_profile(candidate_name, is_email=False, aliases=candidate_pool_aliases))
        linkedin_task = asyncio.create_task(search_linkedin_profile(candidate_name, context_keyword=org_keyword))
        news_task = asyncio.create_task(search_news_and_web(candidate_name, context_query=enriched_search_query, aliases=aliases))
        wikidata_task = asyncio.create_task(get_wikidata_socials(candidate_name))
        social_task = asyncio.create_task(check_all_platforms(base_username))
        scholar_task = asyncio.create_task(search_google_scholar(candidate_name, organization=org_keyword, aliases=aliases))
        
        wiki_data, github_data, linkedin_data, news_data, wikidata_socials, social_data, scholar_data = await asyncio.gather(
            wiki_task, github_task, linkedin_task, news_task, wikidata_task, social_task, scholar_task, return_exceptions=True
        )

        if isinstance(wiki_data, Exception): wiki_data = None
        if isinstance(github_data, Exception): github_data = None
        if isinstance(linkedin_data, Exception): linkedin_data = None
        if isinstance(news_data, Exception): news_data = None
        if isinstance(wikidata_socials, Exception): wikidata_socials = {}
        if isinstance(social_data, Exception): social_data = {}
        if isinstance(scholar_data, Exception): scholar_data = None

        if not isinstance(social_data, dict):
            social_data = {}
        if isinstance(wikidata_socials, dict):
            social_data.update(wikidata_socials)

        if wiki_data and wiki_data.get("summary"):
            short_summary = wiki_data.get("summary", "")[:120]
            await emit(job_id, PipelineEvent(
                type="FINDING",
                step="scraping",
                message=f"📖 Wikipedia: Discovered verified biographical entry for {candidate_name} — {short_summary}..."
            ))
            
        # (Hardcoded fallbacks removed - delegating all scraping to Playwright OSINT)
        # Identity Scoring
        from app.src.correlation.identity_scorer import calculate_identity_score
        
        def _extract_handle(url: str, default: str) -> str:
            try:
                import urllib.parse
                parts = [p for p in urllib.parse.urlparse(url).path.strip("/").split("/") if p]
                if parts:
                    if parts[0] in ("in", "user", "u", "channel", "c", "p", "reel") and len(parts) > 1:
                        return parts[1]
                    return parts[0]
            except Exception:
                pass
            return default

        # Analyze context vs found data for simple heuristics
        name_score = 0.9 if candidate_name.lower() in context.lower() else 0.5
        # Build profiles list FIRST
        profiles = []
        if github_data:
            gh_username = github_data.get("username") or github_data.get("login", "")
            if gh_username:
                profiles.append({"platform": "github", "username": gh_username, "title": f"GitHub: {gh_username}", "url": f"https://github.com/{gh_username}", "confidence": 0.9})
        if linkedin_data and linkedin_data.get("url"):
            li_handle = _extract_handle(linkedin_data["url"], candidate_name)
            li_prof = {
                "platform": "linkedin",
                "username": li_handle,
                "title": linkedin_data.get("title") or f"LinkedIn: {candidate_name}",
                "url": linkedin_data["url"],
                "snippet": linkedin_data.get("snippet", ""),
                "confidence": 0.85
            }
            if linkedin_data.get("photo_url"):
                li_prof["photo_url"] = linkedin_data["photo_url"]
            profiles.append(li_prof)
        if wiki_data and wiki_data.get("url"):
            profiles.append({"platform": "wikipedia", "username": candidate_name, "title": f"Wikipedia: {candidate_name}", "url": wiki_data["url"], "confidence": 0.95})
        
        if social_data:
            for platform, url in social_data.items():
                handle = _extract_handle(url, base_username)
                profiles.append({"platform": platform.lower(), "username": handle, "title": f"{platform.capitalize()}: @{handle}", "url": url, "confidence": 0.95, "pre_verified": True})

        if scholar_data and isinstance(scholar_data, dict) and scholar_data.get("url"):
            profiles.append({
                "platform": "scholar",
                "username": scholar_data.get("name", candidate_name),
                "title": scholar_data.get("title", f"Scholar: {candidate_name}"),
                "url": scholar_data["url"],
                "snippet": scholar_data.get("snippet", ""),
                "confidence": 0.85
            })

        if news_data:
            # Inject deep footprint sites into profiles for LLM verification, deduplicating URLs
            seen_profile_urls = {p.get("url", "").lower().rstrip("/") for p in profiles if p.get("url")}
            for item in news_data.get("news", []):
                u_norm = item.get("url", "").lower().rstrip("/")
                if u_norm in seen_profile_urls:
                    continue
                seen_profile_urls.add(u_norm)
                profiles.append({
                    "platform": "news",
                    "username": candidate_name,
                    "title": item.get("title", "News Mention"),
                    "url": item["url"],
                    "snippet": item.get("snippet", ""),
                    "confidence": 0.6
                })
            for item in news_data.get("web", []):
                u_norm = item.get("url", "").lower().rstrip("/")
                if u_norm in seen_profile_urls:
                    continue
                seen_profile_urls.add(u_norm)
                url = item["url"].lower()
                plat = "web"
                if "scholar.google" in url or "semanticscholar.org" in url:
                    plat = "scholar"
                elif "academia.edu" in url:
                    plat = "academia"
                elif "researchgate.net" in url:
                    plat = "scholar"
                elif "instagram.com" in url:
                    plat = "instagram"
                elif "twitter.com" in url or "x.com" in url:
                    plat = "twitter"
                elif "tiktok.com" in url:
                    plat = "tiktok"
                elif "youtube.com" in url:
                    plat = "youtube"
                elif "reddit.com" in url:
                    plat = "reddit"
                elif "facebook.com" in url:
                    plat = "facebook"
                elif "linkedin.com" in url:
                    plat = "linkedin"
                elif "github.com" in url:
                    plat = "github"
                
                handle = _extract_handle(item["url"], candidate_name)
                title = item.get("title", "")
                profiles.append({
                    "platform": plat,
                    "username": handle,
                    "title": title,
                    "url": item["url"],
                    "snippet": item.get("snippet", ""),
                    "confidence": 0.7
                })

        # ── Face Cross-Verification ──────────────────────────────────────────
        # 1. ALWAYS run text attribution first to filter out obviously wrong profiles
        if profiles:
            await emit(job_id, PipelineEvent(type="PROGRESS", step="identity", message="📝 Attributing profiles via context matching…"))
            from app.src.identity.profile_attributor import text_attribute_profiles
            profiles = await text_attribute_profiles(context, candidate_name, profiles, aliases=candidate_pool_aliases)
            
            confirmed_text = sum(1 for p in profiles if p.get("text_attribution") == "CONFIRMED")
            possible_text  = sum(1 for p in profiles if p.get("text_attribution") == "POSSIBLE")
            await emit(job_id, PipelineEvent(
                type="FINDING", step="identity",
                message=f"✅ Text attribution complete — {confirmed_text} confirmed, {possible_text} possible, {len(profiles)} total"
            ))

            # Sync selected LinkedIn profile back to linkedin_data (ensuring downstream avatar/KG uses the context-matched profile)
            selected_li = next((p for p in profiles if p.get("platform") == "linkedin"), None)
            if selected_li:
                linkedin_data = {
                    "name": candidate_name,
                    "url": selected_li.get("url"),
                    "title": selected_li.get("title", ""),
                    "snippet": selected_li.get("snippet", ""),
                    "photo_url": selected_li.get("photo_url"),
                    "text_attribution": selected_li.get("text_attribution", "CONFIRMED")
                }
                if selected_li.get("attribution_reason"):
                    await emit(job_id, PipelineEvent(
                        type="FINDING", step="identity",
                        message=f"🎯 Selected LinkedIn: {selected_li['url']} ({selected_li['attribution_reason']})"
                    ))

        # 2. If the user uploaded a probe image, run face verification on the remaining profiles
        if image_path and profiles:
            await emit(job_id, PipelineEvent(
                type="PROGRESS",
                step="identity",
                message="🔎 Cross-verifying photos across discovered profiles (LinkedIn, Instagram, Twitter/X, Facebook, YouTube, TikTok, GitHub) against probe image…"
            ))
            from app.src.identity.face_cross_verifier import cross_verify_profiles

            async def _emit_face_finding(msg: str):
                await emit(job_id, PipelineEvent(type="FINDING", step="identity", message=msg))

            profiles = await cross_verify_profiles(
                image_path,
                profiles,
                {
                    "linkedin": linkedin_data,
                    "github": github_data,
                    "wikipedia": wiki_data,
                    "social_media": social_data,
                },
                emit_callback=_emit_face_finding
            )
            verified_count = sum(1 for p in profiles if p.get("face_verified") is True)
            
            # STRICT MODE: If an image was provided, any profile that doesn't have a CONFIRMED face or CONFIRMED text should be dropped.
            # If face_verified is None (no photo), only keep it if text_attribution is CONFIRMED or POSSIBLE.
            filtered_profiles = []
            for p in profiles:
                if p.get("face_verified") is True:
                    filtered_profiles.append(p)
                elif p.get("face_verified") is None and p.get("text_attribution") in ("CONFIRMED", "POSSIBLE"):
                    filtered_profiles.append(p)
                elif p.get("face_verified") is False:
                    # Keep if confirmed text attribution so user sees it in dossier with mismatch indicator
                    if p.get("text_attribution") == "CONFIRMED":
                        filtered_profiles.append(p)
            profiles = filtered_profiles

            await emit(job_id, PipelineEvent(
                type="FINDING", step="identity",
                message=f"✅ Visual cross-verification complete across all platforms — {verified_count}/{len(profiles)} matched"
            ))

        # Real face similarity score (or None if no image)
        face_match_scores = [p.get("face_confidence") for p in profiles if p.get("face_verified") is True]
        image_score = (sum(face_match_scores) / len(face_match_scores)) if face_match_scores else (0.75 if embedding else None)
        # Check if organization or context keywords appear in found data
        org_matched = False
        if org_keyword:
            org_low = org_keyword.lower()
            for p in profiles:
                p_text = f"{p.get('title', '')} {p.get('snippet', '')} {p.get('url', '')}".lower()
                if org_low in p_text:
                    org_matched = True
                    break
        org_overlap = 0.85 if (linkedin_data or org_matched) else 0.0
        
        # Corroboration logic
        sources_found = sum([1 for x in [linkedin_data, news_data, wiki_data, github_data] if x])
        corroboration = min(1.0, sources_found * 0.25)
        
        # Context score: heavily penalize if "not related" is in context
        context_score = 0.8
        contradiction_penalty = 0.0
        if "not related" in context.lower() or "imposter" in context.lower():
            context_score = 0.0
            contradiction_penalty = 1.0
        
        scores, verdict = calculate_identity_score(
            name_score=name_score,
            image_score=image_score,
            organization_overlap=org_overlap,
            source_corroboration=corroboration,
            username_score=0.8,
            project_overlap=0.7,
            context_score=context_score,
            contradiction_penalty=contradiction_penalty
        )
        
        # Prioritize profiles: LinkedIn first, Socials next, Scholar next, Articles next
        from app.src.identity.profile_attributor import sort_profiles_by_priority
        profiles = sort_profiles_by_priority(profiles)

        scraping_payload = {
            "target_context": context,
            "target_name": candidate_name,
            "parsed_intelligence": parsed_target,
            "linkedin": linkedin_data,
            "news_and_web": news_data,
            "scholar": scholar_data,
            "wikipedia": wiki_data,
            "github": github_data,
            "social_media": social_data,
            "profiles": profiles,
            "aliases": candidate_pool_aliases
        }

        # Resolve probe image if an image was provided with the query
        probe_image_filename = os.path.basename(image_path) if image_path and os.path.exists(image_path) else None
        probe_image_url = f"/api/uploads/{probe_image_filename}" if probe_image_filename else None
        probe_image_data_uri = get_image_data_uri(image_path) if image_path and os.path.exists(image_path) else None

        # Resolve primary scraped avatar for candidate
        from app.src.identity.face_cross_verifier import resolve_candidate_avatar, verify_probe_against_scraped
        avatar_url = await resolve_candidate_avatar(profiles, scraping_payload, probe_image_path=image_path)

        # Cross-verify uploaded probe image against scraped candidate avatar
        face_match_warning = None
        is_face_match = None

        if image_path and os.path.exists(image_path) and avatar_url and avatar_url != probe_image_url:
            match_res = await verify_probe_against_scraped(image_path, avatar_url)
            is_face_match = match_res.get("is_match")
            similarity = match_res.get("similarity", 0.0)
            sim_pct = int(similarity * 100)
            if is_face_match is False:
                face_match_warning = f"Warning: The uploaded image does not match the image scraped for {candidate_name} (similarity {sim_pct}%). The image does not belong to this person."
                contradiction_penalty = 1.0
                image_score = 0.05
                scores, verdict = calculate_identity_score(
                    name_score=name_score,
                    image_score=image_score,
                    organization_overlap=org_overlap,
                    source_corroboration=corroboration,
                    username_score=0.8,
                    project_overlap=0.7,
                    context_score=context_score,
                    contradiction_penalty=contradiction_penalty
                )
                await emit(job_id, PipelineEvent(
                    type="WARNING",
                    step="identity",
                    message=f"⚠️ {face_match_warning}"
                ))
            elif is_face_match is True:
                await emit(job_id, PipelineEvent(
                    type="FINDING",
                    step="identity",
                    message=f"✅ Face match verified: Uploaded image matches the scraped online image for {candidate_name} (similarity {sim_pct}%)."
                ))

        # If no online avatar was resolved but user uploaded an image in query, use probe image
        if not avatar_url and probe_image_url:
            avatar_url = probe_image_url

        if probe_image_url:
            await emit(job_id, PipelineEvent(
                type="FINDING", step="identity",
                message="📸 Query probe image attached and integrated into identity report"
            ))

        # Telemetry: notify user which platform provided the verified visual identity
        if avatar_url and avatar_url != probe_image_url:
            matched_plat = next((p.get("platform", "").capitalize() for p in profiles if p.get("photo_url") == avatar_url), None)
            if matched_plat:
                plat_display = "Twitter/X" if matched_plat.lower() in ("twitter", "twitter/x") else matched_plat
                await emit(job_id, PipelineEvent(
                    type="FINDING", step="identity",
                    message=f"📸 Resolved target visual identity from {plat_display}: extracted and verified"
                ))

        candidate = {
            "person_id": person_id,
            "canonical_name_guess": candidate_name,
            "verdict": verdict,
            "scores": scores.model_dump(),
            "profiles_found": profiles,
            "avatar_url": avatar_url,
            "probe_image_url": probe_image_url,
            "probe_image_path": image_path,
            "face_match_warning": face_match_warning,
            "is_face_match": is_face_match,
            "wikipedia": wiki_data,
        }

        job_data = await job_get(job_id) or {"status": "processing", "candidates": []}
        job_data["candidates"].append(candidate)
        await job_set(job_id, job_data)
        await emit(job_id, PipelineEvent(type="FINDING", step="correlation", message=f"Generated Candidate with verdict: {verdict}"))

        if verdict in ["confirmed", "possible"] or face_match_warning:
            # Entity Resolution Agent for Claims
            from app.src.correlation.entity_resolution_agent import resolve_identity
            from app.src.correlation.knowledge_graph_agent import synthesize_knowledge_graph
            
            # Run parallel synthesis
            evidence_data, graph_data = await asyncio.gather(
                resolve_identity(candidate_name, {"links": profiles}, {}),
                synthesize_knowledge_graph(candidate_name, scraping_payload)
            )
            
            print(f"Generated Graph Data: {json.dumps(graph_data, indent=2)}")
            
            # Map person_root to actual person_id in edges and nodes
            for node in graph_data.get("graph", {}).get("nodes", []):
                if node.get("id") == "person_root":
                    node["id"] = person_id
            for edge in graph_data.get("graph", {}).get("edges", []):
                if edge.get("source") == "person_root": edge["source"] = person_id
                if edge.get("target") == "person_root": edge["target"] = person_id
            
            # Store in Redis
            await person_set(person_id, {
                "identity": {
                    "person_id": person_id,
                    "canonical_name": candidate_name,
                    "aliases": candidate_usernames,
                    "usernames": candidate_usernames,
                    "confidence": scores.identity_score,
                    "profiles": profiles,
                    "avatar_url": avatar_url,
                    "probe_image_url": probe_image_url,
                    "probe_image_path": image_path,
                    "probe_image_data_uri": probe_image_data_uri,
                    "face_match_warning": face_match_warning,
                    "is_face_match": is_face_match,
                    "wikipedia": wiki_data,
                },
                "claims": graph_data.get("claims", []),
                "timeline": graph_data.get("timeline", []),
                "graph": graph_data.get("graph", {"nodes": [{"id": person_id, "label": candidate_name, "type": "person"}], "edges": []}),
                "wikipedia": wiki_data,
            })
            
            # --- LAYER 2: MASTER PROFILE CHUNKING & UPSERT ---
            try:
                from app.src.vectordb.store import upsert_text_chunks
                chunks = []
                
                # Chunk 1: Identity & Profiles
                prof_chunk = f"Identity: {candidate_name}\nAliases: {', '.join(candidate_usernames)}\nProfiles:\n"
                for p in profiles:
                    prof_chunk += f"- {p.get('platform', '?').upper()}: {p.get('url', '?')} (Title: {p.get('title', '')} | Snippet: {p.get('snippet', '')[:120]})\n"
                chunks.append(prof_chunk)

                # Chunk 2: Wikipedia Biography & Key Facts
                if wiki_data and (wiki_data.get("summary") or wiki_data.get("facts")):
                    wiki_chunk = f"Wikipedia Biography & Key Facts for {candidate_name}:\n"
                    if wiki_data.get("summary"):
                        wiki_chunk += f"Summary: {wiki_data.get('summary')}\n"
                    if wiki_data.get("facts"):
                        wiki_chunk += "Key Facts:\n" + "\n".join(f"- {f}" for f in wiki_data.get("facts", [])) + "\n"
                    if wiki_data.get("url"):
                        wiki_chunk += f"Wikipedia URL: {wiki_data.get('url')}\n"
                    chunks.append(wiki_chunk)
                
                # Chunk 3: Claims
                claims_chunk = f"Claims for {candidate_name}:\n"
                for c in graph_data.get("claims", []):
                    claims_chunk += f"- {c.get('predicate', '?')}: {c.get('object', '?')} (Confidence: {c.get('confidence', 0):.0%})\n"
                chunks.append(claims_chunk)
                
                # Chunk 4: Timeline
                tl_chunk = f"Chronological Timeline & Filmography for {candidate_name}:\n"
                for t in graph_data.get("timeline", []):
                    tl_chunk += f"- [{t.get('date', '?')}] {t.get('event', '?')}\n"
                chunks.append(tl_chunk)
                
                # Chunk 5: Graph Topology
                graph_chunk = f"Knowledge Graph Topology & Projects for {candidate_name}:\nNodes:\n"
                for n in graph_data.get("graph", {}).get("nodes", []):
                    graph_chunk += f"- [{n.get('type', '?').upper()}] {n.get('label', '?')}\n"
                graph_chunk += "Edges:\n"
                for e in graph_data.get("graph", {}).get("edges", []):
                    graph_chunk += f"- {e.get('source', '?')} -> {e.get('relation', '?')} -> {e.get('target', '?')}\n"
                chunks.append(graph_chunk)
                
                await upsert_text_chunks(person_id, chunks)
            except Exception as ex:
                logger.error(f"Failed to upsert RAG chunks to ChromaDB: {ex}")

        job_data = await job_get(job_id) or {"status": "processing", "candidates": []}
        job_data["status"] = "complete"
        await job_set(job_id, job_data)
        await emit(job_id, PipelineEvent(type="COMPLETE", step="done", message="Pipeline complete"))

    except Exception as e:
        job_data = await job_get(job_id) or {"status": "processing", "candidates": []}
        job_data["status"] = "failed"
        await job_set(job_id, job_data)
        await emit(job_id, PipelineEvent(type="ERROR", step="error", message=str(e)))
    finally:
        if job_id in job_streams:
            await job_streams[job_id].put(None)
