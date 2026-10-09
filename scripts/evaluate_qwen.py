"""Record an actual synthetic Qwen review through the running Compose web API.

Run inside the api container with this file on stdin, redirecting stdout to an
artifact. Outputs only labelled synthetic records; do not run against private data.
"""
import json
import os
import platform
import time
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import URLError

BASE = os.getenv("EVAL_WEB_URL", "http://web:3000")
OLLAMA = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")

def get(url, data=None):
    encoded = json.dumps(data).encode() if data is not None else None
    with urlopen(Request(url, data=encoded, headers={"Content-Type": "application/json"}), timeout=600) as response:
        return json.load(response)

for attempt in range(20):
    try:
        health = get(BASE + "/api/v1/health")
        break
    except URLError:
        if attempt == 19:
            raise
        time.sleep(1)
assert health["model"]["mode"] == "ollama", "A stub is not a Qwen run"
assert health["model"]["model"].startswith("qwen2.5:")
model = next(m for m in get(OLLAMA + "/api/tags")["models"] if m["name"] == health["model"]["model"])
records = get(BASE + "/api/v1/tenders")["items"]
started = datetime.now(timezone.utc).isoformat()
clock = time.perf_counter()
review = get(BASE + "/api/v1/reviews", {"record_key": records[0]["record_key"]})
review_seconds = round(time.perf_counter()-clock, 3)
assert review["model"]["used"] is True and review["model"]["provider"] == "ollama"
assert not review.get("abstained"), "Incomplete review is not a passing demo"
assert any(step.get("step") == "tool_choice" for step in review["trace"])
clock = time.perf_counter()
draft = get(BASE + "/api/v1/drafts", {"report": review["report"]})
assert draft["status"] == "draft_requires_human_review", "A valid cited draft must be saved"
print(json.dumps({"recorded_at": started, "data": "synthetic_demo_data", "model_tag": model["name"], "model_digest": model["digest"], "model_size_bytes": model["size"], "hardware": {"architecture": platform.machine(), "visible_cpu_count": os.cpu_count()}, "timings_seconds": {"review": review_seconds, "draft": round(time.perf_counter()-clock, 3)}, "review": review, "draft": draft, "approval": "Not exercised; this is a local model run, not a production approval attestation"}, indent=2))
