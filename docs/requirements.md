# Implementation and evidence requirements

Status as of 9 October 2026. This is an implementation inventory, not an organiser
eligibility decision. `BUILD_PROMPT.md` was not present in this checkout.

| Requirement | Current implementation | Verification / remaining work |
|---|---|---|
| Procurement review workflow | Next.js desk; source-scoped record selection; deterministic estimate and competition checks; cited notes | Synthetic fixtures only. No practitioner validation or complete tender assessment. |
| Own MCP server, 3+ tools, write tool | `search_tenders`, `get_tender_record`, `analyze_value_for_money`, `draft_review_memo` | Python protocol tests pass. Write action creates validated local drafts, never procurement decisions. |
| Borrowed MCP server | Pinned filesystem server reads review playbook | Reuse reason documented; subprocess is path-scoped, not an OS security sandbox. No Postgres MCP server is claimed. |
| Agentic LangGraph loop | Ollama mode discovers MCP tools; Qwen chooses tools; server scopes arguments; eight-choice budget; evidence retry then abstention | Fake-planner control-flow tests pass. Actual Qwen choices remain unverified until a real run completes. Stub mode retains the fixture graph. |
| Open-weights task | Qwen 2.5 via Ollama, JSON choice/note validation | Real inference, model digest and timings are pending. Script `scripts/evaluate_qwen.py` records actual runs and rejects stubs/incomplete reviews. |
| Exact source identity | Dataset id + OCID + record id; JSON Pointer citations; canonical draft validation | Fixture tests pass. Historical source/archive validation still required. |
| Human approval gate | LangGraph `interrupt` after draft; portable checkpoint persisted in Neon; immutable canonical report hash; authenticated approve/reject | Local checkpoint and API tests pass. Actual named officer registry and live production gate are not configured/verified. Client names/booleans never confer authority. |
| Distinct filed reports | Serialized Neon transaction checks exact approval and snapshot, resumes graph, inserts one internal filed report | Retry/restart and rejection/tamper tests pass against embedded Postgres. No external filing integration or separate institutional filing role. |
| Auth/storage/database | Neon session proxy; verified JWT in Function and engine; private object bucket; owner-scoped tables | Owner successfully deployed Neon infrastructure and migrations; hosted domain renders login. Authenticated end-to-end persistence and approval need verification. |
| Historical Kenya energy/solar data | Provenance-preserving import script; configurable dataset; closed/datetime/currency filters; archive SHA | No real data imported. Need verified source, publisher, redistribution licence and source archive. Network registry request was blocked; access saved for review. Synthetic fixtures remain the default. |
| Deterministic assessment | First-award estimate comparison and recorded tenderer count | No `benchmark_prices`, `check_budget`, unit-price analysis, amendments or complete energy-specific assessment. Form must not claim these. |
| Audit | MCP/model choices with reasons; request-scoped events in owner-scoped Neon; human decision and filing events | Local tests pass. No tamper-evident chain, independent retention, institutional roles or sensitive-data redaction. |
| Evaluator demo | Hosted sign-in; self sign-up | Named evaluator account, authenticated demo and a public recording of a real run are pending. Login rendering alone is insufficient. |
| Public repo and licence | Existing public repository and MIT licence | Current readiness changes need review and deployment. No institutional adoption or endorsement claimed. |
| 30–60 second video | None | Must record and publish a genuine demonstrated workflow; never label a stub as Qwen. |
| Challenge deadline/rules | Owner supplied 15 October 2026 | Exact organiser rules, cutoff time/timezone and eligibility require original challenge materials. |

## Verified checks

- Original Python suite: 33 passed with MCP subprocess IPC available. Sandboxed
  execution hung; the working run did not reproduce the reported cancel-scope error.
- Expanded Python suite: 40 passed, including durable human checkpoint, bounded
  choices, evidence retry/abstention, canonical report refusal and import filters.
- Neon API suite: 13 passed against embedded Postgres, signed test JWTs and fake
  object store/engine. Approval/filing tests include exact hashes, forged identity,
  rejection, wrong-owner access, restart, tampering and retry idempotency.
- Next.js production build and Neon TypeScript checks pass.
- Compose frontend/backend images built with verified TLS and optional managed
  proxy CA build mounts. CPU-only Ollama starts; Qwen blob download is denied by the managed proxy. Web/engine Compose smoke passes (HTTP 200 desk/search; missing weights return 503). Full model workflow remains pending.

## Remaining owner inputs

1. Actual approval officer's name and Neon user subject ID, configured in
   `BEISAWA_APPROVERS` in the Function. Account signup does not grant approval.
2. Named evaluator's name/email and secure account provisioning.
3. Verified historical Kenya energy/solar source and licence; source archive.
4. Original challenge/build materials and final video publishing destination.

Keep the README's not-submission-ready notice until the actual approval path,
real model run, and evaluator demo are verified. Align form answers with the
features and evidence above; do not claim absent tools or data.
