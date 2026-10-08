# Current BeiSawa architecture (prototype)

This document describes code on the current working branch, not the audited target production architecture. **The current build is not submission-ready**; see [`docs/requirements.md`](docs/requirements.md).

## Runtime path

```text
Browser
  └─ Next.js review desk
       └─ same-origin /api/v1/* rewrite
            └─ FastAPI
                 ├─ MCPGateway → BeiSawa stdio MCP server
                 │    ├─ search_tenders
                 │    ├─ get_tender_record
                 │    ├─ analyze_value_for_money
                 │    └─ draft_review_memo (local draft only)
                 ├─ MCPGateway → upstream filesystem MCP server (read playbook)
                 ├─ LangGraph fixed flow: retrieve → deterministic checks → Qwen note
                 └─ local JSONL activity log and draft files
```

The browser uses relative `/api/v1/*` paths; it does not call a browser-local `localhost` backend. FastAPI's lifespan opens one own-server and one filesystem MCP stdio session per API process and reuses those sessions across requests; they are closed on shutdown. Direct workflow tests without an app lifespan create a temporary gateway. MCP child environments are allowlisted rather than copied wholesale from the API process. There is no durable LangGraph checkpoint, database, identity provider, or production deployment.

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

LangGraph executes a fixed retrieval → analysis → reflection graph. Qwen does not select tools, re-plan, or author deterministic findings. The Ollama adapter asks Qwen 2.5 for constrained JSON reviewer notes and checks citation IDs. Qwen/Ollama has not completed an actual end-to-end run in this environment. `BEISAWA_LLM_MODE=stub` is a labelled deterministic test/UI preview, not Qwen and not an evaluation of model quality.

## Draft, approval, and filing boundary

The MCP write action saves a citation-validated JSON draft in a local runtime directory. The hosted Neon API then writes its private document to Object Storage and owner-scoped metadata to Postgres. Next.js sessions and both API/engine JWT checks use Neon Managed Auth. This integration is implemented and locally tested; live Neon deployment is still unverified. Drafts are not immutable filed reports. There is no named approval, report revision/hash signature, filing workflow, or procurement-system integration. No award, reject, cancel, publish, or government-submission action exists. Do not treat a client-supplied identity or approval flag as authority; approval would also need exact revision/hash binding, replay protection, database role separation, and a separately controlled filing action.

## Logs and deployment

The engine writes completed MCP and model calls to scratch JSONL with request ids, inputs/outputs, timestamps, and durations. For hosted reviews/drafts it returns only the current server-generated request's events to the Neon API, which persists them under the verified reviewer's identity. The engine's aggregate audit endpoint is disabled in hosted mode. Because retrieval outputs are included, events may contain full source-record fields. This is not tamper-proof, independently retained, or a complete approval audit trail. Do not connect personal or sensitive procurement records until data classification, redaction, and retention are designed. `var/` is local scratch space excluded from Git; live Neon persistence remains unverified. See [deployment](docs/deployment.md).

A Docker Compose configuration and local Ollama integration are present but Compose builds, first-run model pull, Qwen execution, empty-volume recovery, hardware use, and hosting have not been verified here. If Frankfurt demo hosting remains the plan, disclose that region; no in-country residency claim is made. See the requirements and evaluation status for the exact verification boundary.
