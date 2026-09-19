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
        # from app.src.identity.face_embedder import extract_embedding
        # embedding = extract_embedding(image_path)
        await asyncio.sleep(0.5)  # stub delay

        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="identity",
            message="🔍 Running NLP entity extraction...",
        ))
        # from app.src.identity.nlp_extractor import extract_entities
        # entities = extract_entities(context)
        await asyncio.sleep(0.3)

        # ── Layer 2: Multi-Platform Scraping ─────────────────────────────────
        platforms = ["GitHub", "LinkedIn", "Twitter/X", "Instagram", "YouTube", "Google Scholar", "Patents"]
        for platform in platforms:
            await emit(job_id, PipelineEvent(
                type="PROGRESS", step="scraping",
                message=f"🌐 Scraping {platform}...",
            ))
            await asyncio.sleep(0.2)

        # ── Layer 3: Vector DB ───────────────────────────────────────────────
        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="vectordb",
            message="🧮 Indexing face + bio embeddings in ChromaDB...",
        ))
        await asyncio.sleep(0.3)

        # ── Layer 4: Entity Resolution Agent ─────────────────────────────────
        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="entity_resolution",
            message="🤖 Entity Resolution Agent reasoning over signals (GPT-4o)...",
        ))
        await asyncio.sleep(0.5)

        # ── Layer 5: Knowledge Graph ─────────────────────────────────────────
        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="knowledge_graph",
            message="🕸️ Building Knowledge Graph (NetworkX)...",
        ))
        await asyncio.sleep(0.3)

        # ── Layer 6: Evidence ────────────────────────────────────────────────
        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="evidence",
            message="📋 Attaching sources and confidence scores...",
        ))
        await asyncio.sleep(0.2)

        # ── Layer 7: Output ──────────────────────────────────────────────────
        await emit(job_id, PipelineEvent(
            type="PROGRESS", step="output",
            message="📊 Generating identity profile, timeline, and report...",
        ))
        await asyncio.sleep(0.2)

        # ── Done ─────────────────────────────────────────────────────────────
        result = {
            "status": "complete",
            "identity": {"name": "Stub Result", "confidence": 0.91},
            "platforms_found": platforms,
            "graph_nodes": 12,
            "graph_edges": 18,
        }
        job_store[job_id] = {"status": "complete", "result": result}

        await emit(job_id, PipelineEvent(
            type="COMPLETE", step="done",
            message="✅ Pipeline complete",
            data=result,
            confidence=0.91,
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
