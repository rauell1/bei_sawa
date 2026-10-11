# Reproduce the Governance prototype

From a clone, run `docker compose up --build` with Docker/Compose installed. Open
`http://localhost:3000/demo/run`, select the first **synthetic** record and run.
Qwen chooses tools; the display shows actual completed calls with timestamps and
expandable inputs/outputs. The agent prepares a cited draft and stops. Demonstrate
validation refusal with “Show altered-report refusal”. No production approval is
pretended in this local mode. An incomplete-data record should abstain, not file.

Defaults: Qwen 2.5 3B, four invented records, no external procurement action.
Ollama's image digest and Node/Python package versions are pinned. Verified here: pinned Python 3.11 and Node 22 builds, cached-weight startup,
live page, health with actual model digest, and four-record search. A fresh
empty-volume registry download is unverified. First startup
needs network access and enough RAM/disk; see README. The model-init container
reuses an installed tag or pulls it if absent. Record the actual model digest;
a tag alone is not a weight identity. Weights have a separate Qwen research licence.

For Linux development with Python 3.11+, Node 22 and Ollama already installed and
serving `qwen2.5:3b`, `./dev.sh` installs pinned dependencies and starts both apps.
`BEISAWA_LLM_MODE=stub ./dev.sh` is an explicit fixture preview, not a Qwen run.
Do not start a competing dev server in the same Next checkout. Use available
ports via `API_PORT`/`WEB_PORT`; stop only services you started.

## Checks and evidence

```bash
.venv/bin/pytest
npm run test:neon
npm run typecheck:neon
npm run build --prefix frontend
```

CI runs these with Python 3.11 and Node 22, without production credentials. Most
assertions use synthetic fixtures and fakes. They are not additional model runs.
To measure real model variation through a running local web stack:

```bash
EVAL_WEB_URL=http://localhost:3000 .venv/bin/python scripts/evaluate_repeated.py --repeats 3 --output var/evidence/repeated.json
```

The runner requires real Qwen and synthetic provenance, keeps each pass/failure,
measures latency/token counts, and exercises altered reports, missing records
and incomplete-evidence abstention. It refuses to overwrite prior evidence.
Its output is local; publish only inspected synthetic artifacts. It does not
log into production or approve a report. Cost reporting distinguishes measured
usage from unmeasured electricity, hardware and hosted-platform billing.

## Demo and deployment boundary

The public `/demo` links the continuous **126-second** recording and JSON evidence
for 11 October 2026. It contains no cuts, acceleration, slides or fake model calls;
frames preserve elapsed wall-clock time. It includes visible refusal. The older
35-second video is evidence playback and is not the required live demo.

Upload the new video publicly to YouTube/Vimeo and put its URL in the submission.
A repository MP4 alone does not satisfy that publication rule. The owner reports
external submission steps completed; a video URL was not supplied to this checkout.

Production uses Neon/Vercel/Render and a named officer registry; see deployment
and approval guides. Computer-hosted Qwen uses `docs/local-qwen.md`. Verify actual
sign-in, review, save, exact-revision approval, filing and private export before
claiming that deployment works. Local reproduction needs none of those secrets.
