"""
NeuraX — Python FastAPI AI Engine
Serves the intelligence pipeline + SSE streaming endpoint.
"""

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
import asyncio
import uuid
import json
import os
import logging
from typing import AsyncGenerator
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

# Redis helpers — 24 hour TTL
JOB_TTL = 86400
PERSON_TTL = 86400

async def job_get(job_id: str) -> dict | None:
    raw = await redis_client.get(f"job:{job_id}")
    return json.loads(raw) if raw else None

async def job_set(job_id: str, data: dict):
    await redis_client.setex(f"job:{job_id}", JOB_TTL, json.dumps(data))

async def person_get(person_id: str) -> dict | None:
    raw = await redis_client.get(f"person:{person_id}")
    return json.loads(raw) if raw else None

async def person_set(person_id: str, data: dict):
    await redis_client.setex(f"person:{person_id}", PERSON_TTL, json.dumps(data))

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
    retrieved_chunks = await search_text_chunks(search_query, person_id, n_results=4)
    
    rag_context = ""
    if retrieved_chunks:
        rag_context = "\n\n---\n\n".join([c.get("metadata", {}).get("text", "") for c in retrieved_chunks])
    else:
        rag_context = "No specific intelligence footprint matched the query."
        
    subject_name = person.get("identity", {}).get("canonical_name", "the subject")

    # === LAYER 3: SYNTHESIZED GENERATION ===
    system_prompt = f"""You are a highly analytical OSINT Intelligence Agent for NeuraX.
Your task is to answer the user's question about {subject_name} using ONLY the extracted intelligence chunks provided below.

=== RETRIEVED INTELLIGENCE CONTEXT ===
{rag_context}
======================================

RULES:
1. Answer ONLY using the intelligence context above. Do not hallucinate or use external knowledge.
2. If the context does not contain the answer, explicitly state: "I do not have enough evidence in the current intelligence graph to answer that."
3. Be concise, direct, and analytical. Do not be conversational."""

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
    try:
        await emit(job_id, PipelineEvent(type="PROGRESS", step="identity", message="🔍 Extracting face embedding..."))
        from app.src.identity.face_embedder import extract_embedding
        embedding = await asyncio.to_thread(extract_embedding, image_path) if image_path else None
            
        if embedding:
            await emit(job_id, PipelineEvent(type="FINDING", step="identity", message=f"✅ Face embedding extracted"))

        from app.src.identity.nlp_extractor import get_primary_candidate
        from app.src.identity.username_generator import generate_usernames
        candidate_name = get_primary_candidate(context) if context else "torvalds"
        candidate_usernames = generate_usernames(candidate_name)

        from app.src.scraping.linkedin_scraper import search_linkedin_profile
        from app.src.scraping.search_dorker import search_news_and_web, search_wikipedia
        from app.src.scraping.github_client import get_github_profile
        from app.src.scraping.wikidata_client import get_wikidata_socials
        from app.src.scraping.username_checker import check_all_platforms

        # Determine base username
        base_username = candidate_usernames[0] if candidate_usernames else candidate_name.lower().replace(" ", "")

        await emit(job_id, PipelineEvent(type="PROGRESS", step="scraping", message="🌐 Querying Wikipedia, GitHub, OSINT footprints and Wikidata..."))
        
        # Concurrently gather data
        wiki_task = asyncio.create_task(search_wikipedia(candidate_name))
        github_task = asyncio.create_task(get_github_profile(candidate_name, is_email=False))
        linkedin_task = asyncio.create_task(search_linkedin_profile(candidate_name))
        news_task = asyncio.create_task(search_news_and_web(candidate_name))
        wikidata_task = asyncio.create_task(get_wikidata_socials(candidate_name))
        social_task = asyncio.create_task(check_all_platforms(base_username))
        
        wiki_data, github_data, linkedin_data, news_data, wikidata_socials, social_data = await asyncio.gather(
            wiki_task, github_task, linkedin_task, news_task, wikidata_task, social_task, return_exceptions=True
        )

        if isinstance(wiki_data, Exception): wiki_data = None
        if isinstance(github_data, Exception): github_data = None
        if isinstance(linkedin_data, Exception): linkedin_data = None
        if isinstance(news_data, Exception): news_data = None
        if isinstance(wikidata_socials, Exception): wikidata_socials = {}
        if isinstance(social_data, Exception): social_data = {}

        if not isinstance(social_data, dict):
            social_data = {}
        if isinstance(wikidata_socials, dict):
            social_data.update(wikidata_socials)
            
        # (Hardcoded fallbacks removed - delegating all scraping to Playwright OSINT)
        # Identity Scoring
        from app.src.correlation.identity_scorer import calculate_identity_score
        
        # Analyze context vs found data for simple heuristics
        name_score = 0.9 if candidate_name.lower() in context.lower() else 0.5
        # Build profiles list FIRST
        profiles = []
        if github_data:
            gh_username = github_data.get("username") or github_data.get("login", "")
            if gh_username:
                profiles.append({"platform": "github", "username": gh_username, "url": f"https://github.com/{gh_username}", "confidence": 0.9})
        if linkedin_data and linkedin_data.get("url"):
            profiles.append({"platform": "linkedin", "username": candidate_name, "url": linkedin_data["url"], "confidence": 0.8})
        if wiki_data and wiki_data.get("url"):
            profiles.append({"platform": "wikipedia", "username": candidate_name, "url": wiki_data["url"], "confidence": 0.95})
        
        if social_data:
            for platform, url in social_data.items():
                profiles.append({"platform": platform.lower(), "username": base_username, "url": url, "confidence": 0.95, "pre_verified": True})

        if news_data:
            # Inject deep footprint sites into profiles for LLM verification
            for item in news_data.get("news", []):
                profiles.append({"platform": "news", "username": candidate_name, "url": item["url"], "snippet": item.get("snippet", ""), "confidence": 0.5})
            for item in news_data.get("web", []):
                url = item["url"].lower()
                plat = "web"
                if "scholar.google" in url:
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
                    
                profiles.append({"platform": plat, "username": candidate_name, "url": item["url"], "snippet": item.get("snippet", ""), "confidence": 0.5})

        # ── Face Cross-Verification ──────────────────────────────────────────
        # If the user uploaded a probe image, download each profile's photo and
        # run DeepFace.verify() to confirm the profile belongs to this person.
        if image_path and profiles:
            await emit(job_id, PipelineEvent(type="PROGRESS", step="identity", message="🔎 Cross-verifying profile photos against probe image…"))
            from app.src.identity.face_cross_verifier import cross_verify_profiles
            profiles = await cross_verify_profiles(image_path, profiles, {
                "linkedin": linkedin_data,
                "github": github_data,
                "wikipedia": wiki_data,
            })
            verified_count = sum(1 for p in profiles if p.get("face_verified") is True)
            await emit(job_id, PipelineEvent(
                type="FINDING", step="identity",
                message=f"✅ Face verification complete — {verified_count}/{len(profiles)} profiles confirmed"
            ))
        elif profiles:
            # No image — use text-based attribution: fetch each profile's bio and
            # ask GPT-4o if it matches the target context seed.
            await emit(job_id, PipelineEvent(type="PROGRESS", step="identity", message="📝 Attributing profiles via context matching (no image provided)…"))
            from app.src.identity.profile_attributor import text_attribute_profiles
            profiles = await text_attribute_profiles(context, candidate_name, profiles)
            confirmed = sum(1 for p in profiles if p.get("text_attribution") == "CONFIRMED")
            possible  = sum(1 for p in profiles if p.get("text_attribution") == "POSSIBLE")
            await emit(job_id, PipelineEvent(
                type="FINDING", step="identity",
                message=f"✅ Text attribution complete — {confirmed} confirmed, {possible} possible, {len(profiles)} total"
            ))

        # Real face similarity score (or None if no image)
        face_match_scores = [p.get("face_confidence") for p in profiles if p.get("face_verified") is True]
        image_score = (sum(face_match_scores) / len(face_match_scores)) if face_match_scores else (0.75 if embedding else None)
        org_overlap = 0.8 if linkedin_data else 0.0
        
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
        
        person_id = f"person_{job_id}"

        candidate = {
            "person_id": person_id,
            "canonical_name_guess": candidate_name,
            "verdict": verdict,
            "scores": scores.model_dump(),
            "profiles_found": profiles
        }

        job_data = await job_get(job_id) or {"status": "processing", "candidates": []}
        job_data["candidates"].append(candidate)
        await job_set(job_id, job_data)
        await emit(job_id, PipelineEvent(type="FINDING", step="correlation", message=f"Generated Candidate with verdict: {verdict}"))

        if verdict in ["confirmed", "possible"]:
            # Entity Resolution Agent for Claims
            from app.src.correlation.entity_resolution_agent import resolve_identity
            from app.src.correlation.knowledge_graph_agent import synthesize_knowledge_graph
            
            scraping_payload = {
                "linkedin": linkedin_data,
                "news_and_web": news_data,
                "wikipedia": wiki_data,
                "github": github_data,
                "social_media": social_data,
                "profiles": profiles
            }
            
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
                    "profiles": profiles
                },
                "claims": graph_data.get("claims", []),
                "timeline": graph_data.get("timeline", []),
                "graph": graph_data.get("graph", {"nodes": [{"id": person_id, "label": candidate_name, "type": "person"}], "edges": []})
            })
            
            # --- LAYER 2: MASTER PROFILE CHUNKING & UPSERT ---
            try:
                from app.src.vectordb.store import upsert_text_chunks
                chunks = []
                
                # Chunk 1: Identity & Profiles
                prof_chunk = f"Identity: {candidate_name}\nAliases: {', '.join(candidate_usernames)}\nProfiles:\n"
                for p in profiles:
                    prof_chunk += f"- {p.get('platform', '?').upper()}: {p.get('url', '?')} (Snippets: {p.get('snippet', '')[:100]})\n"
                chunks.append(prof_chunk)
                
                # Chunk 2: Claims
                claims_chunk = f"Claims for {candidate_name}:\n"
                for c in graph_data.get("claims", []):
                    claims_chunk += f"- {c.get('predicate', '?')}: {c.get('object', '?')} (Confidence: {c.get('confidence', 0):.0%})\n"
                chunks.append(claims_chunk)
                
                # Chunk 3: Timeline
                tl_chunk = f"Timeline for {candidate_name}:\n"
                for t in graph_data.get("timeline", []):
                    tl_chunk += f"- [{t.get('date', '?')}] {t.get('event', '?')}\n"
                chunks.append(tl_chunk)
                
                # Chunk 4: Graph Topology
                graph_chunk = f"Graph Topology for {candidate_name}:\nNodes:\n"
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
