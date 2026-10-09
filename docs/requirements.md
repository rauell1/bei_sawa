# Revised build requirements: implementation and evidence

This status sheet distinguishes implemented prototype behavior from design audit targets and owner-dependent work. It is not a security review, deployment attestation, or competition eligibility decision.

## Prototype and challenge acceptance

| Requirement | Status | Evidence or remaining work |
|---|---|---|
| BeiSawa-specific procurement value-for-money workflow | **Partial** | Review desk, retrieval, deterministic first-award checks, citations, and local drafts exist. No practitioner workflow has been validated. |
| BeiSawa MCP server with 3+ useful tools and a write tool | **Implemented; tested** | Own stdio MCP server exposes `search_tenders`, `get_tender_record`, `analyze_value_for_money`, and local-only `draft_review_memo`. MCP calls use the Python SDK client/server protocol. |
| Borrowed MCP tool with specific reuse benefit | **Implemented; tested** | Pinned `@modelcontextprotocol/server-filesystem` serves the review playbook using its existing path-scoped file-reading implementation. The app invokes `read_text_file`; this is not a claim that the upstream server is a security sandbox. Review upstream version, permissions, and licence again before release. |
| LangGraph workflow | **Partial** | LangGraph runs fixed retrieval → deterministic analysis → constrained model note. One MCP gateway is opened per API process and reused across requests. There is no autonomous tool-selection/replanning loop, durable checkpoint store, or human interrupt. |
| Open-weights Qwen 2.5 at the real model task | **Not verified** | Ollama configuration and response validation are present. The only completed workflow smoke test used the explicit test stub; no actual Qwen task, model digest, hardware measurement, or repeatability report exists. Run on owner-supplied/approved hardware. |
| Grounded deterministic checks | **Partial** | Current invented examples test estimate variance and low tenderer count. Checks are not a complete tender assessment. Currency conversion, lots, multi-supplier award handling, amendments, external budget links, price-per-quantity comparisons, and domain validation are incomplete. |
| Source identity and reproducible citations | **Partial** | App uses `source_id + OCID + OCDS record id` as a URL-quoted `record_key`; findings/citations carry the key and source id. Tests cover ambiguity and citation re-resolution on fixtures. No multi-publisher ingestion or immutable source-version archive exists. |
| No unsupported findings | **Partial** | Missing inputs become limitations; deterministic rules only emit the two configured signals. Draft validation recomputes those rules. Broader unsourced/low-confidence model findings are not implemented as an independent finding pipeline because Qwen currently writes notes only. |
| Exact immutable report revision/hash and authenticated approval | **Not implemented** | Neon login and JWT identity checks are implemented but not live-validated. No named approval endpoint, report hash/revision binding, or anti-replay control. Never treat client-supplied identity or boolean as approval. |
| Drafts distinct from immutable filed reports | **Not implemented** | Drafts are local JSON files. There is no database, filed-report table, filing role, or controlled filing transaction. Draft-writing must not be represented as filing. |
| Least-privilege worker and filing roles | **Not implemented** | No production database or separate worker, reviewer, and filing identities/roles exist. MCP/model credentials are currently local process environment. |
| Actual eligible historical data and data provenance | **Blocked on owner/source** | Four labelled synthetic OCDS-shaped records are bundled. The linked Google Drive folder was not read. Need a dated, licensed historical source with line-item quantities/specifications/prices, linked tender/award/release amendments, budget fields, and publisher/dataset identity. |
| Audit history | **Partial** | MCP/model activity is logged locally and current-request events are persisted by the Neon API with owner-scoped access. Embedded Postgres and access-isolation tests pass; live Neon persistence is unverified. No sensitive-field redaction, approval events, independent retention, or tamper-evident chain exists. |
| Public repository and transparent submission text | **Partial** | Repository is public; branch changes are local to this Arena branch. README and this status sheet are explicit. Provenance and a cautious submission draft are provided; they are not external evaluation evidence. |
| Evaluator access and hosted demo | **Not configured** | No deployed app, evaluator login, or verified hosting/domain/auth setup. Local preview is not public evaluator access. Do not put credentials in chat. |
| 30–60 second public video | **Not done** | No video has been recorded or published. Any future capture must use clearly labelled synthetic data unless owner supplies an eligible, releasable source. |
| Challenge cutoff, track, and eligibility | **Owner / organiser confirmation required** | Governance/value-for-money wording and 15 October 2026 date came from the owner. Exact organiser name, cutoff time/timezone, rules, and eligibility have not been independently checked. |
| Open-source licence | **Owner confirmation required** | A provisional MIT `LICENSE` exists on this working branch. Confirm MIT or Apache-2.0 before publishing this contribution. Full transitive dependency notices still need generation. |
| Institution/practitioner participation | **Owner participation required** | No organisation, interview, or endorsement is claimed. A proposed county internal audit/procurement workflow is only a proposal. |

## Verification run on this branch

- Backend suite: **28 passed** (`.venv/bin/pytest -q`). This is fixture/unit/integration coverage; it does not execute Qwen or validate production controls.
- Frontend: **Next.js production build and TypeScript check passed** (`npm run build --prefix frontend`). The build-generated change to `frontend/next-env.d.ts` was restored.
- Fresh live preview smoke after the composite-key migration, in explicit `stub` mode through the app-lifetime MCP gateway: UI returned HTTP 200; `GET /health` and `GET /tenders` succeeded; source-id filtering returned all four fixtures; `POST /reviews` accepted a `record_key` and returned two synthetic findings with matching citation keys; `POST /drafts` saved a local `draft_requires_human_review`; bare-OCID review request returned HTTP 422. This is a test-stub smoke, not a Qwen run.
- Docker Compose, clean image build, model pull, full Qwen run, real-data evaluation, authentication, production deployment, public video, and evaluator account have not been verified.

## Owner-blocked decisions and inputs

1. Choose MIT or Apache-2.0 for this contribution.
2. Supply or approve a historical OCDS-compatible data source and redistribution basis; otherwise retain synthetic fixtures and do not claim historical-data evaluation.
3. Identify the institution/practitioner to consult, or explicitly proceed with the workflow described as a proposal only.
4. Provide the named reviewer and permission to publish their name only through a secure/authenticated channel. No identity will be invented.
5. Confirm personal-data interpretation, date window/timezone, hosting and authentication route, hardware/budget, final video account, and whether the demo remains Frankfurt-hosted if deployed there.

Do not send passwords, API tokens, or other secrets in chat. Credentials should be entered into the relevant hosting or secret-management interface by the owner.

## Update — 9 October 2026

The earlier deployment and persistence entries above are stale. The owner
successfully deployed the Python engine on Render, the Neon Function and private
bucket, and ran schema migration. The custom domain renders the hosted login.
Authenticated end-to-end evaluator access is still not verified.

The new approval implementation provides named officer authorization, immutable
canonical draft hashes, a persisted LangGraph human interrupt, approve/reject,
and idempotent internal report filing in Neon. See `docs/approval.md` and EVALS
for test evidence and deployment steps. Production approval remains disabled
until the actual officer's Neon subject/name registry is configured. There is no
separate institutional filing role, real Qwen evidence, historical energy data,
or video yet. Keep the not-submission-ready status.
