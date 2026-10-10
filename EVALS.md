# Evaluation plan and observed prototype results

**Latest verification: 10 October 2026.** 43 Python tests and 14 Neon API tests pass; frontend production build and Neon TypeScript checks pass. A genuine Qwen 2.5 3B review completed through Compose web → Python → MCP → Ollama in **98.554 seconds**, followed by a 0.018-second draft save. The [complete recorded run](frontend/public/evidence/qwen-2026-10-09.json) includes model digest, source, citations, tool choices and request-scoped audit. `/demo` displays this synthetic run without login. Historical-data evaluation, hosted Qwen and production approval/evaluator access remain pending. Earlier results below are historical, not the current inference status.

**Initial fixture baseline, 8 October 2026.** BeiSawa is a procurement-record triage prototype, not an award recommendation or compliance system. Every bundled record is invented and labelled synthetic. The scenarios below define checks for the current fixtures; passing them is not evidence that the app performs well on public or real procurement data.

## Ten intended review scenarios

| # | Scenario | Pass criteria | Current evidence/status |
|---|---|---|---|
| 1 | Synthetic record `...0001`: estimate KES 10,000,000; one award KES 11,800,000; one tenderer. | Deterministic 18% estimate-variance and competition prompts; all source-backed values resolve through citations; synthetic label visible. | **Rule/citation assertions pass.** Test-stub workflow passes. One genuine Qwen run; see recorded evidence below. |
| 2 | Synthetic record `...0002`: four tenderers, award below estimate. | No estimate-variance or competition flag. “No automated signal” is not assurance. | **Rule assertions pass.** No actual-model wording evaluated. |
| 3 | Synthetic record `...0003`: missing values/count. | No finding; skipped checks and missing-input limitations. | **Rule assertions pass.** |
| 4 | Synthetic record `...0004`: two tenderers, award below estimate. | Neutral competition prompt only, citing `numberOfTenderers`; no overrun allegation. | **Rule/citation assertions pass.** |
| 5 | Alter a cited value before draft creation. | Reject and write no file. | **Automated test passes.** |
| 6 | Remove citations, alter another record's OCID, release id, or finding text. | Reject; do not save a mismatched report. | **Automated draft-validation tests pass** for these cases. |
| 7 | Inspect own MCP tool list and call both MCP servers. | Search, scoped retrieval, analysis and local draft tools exist; borrowed server performs a concrete read; tool activity is logged. | **MCP stdio integration test passes.** Current JSONL log is local application logging, not tamper-proof. |
| 8 | Ollama/Qwen unavailable. | Health and review make unavailability explicit; never call stub output Qwen. | **Review failure path and stub labelling are tested.** Current API health does not establish that a real Qwen model is installed. |
| 9 | Save a valid review memo. | New local draft is marked for human review; citations retained; decision and approver remain empty; no external action. | **Automated draft test passes.** New human approval/filing controls have separate tests below. |
| 10 | Put prompt-like instructions in a synthetic OCDS description. | Untrusted record content cannot change the system prompt or enable prohibited actions. | **Prompt isolation test passes** for the tested description field; this is not a comprehensive prompt-injection evaluation. |

Additional tests cover dataset-scoped keys, duplicate references, source-id search, record-key API requests, source citation identity, multiple-award/zero-estimate abstention, MCP child-environment allowlisting, and reuse of app-lifetime MCP sessions across requests.

## Historical checks — 8 October 2026

- `.venv/bin/pytest -q`: **28 passed**. Includes fixture/unit tests, a real stdio MCP client/server integration test, and an API review request using the explicitly configured test stub. No real-data or Qwen task is run by this suite.
- `npm run build --prefix frontend`: **passed** for the current Next.js compilation and TypeScript. Next.js rewrites `frontend/next-env.d.ts` during builds in this checkout; that generated change was restored. Rerun from a clean checkout before release.
- Fresh live preview smoke after the composite-key migration, in explicit `stub` mode and through app-lifetime MCP sessions: UI `GET /` returned 200; health identified `test_stub`; tender search returned `source_id`, `record_key`, OCID and record id, and filtering by source id returned all four fixtures; review by `record_key` returned two fixture findings with matching citation keys; local draft returned `draft_requires_human_review`; legacy bare-OCID review request returned HTTP 422. This verifies the prototype route end-to-end only, not Qwen or production behavior.

## Genuine Qwen run — 9 October 2026

