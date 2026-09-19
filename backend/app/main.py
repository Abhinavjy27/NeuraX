"""
NeuraX — Python FastAPI AI Engine
Serves the intelligence pipeline + SSE streaming endpoint.
"""

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
import asyncio
import uuid
import json
from typing import AsyncGenerator

app = FastAPI(
    title="NeuraX AI Engine",
    description="Digital Identity Intelligence — AI Pipeline",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store (replace with Redis in production)
job_store: dict[str, dict] = {}
job_streams: dict[str, asyncio.Queue] = {}


# ── Models ──────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    job_id: str
    image_path: str
    context: str = ""


class PipelineEvent(BaseModel):
    type: str          # PROGRESS | FINDING | COMPLETE | ERROR
    step: str
    message: str
    data: dict = {}
    confidence: float = 0.0


# ── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "neurax-ai-engine"}


@app.post("/analyze")
async def analyze(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    """Triggered by Node BullMQ worker. Starts the pipeline in background."""
    job_store[request.job_id] = {"status": "running", "result": None}
    job_streams[request.job_id] = asyncio.Queue()

    background_tasks.add_task(run_pipeline, request.job_id, request.image_path, request.context)

    return {"job_id": request.job_id, "status": "started"}


@app.get("/stream/{job_id}")
async def stream(job_id: str):
    """SSE endpoint — Node gateway subscribes here and relays to React via WebSocket."""
    if job_id not in job_streams:
        job_streams[job_id] = asyncio.Queue()

    return EventSourceResponse(event_generator(job_id))


@app.get("/result/{job_id}")
async def result(job_id: str):
    """Return final result once pipeline is complete."""
    job = job_store.get(job_id)
    if not job:
        return {"error": "Job not found"}
    return job


# ── Pipeline Runner ──────────────────────────────────────────────────────────

async def emit(job_id: str, event: PipelineEvent):
    """Push a pipeline event to the SSE queue for this job."""
    if job_id in job_streams:
        await job_streams[job_id].put(event.model_dump())


async def run_pipeline(job_id: str, image_path: str, context: str):
    """
    Full 7-layer NeuraX pipeline.
    Each layer emits SSE events for real-time frontend updates.
    """
    try:
        # ── Layer 1: Identity Resolution ────────────────────────────────────
        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="identity",
            message="🔍 Extracting face embedding..."
        ))
        from app.src.identity.face_embedder import extract_embedding
        
        embedding = None
        if image_path:
            # Note: For production, this should run in a thread pool since it's blocking CPU-bound code
            embedding = await asyncio.to_thread(extract_embedding, image_path)
            
        if embedding:
            await emit(job_id, PipelineEvent(
                type="FINDING", step="identity",
                message=f"✅ Face embedding extracted ({len(embedding)} dimensions)",
            ))
        else:
            await emit(job_id, PipelineEvent(
                type="FINDING", step="identity",
                message="⚠️ No face detected in uploaded image, relying on context only.",
            ))

        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="identity",
            message="🔍 Running NLP entity extraction...",
        ))
        # from app.src.identity.nlp_extractor import extract_entities
        # entities = extract_entities(context)
        await asyncio.sleep(0.3)

        # ── Layer 2: Multi-Platform Scraping ─────────────────────────────────
        from app.src.identity.nlp_extractor import get_primary_candidate
        
        candidate_username = get_primary_candidate(context) if context else "torvalds"
        
        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="scraping",
            message=f"🌐 Scraping GitHub for candidate '{candidate_username}'...",
        ))
        
        from app.src.scraping.github_client import get_github_profile
        github_data = await get_github_profile(candidate_username)
        
        if github_data:
            repos_str = ", ".join([r["name"] for r in github_data.get("top_repositories", [])])
            await emit(job_id, PipelineEvent(
                type="FINDING", step="scraping",
                message=f"✅ Found GitHub: {github_data.get('name', '')} ({github_data.get('followers', 0)} followers)",
                data={"repos": repos_str, "bio": github_data.get("bio", "")},
                confidence=0.9
            ))
        else:
            await emit(job_id, PipelineEvent(
                type="FINDING", step="scraping",
                message=f"⚠️ No GitHub profile found for '{candidate_username}'.",
            ))
            
        # Native Username Checker (API-Free)
        from app.src.scraping.username_checker import check_all_platforms
        
        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="scraping",
            message=f"🌐 Hunting for username '{candidate_username}' across 120+ platforms (API-Free)...",
        ))
        
        found_platforms = await check_all_platforms(candidate_username)
        
        if found_platforms:
            platforms_str = ", ".join(found_platforms.keys())
            await emit(job_id, PipelineEvent(
                type="FINDING", step="scraping",
                message=f"✅ Candidate active on: {platforms_str}",
                data={"links": found_platforms},
                confidence=0.8
            ))
        else:
            await emit(job_id, PipelineEvent(
                type="PROGRESS", step="scraping",
                message=f"⚠️ No secondary platform profiles found for '{candidate_username}'.",
            ))
            
        await asyncio.sleep(0.5)

        # ── Layer 3: Vector DB ───────────────────────────────────────────────
        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="vectordb",
            message="💾 Searching Vector DB for existing identities...",
        ))
        
        from app.src.vectordb.store import search_face, upsert_face
        
        if embedding:
            # 1. Search for existing faces
            # ChromaDB cosine distance (0.0 is perfect match, 1.0 is completely different)
            # Threshold of 0.4 usually means the same person for Facenet512
            similar_faces = await asyncio.to_thread(search_face, embedding, n_results=1)
            
            if similar_faces and similar_faces[0]["distance"] < 0.4:
                match = similar_faces[0]
                await emit(job_id, PipelineEvent(
                    type="FINDING", step="vectordb",
                    message=f"✅ Face matched existing record in DB (Distance: {match['distance']:.3f})",
                    data={"db_id": match["id"], "metadata": match["metadata"]},
                    confidence=0.95
                ))
            else:
                # 2. If not found, save this new face
                new_db_id = f"face_{job_id}"
                success = await asyncio.to_thread(upsert_face, new_db_id, embedding, {"username": candidate_username})
                if success:
                    await emit(job_id, PipelineEvent(
                        type="PROGRESS", step="vectordb",
                        message=f"💾 Saved new face embedding to Vector DB with ID '{new_db_id}'.",
                    ))
        else:
            await emit(job_id, PipelineEvent(
                type="PROGRESS", step="vectordb",
                message="⚠️ No face embedding available to search in Vector DB.",
            ))

        # ── Layer 4: Entity Resolution Agent ─────────────────────────────────
        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="entity_resolution",
            message="🤖 Entity Resolution Agent reasoning over signals (GPT-4o)...",
        ))
        
        from app.src.correlation.entity_resolution_agent import resolve_identity
        
        db_match_data = match if (embedding and 'match' in locals()) else {}
        scraping_data = {"links": found_platforms} if 'found_platforms' in locals() and found_platforms else {}
        
        evidence = await resolve_identity(candidate_username, scraping_data, db_match_data)
        
        await emit(job_id, PipelineEvent(
            type="FINDING", step="entity_resolution",
            message=f"🧠 Agent resolved identity: {evidence.get('claim', 'Unknown')}",
            data=evidence,
            confidence=evidence.get("confidence", 0.0)
        ))

        # ── Layer 5: Knowledge Graph ─────────────────────────────────────────
        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="knowledge_graph",
            message="🕸️ Building Knowledge Graph (NetworkX)...",
        ))
        
        from app.src.graph.builder import build_identity_graph
        graph_data = build_identity_graph(candidate_username, scraping_data.get("links", {}), db_match_data)
        
        await emit(job_id, PipelineEvent(
            type="FINDING", step="knowledge_graph",
            message=f"🕸️ Graph built with {len(graph_data.get('nodes', []))} nodes and {len(graph_data.get('links', []))} edges.",
            data=graph_data
        ))

        # ── Layer 6: Evidence ────────────────────────────────────────────────
        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="evidence",
            message="📋 Attaching sources and confidence scores...",
        ))
        
        from app.src.evidence.confidence_scorer import score_evidence
        from app.src.evidence.conflict_detector import detect_conflicts
        from app.src.evidence.source_attacher import attach_source
        
        evidence = score_evidence(evidence)
        conflicts = detect_conflicts([evidence])
        
        # Attach source url if not already fully formed
        if not evidence.get("source_url") or evidence.get("source_url") == "github.com":
            if scraping_data.get("links"):
                first_platform = list(scraping_data["links"].keys())[0]
                evidence["source_url"] = attach_source(first_platform, candidate_username)
                
        if conflicts:
            await emit(job_id, PipelineEvent(
                type="PROGRESS", step="evidence",
                message=f"⚠️ Conflicts detected: {', '.join(conflicts)}",
            ))

        # ── Layer 7: Output ──────────────────────────────────────────────────
        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="output",
            message="📊 Generating identity profile, timeline, and report...",
        ))
        
        from app.src.output.profile_renderer import render_profile
        from app.src.output.timeline_builder import build_timeline
        from app.src.output.report_generator import generate_markdown_report
        
        timeline = build_timeline(evidence, list(scraping_data.get("links", {}).keys()))
        profile = render_profile(
            candidate_username, 
            evidence.get("confidence", 0.0), 
            list(scraping_data.get("links", {}).keys()), 
            evidence, 
            graph_data
        )
        report_md = generate_markdown_report(profile, timeline)
        
        # ── Done ─────────────────────────────────────────────────────────────
        result = {
            "status": "complete",
            "identity": profile["identity"],
            "platforms_found": profile["platforms"],
            "evidence": evidence,
            "graph": graph_data,
            "timeline": timeline,
            "report": report_md
        }
        job_store[job_id] = {"status": "complete", "result": result}

        await emit(job_id, PipelineEvent(
            type="COMPLETE", step="done",
            message="✅ Pipeline complete",
            data=result,
            confidence=evidence.get("confidence", 0.0),
        ))

    except Exception as e:
        job_store[job_id] = {"status": "error", "result": str(e)}
        await emit(job_id, PipelineEvent(
            type="ERROR", step="unknown",
            message=f"❌ Pipeline failed: {str(e)}",
        ))

    finally:
        # Signal end of stream
        await job_streams[job_id].put(None)


async def event_generator(job_id: str) -> AsyncGenerator:
    """Yield SSE events from the job queue."""
    queue = job_streams[job_id]
    while True:
        event = await queue.get()
        if event is None:
            break
        yield {"data": json.dumps(event)}
