# Evaluation plan and observed prototype results

**As of 2026-10-08.** BeiSawa is a procurement-record triage prototype, not an award recommendation or compliance system. Every bundled record is invented and labelled synthetic. The scenarios below define checks for the current fixtures; passing them is not evidence that the app performs well on public or real procurement data.

## Ten intended review scenarios

| # | Scenario | Pass criteria | Current evidence/status |
|---|---|---|---|
| 1 | Synthetic record `...0001`: estimate KES 10,000,000; one award KES 11,800,000; one tenderer. | Deterministic 18% estimate-variance and competition prompts; all source-backed values resolve through citations; synthetic label visible. | **Rule/citation assertions pass.** Test-stub workflow passes. No Qwen evaluation. |
| 2 | Synthetic record `...0002`: four tenderers, award below estimate. | No estimate-variance or competition flag. “No automated signal” is not assurance. | **Rule assertions pass.** No actual-model wording evaluated. |
| 3 | Synthetic record `...0003`: missing values/count. | No finding; skipped checks and missing-input limitations. | **Rule assertions pass.** |
| 4 | Synthetic record `...0004`: two tenderers, award below estimate. | Neutral competition prompt only, citing `numberOfTenderers`; no overrun allegation. | **Rule/citation assertions pass.** |
| 5 | Alter a cited value before draft creation. | Reject and write no file. | **Automated test passes.** |
| 6 | Remove citations, alter another record's OCID, release id, or finding text. | Reject; do not save a mismatched report. | **Automated draft-validation tests pass** for these cases. |
| 7 | Inspect own MCP tool list and call both MCP servers. | Search, scoped retrieval, analysis and local draft tools exist; borrowed server performs a concrete read; tool activity is logged. | **MCP stdio integration test passes.** Current JSONL log is local application logging, not tamper-proof. |
| 8 | Ollama/Qwen unavailable. | Health and review make unavailability explicit; never call stub output Qwen. | **Review failure path and stub labelling are tested.** Current API health does not establish that a real Qwen model is installed. |
| 9 | Save a valid review memo. | New local draft is marked for human review; citations retained; decision and approver remain empty; no external action. | **Automated draft test passes.** No human approval or filing exists. |
| 10 | Put prompt-like instructions in a synthetic OCDS description. | Untrusted record content cannot change the system prompt or enable prohibited actions. | **Prompt isolation test passes** for the tested description field; this is not a comprehensive prompt-injection evaluation. |

Additional tests cover dataset-scoped keys, duplicate references, source-id search, record-key API requests, source citation identity, multiple-award/zero-estimate abstention, MCP child-environment allowlisting, and reuse of app-lifetime MCP sessions across requests.

## Checks actually run on this working tree

- `.venv/bin/pytest -q`: **28 passed**. Includes fixture/unit tests, a real stdio MCP client/server integration test, and an API review request using the explicitly configured test stub. No real-data or Qwen task is run by this suite.
- `npm run build --prefix frontend`: **passed** for the current Next.js compilation and TypeScript. Next.js rewrites `frontend/next-env.d.ts` during builds in this checkout; that generated change was restored. Rerun from a clean checkout before release.
- Fresh live preview smoke after the composite-key migration, in explicit `stub` mode and through app-lifetime MCP sessions: UI `GET /` returned 200; health identified `test_stub`; tender search returned `source_id`, `record_key`, OCID and record id, and filtering by source id returned all four fixtures; review by `record_key` returned two fixture findings with matching citation keys; local draft returned `draft_requires_human_review`; legacy bare-OCID review request returned HTTP 422. This verifies the prototype route end-to-end only, not Qwen or production behavior.

## Observed blocker and next evaluation step

The current sandbox has neither `ollama` nor `docker` installed. **No Qwen 2.5 inference, first-run model pull, resource measurement, or quality result has been observed.** This is an execution blocker, not evidence that Qwen succeeds or fails. Next, run the Compose or native Ollama path on owner-approved hardware; record exact model tag/digest, configuration, resource use, output validation, and results for all ten cases. Do not substitute stub outputs in that report.

## Required evaluation before submission or deployment

1. Obtain an eligible, documented and licensed historical dataset with dataset/publisher identity, OCIDs, record/release amendments, line-item quantities/specifications/prices and linked budget context. Keep source snapshots and transformation lineage; do not claim efficacy from synthetic fixtures.
2. Define expected results with procurement practitioners and use a held-out set; report abstentions, false positives/negatives, citation validity, and model review-note issues. Do not describe a small fixture suite as accuracy or savings.
3. Execute repeated end-to-end Qwen 2.5 runs under a pinned model digest, assess determinism/latency/resource consumption, test unavailable/malformed-model behavior, and inspect prompts, outputs and MCP traces.
4. Test authenticated named approval against the exact immutable review revision/hash, replay/tampering behavior, and least-privilege worker/filing roles after those controls exist. The present prototype has none of them.
5. Verify clean container builds, empty-volume recovery, hosting region, authentication, retention and evaluator access before making deployment claims.
6. Record a real, unaltered demo video only after the chosen data and account permissions are approved; clearly label synthetic content when used.

## Neon integration validation (8 October 2026)

- Python suite: **33 passed**, including independent JWT verification, denial of
  forged/expired/wrong-issuer/anonymous tokens, request-scoped audit extraction,
  and blocking the hosted engine's aggregate audit endpoint.
- `npm run test:neon`: **10 passed** with signed JWTs, embedded PostgreSQL, fake
  object storage and engine. Covers owner isolation, durable draft metadata and
  download after handler restart, canonical report rejection, storage/transaction
  failures, and preserving bytes when a commit's outcome is unknown.
- Neon TypeScript check, Function bundling, frozen npm installs, and Next.js
  production build passed. The real API entry and private draft bucket config
  loaded successfully with a test engine URL.
- HTTP frontend checks with a local Auth protocol fixture: unauthenticated page
  redirected to `/login`, API returned 401, and cross-origin draft mutation was
  rejected. Explicit local mode still completed a review and citation-validated
  draft save against the Python/MCP engine.
- **Not run live:** production Neon Auth signup/sign-in/sign-out/email recovery,
  real Neon database/S3 calls, Function deployment, Vercel domain/DNS, or Qwen
  inference. Neon credentials and a deployed Python engine URL are still needed.
  These local results do not satisfy the live verification required before merge.

## Approval gate verification — 9 October 2026

Local checks: original Python suite 33 passed with subprocess IPC available;
new LangGraph checkpoint test passes after JSON export/import and rejects wrong
owner/hash, unnamed approver, and rejection. Neon suite: 13 tests passed, including
missing approval, forged identity fields, wrong revision, rejection, cross-owner
access, handler restart, tampered snapshot, and idempotent filing. Frontend
production build and Neon TypeScript checks pass. These checks use test officer
identities, embedded Postgres and mock storage/engine; production officer setup
and real Neon approval/filing are not verified. Sandboxed MCP testing initially
hung; the same original suite passed with required subprocess IPC access.

## Bounded tool loop — 9 October 2026

Three new tests use explicit fake planner choices: tools are dynamically discovered,
arguments remain scoped, incomplete evidence causes a second retrieval then
abstention without drafting, and repeated choices stop at the eight-choice budget.
They passed with async IPC available. They are control-flow tests, not evidence
that Qwen chose tools or produced a useful review.
