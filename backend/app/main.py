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
from typing import AsyncGenerator

from app.models import CandidateProfile, CandidateScores, Profile, Person, Claim, Evidence, Entity

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

# In-memory stores
job_store: dict[str, dict] = {}
job_streams: dict[str, asyncio.Queue] = {}
person_store: dict[str, dict] = {}

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
    job_store[job_id] = {"status": "processing", "candidates": []}
    job_streams[job_id] = asyncio.Queue()
    
    # Save uploaded file temporarily
    image_path = ""
    if image:
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
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return {
        "job_id": job_id,
        "status": job["status"],
        "candidates": job.get("candidates", [])
    }

@app.get("/api/identity/{person_id}")
async def get_identity(person_id: str):
    person = person_store.get(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return person["identity"]

@app.get("/api/claims/{person_id}")
async def get_claims(person_id: str):
    person = person_store.get(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return person.get("claims", [])

@app.get("/api/timeline/{person_id}")
async def get_timeline(person_id: str):
    person = person_store.get(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return person.get("timeline", [])

@app.get("/api/graph/{person_id}")
async def get_graph(person_id: str):
    person = person_store.get(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return person.get("graph", {"nodes": [], "edges": []})

class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat/{person_id}")
async def chat_with_graph(person_id: str, request: ChatRequest):
    person = person_store.get(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
        
    from openai import AsyncOpenAI
    import os
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    # Construct the RAG context from the identity graph/claims
    context_data = {
        "identity": person.get("identity"),
        "claims": person.get("claims", []),
        "timeline": person.get("timeline", [])
    }
    
    system_prompt = f"""You are a strict GraphRAG Intelligence Assistant for NeuraX.
Your ONLY purpose is to answer questions about the following intelligence graph for the subject: {person.get('identity', {}).get('canonical_name')}.

Here is the structured knowledge graph and evidence:
{json.dumps(context_data, indent=2)}

CRITICAL RULES:
1. You MUST NOT answer questions outside the scope of this graph.
2. If the user asks general knowledge questions, coding questions, or anything unrelated to this specific identity, you MUST reply: "I can only answer questions related to the extracted intelligence graph."
3. DO NOT hallucinate or guess. If the graph does not contain the answer, you MUST reply: "I don't have enough evidence in the current graph to answer that."
4. Maintain a cold, analytical, and professional tone. Do not be conversational."""

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

        # Scrape
        from app.src.scraping.linkedin_scraper import search_linkedin_profile
        from app.src.scraping.search_dorker import search_news_and_web, search_wikipedia
        linkedin_data, news_data, wiki_data = await asyncio.gather(
            search_linkedin_profile(candidate_name),
            search_news_and_web(candidate_name),
            search_wikipedia(candidate_name)
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
        
        candidate = {
            "person_id": person_id,
            "canonical_name_guess": candidate_name,
            "verdict": verdict,
            "scores": scores.model_dump(),
            "profiles_found": profiles
        }
        
        job_store[job_id]["candidates"].append(candidate)
        await emit(job_id, PipelineEvent(type="FINDING", step="correlation", message=f"Generated Candidate with verdict: {verdict}"))

        if verdict in ["confirmed", "possible"]:
            # Entity Resolution Agent for Claims
            from app.src.correlation.entity_resolution_agent import resolve_identity
            evidence_data = await resolve_identity(candidate_name, {"links": profiles}, {})
            
            # Store in person_store
            person_store[person_id] = {
                "identity": {
                    "person_id": person_id,
                    "canonical_name": candidate_name,
                    "aliases": candidate_usernames,
                    "usernames": candidate_usernames,
                    "confidence": scores.identity_score,
                    "profiles": profiles
                },
                "claims": [{
                    "claim_id": f"claim_{job_id}",
                    "subject": person_id,
                    "predicate": "works_at",
                    "object": evidence_data.get("claim", "Unknown"),
                    "confidence": evidence_data.get("confidence", 0.0),
                    "evidence": [{
                        "claim_id": f"claim_{job_id}",
                        "source_url": evidence_data.get("source_url", ""),
                        "excerpt": "Agent reasoning",
                        "source_type": "llm",
                        "confidence": 0.9
                    }]
                }],
                "timeline": [{"date": "2026", "event": "Profile Generated", "claim_id": f"claim_{job_id}", "confidence": 0.9}],
                "graph": {"nodes": [{"id": person_id, "label": candidate_name, "type": "person"}], "edges": []}
            }

        job_store[job_id]["status"] = "complete"
        await emit(job_id, PipelineEvent(type="COMPLETE", step="done", message="Pipeline complete"))

    except Exception as e:
        job_store[job_id]["status"] = "failed"
        await emit(job_id, PipelineEvent(type="ERROR", step="error", message=str(e)))
    finally:
        if job_id in job_streams:
            await job_streams[job_id].put(None)
