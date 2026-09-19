"""
NeuraX — Digital Identity Intelligence System
Entry point for the full pipeline.

Usage:
    python main.py --image data/input/sample.jpg --context "Software engineer, Bangalore"
"""

import argparse
from dotenv import load_dotenv
from rich.console import Console

load_dotenv()
console = Console()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="NeuraX — Digital Footprint Intelligence System"
    )
    parser.add_argument(
        "--image", required=True, help="Path to the input face image"
    )
    parser.add_argument(
        "--context", default="", help="Additional context (name, location, org, etc.)"
    )
    parser.add_argument(
        "--output", default="data/output", help="Output directory for reports"
    )
    return parser.parse_args()


def run_pipeline(image_path: str, context: str, output_dir: str) -> None:
    console.rule("[bold cyan]NeuraX — Digital Identity Intelligence[/]")

    # Layer 1: Identity Resolution
    console.print("[1/7] 🔍 Resolving identity from image + context...")
    # from src.identity.face_embedder import extract_embedding
    # from src.identity.nlp_extractor import extract_entities
    # from src.identity.candidate_pool import build_pool

    # Layer 2: Multi-Platform Discovery
    console.print("[2/7] 🌐 Discovering public profiles across platforms...")
    # from src.discovery.github_client import search_github
    # from src.discovery.linkedin_scraper import search_linkedin
    # ... other platforms

    # Layer 3: Vector DB — Face + Bio Embeddings
    console.print("[3/7] 🧮 Indexing embeddings in Vector DB...")
    # from src.vectordb.store import VectorStore
    # from src.vectordb.face_search import find_similar_faces

    # Layer 4: Correlation + Entity Resolution Agent
    console.print("[4/7] 🤖 Running Entity Resolution Agent...")
    # from src.correlation.entity_resolution_agent import resolve_entities

    # Layer 5: Knowledge Graph
    console.print("[5/7] 🕸️  Building Knowledge Graph...")
    # from src.graph.builder import build_graph
    # from src.graph.visualizer import render_graph

    # Layer 6: Evidence & Confidence
    console.print("[6/7] 📋 Attaching evidence and confidence scores...")
    # from src.evidence.source_attacher import attach_sources
    # from src.evidence.confidence_scorer import score_findings

    # Layer 7: Output
    console.print("[7/7] 📊 Generating report, timeline, and graph...")
    # from src.output.report_generator import generate_report
    # from src.output.timeline_builder import build_timeline

    console.rule("[bold green]✅ Pipeline Complete[/]")
    console.print(f"Reports saved to: [bold]{output_dir}[/]")


if __name__ == "__main__":
    args = parse_args()
    run_pipeline(args.image, args.context, args.output)