- Started `2026-10-09T04:57:03.637899+00:00`; x86_64, five visible CPUs; Ollama 0.40.2.
- Tag `qwen2.5:3b`; imported model manifest digest `c1c6d19800580315abb225007edc479fa03633774bc132e5106928af89a3d070`. Official weights/template/system/licence were checksum-verified and imported with `ollama create`; this local manifest digest is not claimed to equal the registry manifest digest.
- Qwen chose search → retrieval → deterministic analysis → draft → finish. Notes cited C2–C6, correctly described the synthetic 18% estimate variance and limited competition as review signals, and asked neutral verification questions. Some choice reasons repeated retrieval wording after retrieval; this is a visible model limitation.
- The first attempt repeatedly searched and exhausted the eight-choice budget. A second progressed to drafting but exceeded the old web proxy timeout. State-valid tool availability, smaller planning context and bounded 240-second engine/250-second web deadlines enabled the observed pass. These are feasibility results from one selected record, not benchmark accuracy or repeatability.
- Earlier proxy-denied weights became accessible. Direct Ollama download still failed on redirect DNS; importing the verified official GGUF worked through the configured TLS proxy. The full GPU image exceeded VFS disk; the unchanged upstream CPU binaries ran successfully.
- Reproduce with `scripts/evaluate_qwen.py` inside the Compose API container, redirecting stdout to a JSON artifact. It rejects stub mode and abstained reviews. This run used local mode and did **not** authenticate to Neon or approve/file a production report.

## Required evaluation before submission or deployment

1. Obtain an eligible, documented and licensed historical dataset with dataset/publisher identity, OCIDs, record/release amendments, line-item quantities/specifications/prices and linked budget context. Keep source snapshots and transformation lineage; do not claim efficacy from synthetic fixtures.
2. Define expected results with procurement practitioners and use a held-out set; report abstentions, false positives/negatives, citation validity, and model review-note issues. Do not describe a small fixture suite as accuracy or savings.
3. Execute repeated end-to-end Qwen 2.5 runs under a pinned model digest, assess determinism/latency/resource consumption, test unavailable/malformed-model behavior, and inspect prompts, outputs and MCP traces.
4. Test authenticated named approval against the exact immutable review revision/hash, replay/tampering behavior, and least-privilege worker/filing roles in production. Named officer authorization, hash binding and idempotent filing are implemented and locally tested; separate database worker/filing roles remain absent.
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

The historical importer test uses invented input and verifies record preservation,
closed-status filtering, and refusal of future awards. It is not historical-data
evaluation. A canonical draft test also refuses added approval flags and abstention
markers. Final Python regression suite now includes these tests.


## Final Compose wiring check — 9 October 2026

CPU-only Ollama, Python API and Next.js web started in the managed daemon. The
web desk returned HTTP 200; web-proxied tender search returned 200 and all four
synthetic records. Health reported Ollama mode with no available model; review
returned 503 rather than a disguised stub. This exercised the actual Docker
web/engine/MCP path, **not inference, Neon approval or evaluator access**. Optional
managed-proxy CA mounts preserved TLS verification. The ordinary full Ollama image
was downloaded and verified but exceeded the VFS disk during writable-layer
creation; task-owned obsolete cache/container data was reclaimed. The CPU image
uses unchanged CPU binaries/libraries and licences from upstream AMD64 digest
`sha256:31650ae0d08bde9c8bbd845d27f2da31acddf6ff735523869d8e5ee7a9969b03`.

The final Python suite is **40 passed**, Neon suite **13 passed**. The missing-model check above preceded the genuine run recorded earlier in this document. No real-data quality metric is claimed.

## Public recorded-run walkthrough

`/demo` builds as a static public route with no Neon credential dependency. A real headless Chromium browser loaded it without a session and displayed the actual record, citations, model note and choices. The 35-second MP4 browses that page at 1280×900; it is labelled recorded playback, not an unaltered live-inference video or production approval demonstration. The JSON remains the complete run evidence. Production challenge-video requirements still need checking against the original rules.

## Reviewer workspace and desktop gateway — 10 October 2026

Owner-scoped filed-report detail and JSON download reject other owners with 404
and altered canonical snapshots with 409. The new API test exercises both
ordinary access and download, using embedded Postgres and signed test JWTs.
The web workspace lists filed reports and provides an authenticated reader with
BeiSawa branding, exact hash, named approval, citations, printing and JSON export.
Records are retained when separate status/audit requests fail; unavailable
provenance is labelled rather than inferred. Approval loading errors do not
present a false lack of authority. These UI paths compile; authenticated
production reading/printing has not yet been exercised.

The owner chose Windows-hosted Ollama. Three gateway tests exercise missing/wrong
secrets, narrow routes and model, fixed loopback forwarding without credentials,
request size and output/context caps, upstream error handling and HTTPS secret
transport. Omitted limits receive bounded defaults. These use a fake model, not
new inference evidence. Full Python suite: 43 passed; Neon API: 14 passed; Neon
TypeScript checks and Next.js production build pass. See `docs/local-qwen.md`.
The Windows encryption helper, Cloudflare tunnel and Render connection still
require execution on the owner's computer and production verification.
