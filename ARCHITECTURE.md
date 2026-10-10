# Current BeiSawa architecture (prototype)

This document describes code on the current working branch, not the audited target production architecture. **The current build is not submission-ready**; see [`docs/requirements.md`](docs/requirements.md).

## Runtime path

```text
Browser
  └─ Next.js review desk
       └─ same-origin session-authenticated /api/v1/* proxy → Neon Function
            └─ FastAPI
                 ├─ MCPGateway → BeiSawa stdio MCP server
                 │    ├─ search_tenders
                 │    ├─ get_tender_record
                 │    ├─ analyze_value_for_money
                 │    └─ draft_review_memo (local draft only)
                 ├─ MCPGateway → upstream filesystem MCP server (read playbook)
                 ├─ LangGraph bounded loop: Qwen plan → execute → self-check → repeat/summarize
                 └─ local JSONL activity log and draft files
```

The browser uses relative `/api/v1/*` paths; it does not call a browser-local `localhost` backend. FastAPI's lifespan opens one own-server and one filesystem MCP stdio session per API process and reuses those sessions across requests; they are closed on shutdown. Direct workflow tests without an app lifespan create a temporary gateway. MCP child environments are allowlisted rather than copied wholesale from the API process. Hosted requests use Neon sessions/JWTs, Postgres and private Object Storage. Drafts carry portable LangGraph human-interrupt checkpoints persisted in Postgres. The deployed login was observed; authenticated production review/approval is not yet verified.

## Data identity and provenance

`backend/beisawa/data/ocds_demo.json` is a small fixture manifest labelled `synthetic_demo_data`. Its current `dataset_id` is `beisawa-synthetic-ocds-demo-v1`. Raw OCDS-shaped records are not rewritten. App-level identity is derived from `(source_id, ocid, record id)` and encoded as a URL-quoted `record_key`; OCID alone is rejected for lookup. This is an internal prototype convention, not a completed multi-publisher ingestion model.

The bundled records are invented. They are not real procurement records, suppliers, people, budgets, or findings. The link to the owner's Google Drive folder is just a link; the application does not read or mirror its contents.

## Deterministic evidence checks

`analysis.py` currently implements two narrow prompts:

1. Compare a tender estimate to the first award value if both amounts and matching currencies are available; produce a review signal when the first award is more than 10% higher.
2. Produce a neutral competition-review prompt when a valid tenderer count is below three.

Every signal includes relevant JSON Pointer citations, source id, composite record key, OCID, record id, release id, and observed source value. Missing required fields are surfaced as limitations instead of low-confidence findings. Draft validation resolves each citation against the selected source object and recomputes server-side analysis. This still has material scope gaps: amounts are not normalized across currencies, multiple awards/suppliers and lot-level comparisons are not fully handled, amendments are not preserved in an immutable version store, and no external budget, item-quantity, or market-price data is linked.

“No automated signal found” means only that neither configured rule emitted a signal on the available fields; it does not establish fairness, legality, value, or absence of risk.

## MCP and model behavior

BeiSawa uses the MCP Python SDK client/server protocol for its own stdio server. The own server exposes search, scoped source retrieval, deterministic analysis, and a local citation-validated draft write. The borrowed `@modelcontextprotocol/server-filesystem` package is pinned in the Node manifest to `2026.8.31`; the app invokes it through MCP to read the playbook. The concrete reuse benefit is avoiding a custom implementation of MCP file reading and allowed-directory path resolution. The review workflow does not intentionally call filesystem mutation tools, but the upstream server process is not an OS-level read-only sandbox; its exact effective permissions must be reviewed before deployment.

Ollama mode uses a bounded tool loop: Qwen selects search, retrieval, deterministic analysis, draft, finish or abstain from the discovered MCP inventory. Server code supplies scoped arguments, requires retrieval before analysis and adequate analysis before drafting, and refuses unlisted tools. Self-check retries retrieval on incomplete evidence and abstains when coverage stays thin. Tool choices and reasons are audited. The budget is eight choices. Final notes remain citation-ID validated. Explicit stub mode retains the fixed fixture graph. This does not establish model quality; real-run evidence belongs in EVALS.

## Draft, approval, and filing boundary

The MCP write action validates and saves a local draft. The Neon API stores private bytes, an immutable canonical report hash and snapshot, and a portable LangGraph human-interrupt checkpoint. A named officer's JWT subject must match the operator-maintained registry and draft owner. Approval/rejection is immutable and binds the hash. Filing locks the draft row, checks approval and snapshot, resumes the graph, and inserts one filed snapshot in Postgres; retries return the existing report. No external procurement submission occurs. Legacy unhashed drafts need a new revision. See `docs/approval.md` for setup and limitations, including separate institutional roles and database-administrator access.

## Logs and deployment

The engine writes completed MCP and model calls to scratch JSONL with request ids, inputs/outputs, timestamps, and durations. For hosted reviews/drafts it returns only the current server-generated request's events to the Neon API, which persists them under the verified reviewer's identity. The engine's aggregate audit endpoint is disabled in hosted mode. Because retrieval outputs are included, events may contain full source-record fields. Human decision and filing events are also stored transactionally in Neon. This is not tamper-proof or independently retained. Do not connect personal or sensitive procurement records until data classification, redaction, and retention are designed. `var/` is local scratch space excluded from Git; Authenticated production persistence and approval remain unverified. See [deployment](docs/deployment.md).

Compose builds and a genuine local Qwen 3B tool loop are verified. Planning uses compact state summaries and exposes only discovered tools whose prerequisites are satisfied, preventing repeated searches once results exist. Web/Function deadlines are 250/240 seconds for bounded CPU inference. Fresh registry pull, empty-volume recovery and hosted Qwen remain unverified. If Frankfurt demo hosting remains the plan, disclose that region; no in-country residency claim is made. See the requirements and evaluation status for the exact verification boundary.

## Filed-report reading and desktop inference

The desk loads records, health and audit independently so an auxiliary failure
does not discard records. A private report reader uses the session-authenticated
web proxy and owner-scoped Neon detail API. Detail and JSON export verify the
canonical snapshot hash and approval binding before returning content. Printing
uses the same read-only snapshot; no external submission is implied.

For the owner's selected desktop model hosting, Render sends an HTTPS bearer
secret to a named Cloudflare tunnel. The tunnel targets the loopback gateway on
port 11435; native Ollama remains on port 11434. The gateway exposes only tags
and bounded, non-streaming chat for one model, never forwards the bearer secret,
and serializes inference. Its token is stored encrypted for the Windows user
and entered securely in Render. No browser or Neon configuration needs that
secret. Local authorization/limit tests pass; desktop/tunnel deployment remains
unverified. See `docs/local-qwen.md`.
