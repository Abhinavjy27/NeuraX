import json
import asyncio
import os
import sys

# Ensure backend can be imported
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

from app.main import run_pipeline, job_store

async def evaluate():
    print("Starting NeuraX Evaluation Suite...")
    
    with open('data/eval/ground_truth.json', 'r') as f:
        dataset = json.load(f)
        
    total_cases = len(dataset)
    correct_verdicts = 0
    false_match_count = 0
    
    for case in dataset:
        print(f"\n--- Evaluating Case: {case['id']} ({case['name']}) ---")
        job_id = f"eval_{case['id']}"
        
        # Initialize job
        job_store[job_id] = {"status": "processing", "candidates": []}
        
        # Run pipeline
        full_context = f"{case['name']}, {case['context']}"
        await run_pipeline(job_id, image_path="", context=full_context)
        
        candidates = job_store[job_id].get("candidates", [])
        if not candidates:
            print("❌ No candidates generated!")
            continue
            
        # Top 1 Candidate
        top_candidate = sorted(candidates, key=lambda x: x["scores"]["identity_score"], reverse=True)[0]
        actual_verdict = top_candidate["verdict"]
        
        print(f"Expected Verdict: {case['expected_verdict']}, Actual Verdict: {actual_verdict}")
        
        if actual_verdict == case['expected_verdict']:
            correct_verdicts += 1
            print("✅ Verdict Matched")
        else:
            print("❌ Verdict Mismatched")
            
        # False Match Rate tracking
        if case['expected_verdict'] == "insufficient_evidence" and actual_verdict in ["confirmed", "possible"]:
            false_match_count += 1
            print("🚨 FALSE MATCH DETECTED!")
            
    print("\n================ Evaluation Results ================")
    print(f"Accuracy: {correct_verdicts}/{total_cases} ({(correct_verdicts/total_cases)*100:.1f}%)")
    print(f"False Match Rate (FMR): {false_match_count} incidents")
    print("==================================================")
    
    if false_match_count > 0:
        print("FMR MUST BE 0. Failing evaluation.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(evaluate())
