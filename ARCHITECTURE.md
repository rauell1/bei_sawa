# BeiSawa architecture

**Governance · Financial services / Value for money.** Retrospective triage of
published tender and award records for a county internal audit officer, with Makueni County Government as the proposed use case; no partnership is claimed. This is
the award-history half of the tender cycle: no bid documents, bidder ranking,
award recommendation or full committee evaluation is claimed. Default data is
four invented OCDS-shaped records. The supplied brief permits synthetic data.

```text
Vercel review desk → Neon session → authenticated Neon Function
                                      ├─ Postgres: private audit, human gate, filed snapshot
                                      ├─ private S3-compatible storage: draft bytes
                                      └─ Render Python → LangGraph → MCP tools → Ollama/Qwen
```

Local `docker compose up --build` runs the web, Python/MCP and Qwen services.
Local preview has no production officer authority; hosted requests verify Neon
JWTs independently in the web proxy, Function and engine. No browser receives
storage, database or desktop-inference credentials.

| MCP server | Role | Why this boundary exists |
|---|---|---|
| Own `bei-sawa-ocds-review` | `search_tenders`, `get_tender_record`, `analyze_value_for_money`, `draft_review_memo` | Reusable source-scoped lookup, deterministic cited checks and a real validated draft write. |
| Borrowed official filesystem, pinned `2025.8.21` | `read_text_file` loads the review playbook | Reuses its established MCP file-reading and directory-resolution implementation instead of rebuilding it. Upstream MIT notice is retained. |

The borrowed process is directory-scoped, not an OS read-only sandbox. Only its
read tool is offered by the application. MCP child environments are allowlisted.

In real-model mode, LangGraph asks Qwen 2.5 to choose state-valid tools, fixes
record-scoped arguments, executes, checks evidence, and loops for at most eight
choices. Failed reads may recover within that budget; writes with uncertain
outcomes are not retried automatically. Thin evidence triggers another retrieval
then abstention. Final model notes must reference valid citation IDs. Explicit
stub mode is a labelled test fixture, never an open-weights run.

Every finding binds dataset ID, OCID, record ID, release ID, JSON Pointer and
observed value. Draft creation re-resolves citations and recomputes the canonical
analysis. The two signals are first-award/estimate variance and recorded tenderer
count; no market-price, budget or invoice source is connected. Historical imports
require completed, dated records and manual personal-data review. Known contact
fields are refused; this does not replace inspection of narrative text.

A draft pauses at a LangGraph human interrupt. Neon persists its checkpoint and
content hash. The authenticated subject must match the named officer registry
and workspace owner. Approval/rejection binds that exact revision. Internal
filing checks the immutable approval and snapshot in a serialized transaction;
retries return the same report. Reading/export verifies ownership and integrity.
No external procurement action exists, and the model receives no approval tool.

Completed MCP/model calls retain inputs, outputs, timestamps, durations, failures
and available token counts. Hosted request logs and human decisions are stored
privately in Neon; scratch JSONL is local and not tamper-proof. Real-run and
refusal evidence are in EVALS. Production approval, desktop tunnel and total
hardware/electricity cost remain unverified. Qwen can run on the owner's computer
through a secret-protected loopback gateway and HTTPS tunnel; native Ollama is
never published. See `docs/local-qwen.md` for that separate deployment path.
