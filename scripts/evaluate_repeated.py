"""Measure real Qwen run variation and refusal paths on invented fixtures only.

Example: EVAL_WEB_URL=http://localhost:3000 python scripts/evaluate_repeated.py
--output var/evidence/repeated.json. Never substitutes a stub or omits failures.
"""
import argparse
import hashlib
import json
import os
import platform
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
import httpx


def evaluate(base, repeats):
    with httpx.Client(base_url=base, timeout=600) as client:
        health = client.get("/api/v1/health").raise_for_status().json()
        if health["data_provenance"] != "synthetic_demo_data" or health["model"]["mode"] != "ollama" or not health["model"]["available"]:
            raise ValueError("Requires labelled synthetic data and an available real Ollama model")
        if not health["model"]["model"].startswith("qwen2.5:"):
            raise ValueError("This evaluation requires Qwen 2.5")
        records = client.get("/api/v1/tenders").raise_for_status().json()["items"]
        results = []
        for index in range(repeats):
            started = datetime.now(timezone.utc).isoformat(); clock = time.perf_counter()
            try:
                response = client.post("/api/v1/reviews", json={"record_key": records[0]["record_key"]})
            except httpx.HTTPError as error:
                seconds = round(time.perf_counter() - clock, 3)
                results.append({"attempt": index + 1, "started_at": started, "review_seconds": seconds, "http_status": None, "passed": False, "transport_error": type(error).__name__})
                print(f"Attempt {index+1}: FAIL; {seconds}s; transport error {type(error).__name__}", flush=True)
                continue
            seconds = round(time.perf_counter() - clock, 3)
            item = {"attempt": index + 1, "started_at": started, "review_seconds": seconds, "http_status": response.status_code, "passed": False}
            if response.is_success:
                review = response.json(); item["review"] = review
                item["passed"] = review.get("model", {}).get("used") is True and review["model"]["provider"] == "ollama" and not review.get("abstained")
                item["report_sha256"] = hashlib.sha256(json.dumps(review["report"], sort_keys=True, separators=(",", ":")).encode()).hexdigest()
                if item["passed"]:
                    draft = client.post("/api/v1/drafts", json={"report": review["report"]})
                    item["draft_status"] = draft.status_code
                    item["passed"] = draft.is_success and draft.json().get("status") == "draft_requires_human_review"
                    altered = dict(review["report"]); altered["title"] += " altered without source"
                    refused = client.post("/api/v1/drafts", json={"report": altered})
                    item["altered_report_status"] = refused.status_code
                    item["passed"] = item["passed"] and refused.status_code == 422
                item["token_counts"] = {key: sum(event.get("usage", {}).get(key) or 0 for event in review.get("audit_events", []) if event.get("usage")) for key in ["prompt_eval_count", "eval_count"]}
            else:
                item["error"] = response.json().get("detail", "Review failed")
            results.append(item)
            print(f"Attempt {index+1}: {'PASS' if item['passed'] else 'FAIL'}; {seconds}s; HTTP {response.status_code}", flush=True)
        unknown = client.post("/api/v1/reviews", json={"record_key": "missing::missing::missing"})
        clock = time.perf_counter()
        incomplete = client.post("/api/v1/reviews", json={"record_key": records[2]["record_key"]})
        incomplete_result = incomplete.json()
        abstained = incomplete.is_success and incomplete_result.get("abstained") is True
        incomplete_draft = client.post("/api/v1/drafts", json={"report": incomplete_result["report"]}) if abstained else None
        failures = {"unknown_record": {"http_status": unknown.status_code, "passed": unknown.status_code == 404}, "incomplete_evidence": {"http_status": incomplete.status_code, "seconds": round(time.perf_counter()-clock, 3), "abstained": abstained, "draft_http_status": incomplete_draft.status_code if incomplete_draft else None, "passed": abstained and incomplete_draft.status_code == 422, "result": incomplete_result}}
        times = [r["review_seconds"] for r in results]
        return {"recorded_at": datetime.now(timezone.utc).isoformat(), "data": "synthetic_demo_data", "model_tag": health["model"]["model"], "model_digest": health["model"].get("digest"), "hardware": {"architecture": platform.machine(), "visible_cpu_count": os.cpu_count()}, "attempts": results, "failure_tasks": failures, "summary": {"attempts": repeats, "passes": sum(r["passed"] for r in results), "latency_min_seconds": min(times), "latency_max_seconds": max(times), "latency_mean_seconds": round(statistics.mean(times),3), "latency_stdev_seconds": round(statistics.pstdev(times),3), "distinct_report_hashes": len({r["report_sha256"] for r in results if "report_sha256" in r})}, "cost": {"paid_inference_api_calls": 0, "electricity_and_hardware_cost": "Not measured; no total monetary cost claim", "elapsed_and_token_counts": "Measured in attempts; counts reported by Ollama"}, "production_approval": "Not exercised; local synthetic model evaluation only"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--repeats", type=int, default=3)
    args = parser.parse_args()
    if not 2 <= args.repeats <= 10: parser.error("Use 2–10 repeats")
    if args.output.exists(): parser.error("Refusing to overwrite existing evidence")
    result = evaluate(os.getenv("EVAL_WEB_URL", "http://localhost:3000"), args.repeats)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x") as stream: json.dump(result, stream, indent=2)
    print(json.dumps(result["summary"]))
    raise SystemExit(0 if all(r["passed"] for r in result["attempts"]) and all(r["passed"] for r in result["failure_tasks"].values()) else 1)
