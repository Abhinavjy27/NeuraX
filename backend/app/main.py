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
    
    # Construct a rich RAG context from the full identity record
    identity = person.get("identity", {})
    graph = person.get("graph", {})
    claims = person.get("claims", [])
    timeline = person.get("timeline", [])

    # Build a plain-text summary of graph nodes for the LLM
    node_lines = []
    for node in graph.get("nodes", []):
        node_lines.append(f"  - [{node.get('type','?').upper()}] {node.get('label','?')}")
    node_summary = "\n".join(node_lines) if node_lines else "  (none)"

    edge_lines = []
    for edge in graph.get("edges", []):
        edge_lines.append(f"  - {edge.get('source','?')} --[{edge.get('relation','?')}]--> {edge.get('target','?')}")
    edge_summary = "\n".join(edge_lines) if edge_lines else "  (none)"

    profile_lines = []
    for p in identity.get("profiles", []):
        profile_lines.append(f"  - {p.get('platform','?').upper()}: {p.get('url','?')}")
    profile_summary = "\n".join(profile_lines) if profile_lines else "  (none)"

    claim_lines = []
    for c in claims:
        claim_lines.append(f"  - {c.get('predicate','?')}: {c.get('object','?')} (confidence={c.get('confidence',0):.0%}, source={c.get('source_url') or 'unknown'})")
    claim_summary = "\n".join(claim_lines) if claim_lines else "  (none)"

    timeline_lines = []
    for t in timeline:
        timeline_lines.append(f"  - [{t.get('date','?')}] {t.get('event','?')} (confidence={t.get('confidence',0):.0%})")
    timeline_summary = "\n".join(timeline_lines) if timeline_lines else "  (none)"

    subject_name = identity.get("canonical_name", "the subject")
    confidence = identity.get("confidence", 0)

    system_prompt = f"""You are a OSINT Intelligence Analyst for NeuraX. Your task is to answer questions about the target identity using ONLY the extracted intelligence below.

=== TARGET IDENTITY ===
Name: {subject_name}
Confidence Score: {confidence:.1%}
Aliases / Usernames: {', '.join(identity.get('aliases', []))}

=== SOCIAL & PLATFORM PROFILES ===
{profile_summary}

=== VERIFIED CLAIMS ===
{claim_summary}

=== OSINT TIMELINE ===
{timeline_summary}

=== KNOWLEDGE GRAPH ENTITIES ===
Nodes:
{node_summary}

Edges:
{edge_summary}

=== RULES ===
1. Answer ONLY using the intelligence above about {subject_name}. Do not use external knowledge.
2. Questions asking about this person's Wikipedia page, social profiles, organizations, awards, or locations are valid — answer from the data above.
3. If the user asks something genuinely unrelated to {subject_name} (e.g., coding help, math, world events), reply: "I can only answer questions related to the extracted intelligence graph."
4. If the evidence above does not contain the answer, reply: "I don't have enough evidence in the current graph to answer that."
5. Be analytical and concise. Do not be conversational or add disclaimers."""

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
        from app.src.scraping.username_checker import check_all_platforms
        
        # Determine base username
        base_username = candidate_usernames[0] if candidate_usernames else candidate_name.lower().replace(" ", "")
        
        linkedin_data, news_data, wiki_data, social_data = await asyncio.gather(
            search_linkedin_profile(candidate_name),
            search_news_and_web(candidate_name),
            search_wikipedia(candidate_name),
            check_all_platforms(base_username)
        )
        
        from app.src.scraping.github_client import get_github_profile
        github_data = await get_github_profile(candidate_name, is_email=False)
        
        # Identity Scoring
        from app.src.correlation.identity_scorer import calculate_identity_score
        
        # Analyze context vs found data for simple heuristics
        name_score = 0.9 if candidate_name.lower() in context.lower() else 0.5
        image_score = 0.85 if embedding else None
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
        
        profiles = []
        if github_data: profiles.append({"platform": "github", "username": github_data.get("login", ""), "url": "https://github.com", "confidence": 0.9})
        if linkedin_data: profiles.append({"platform": "linkedin", "username": candidate_name, "url": "https://linkedin.com", "confidence": 0.8})
        
        if social_data:
            for platform, url in social_data.items():
                profiles.append({"platform": platform.lower(), "username": base_username, "url": url, "confidence": 0.95})
        
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
