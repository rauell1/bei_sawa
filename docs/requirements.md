# Governance challenge requirements and evidence

Reviewed **11 October 2026** against the actual owner-supplied page text in
[`challenge-brief.txt`](challenge-brief.txt). This supersedes the earlier inferred
requirements. Chosen track: **Governance**; single theme: **Financial services /
Value for money**. Synthetic data is explicitly allowed. Energy/solar data,
`benchmark_prices`, `check_budget` and a Postgres MCP server are not mandatory
items in this brief and must not be claimed as implemented.

“Implemented/tested” below describes code and observed checks. Owner confirmation
of external steps is recorded separately; it is not independent eligibility
certification. The owner replied “All this is done” to eligibility, dates,
practitioner contact and public submission steps on 11 October.

## Every mandatory build item

| ID | Brief requirement | Implementation / evidence | Status |
|---|---|---|---|
| B1 | Own MCP server, at least 3 distinct tools, one action | Four tools: search, scoped retrieval, deterministic cited analysis, validated draft write. Actual stdio protocol and write/refusal tests; genuine model trace. | Implemented and exercised. |
| B2 | One borrowed MCP server, one-line reuse reason | Official filesystem server pinned `2025.8.21`; reads playbook. Reuses established MCP file-reading and directory resolution instead of rebuilding it. Explicit MIT metadata and source notice retained. | Implemented and exercised. |
| B3 | Open-source orchestration | LangGraph bounded plan → execute → self-check loop, plus separate durable human interrupt. | Implemented and tested. |
| B4 | One full task on open weights | Genuine Qwen 2.5 3B runs: retrieve, analyze, draft, cited notes; recorded model digest and complete audit. No silent stub. | Actual runs recorded on 9 and 11 October. |
| B5 | Log every action; gate irreversible actions; named approver | MCP/model inputs, outputs, timestamps, duration, errors and available usage. Named authenticated officer approval binds the exact hash before idempotent internal filing. Failed writes are not automatically retried. | Local security tests pass; actual production approval is not independently exercised. |
| B6 | New work within submission period | Original repository work and AI assistance disclosed in PROVENANCE; commits dated 8–11 October. | Owner confirms external eligibility/steps; official opening/cutoff timestamp absent. Commit dates alone do not prove period eligibility. |

## Every mandatory submission item

| ID | Brief requirement | Implementation / evidence | Status |
|---|---|---|---|
| S1 | Public repo, OSI licence, one-command README | Public GitHub repo; MIT source licence; `docker compose up --build`; frozen Node/Python versions, pinned Ollama image, documented resources; CI. | Container builds and cached-model Compose startup checked. Empty-volume registry download remains unverified. |
| S2 | Public YouTube/Vimeo demo, under 3 minutes, unedited agent run with tools | New continuous 126-second MP4: actual Qwen inference, visible tool calls, cited draft, human handover and altered-report refusal. JSON evidence and video SHA retained. | Artifact prepared. Owner reports external steps done; public YouTube/Vimeo URL not supplied. Repository MP4 alone is insufficient. Old 35-second playback is not the required demo. |
| S3 | Around 300 words: what/theme/institution/workflow | SUBMISSION.md, around 315 words; Governance / Value for money; Makueni internal audit as proposed use case, no adoption claim. | Written to implemented scope. Practitioner contact owner-reported, notes absent. |
| S4 | One-page ARCHITECTURE.md, shape/built vs borrowed/why | Concise diagram, MCP table, bounded loop, citations, human gate, data/log/hosting boundaries. | Updated. |
| S5 | EVALS: 8+ tasks, pass/fail, one unfixed failure and next attempt | Ten fixture tasks; real repeat/refusal tasks; authentication/hash/tamper tests. Explicit unfixed model-reason failure and next experiment. | Observed outcomes and verification limits recorded. |

## Rules and data conduct

- The agent prepares files; it cannot award, rank, exclude, cancel or externally
  submit a procurement. Model tool inventory includes no approval or filing action.
- Source-backed signals use dataset/OCID/record/release identity and JSON Pointers.
  Canonical recomputation rejects unsourced or altered report content.
- Default records are invented and contain no actual supplier/person data.
  Historical loading/import rejects active processes, future/undated awards,
  missing manual personal-data review and known contact fields. The tripwire is
  not a detector for names buried in prose; manual review remains necessary.
- Age 18+, Africa residence, team <=3, organiser/family exclusions, one project
  and one theme are external eligibility rules. The owner confirms completion;
  no identity document or independent verification is stored in public source.
- The page displays “15th October” but separately says opening/closing TBC.
  Establish the exact organiser timestamp and stop commits before it; never push
  post-cutoff fixes to the submitted repository. AI assistance is disclosed.
- Code is MIT. Qwen weights retain their research licence. No actual cost savings,
  complete bid evaluation, institutional partnership or data residency is claimed.

## Judging criteria: implemented evidence versus remaining limits

| Criterion | Evidence | Honest limit |
|---|---|---|
| Agentic depth / MCP (30) | Actual state-valid Qwen choices, bounded failed-read recovery, thin-evidence retry/abstention, four reusable tools | Small model repeats explanations; only two deterministic signals. |
| Open-source rigour (20) | One-command Compose, pins, MIT notices, CI, honest README | Fresh model download and independently repeated clean machine remain unverified. |
| Tender-cycle fit (20) | Intended Makueni internal-audit retrospective workflow; no missing-bid-document claim | No adoption or measured committee-time benefit; practitioner notes absent. |
| Evaluation (15) | Ten tasks; three actual repeat runs, failure/refusal retention, complete audit | Only one complete synthetic record in repeat sample; not accuracy/generalization evidence. |
| Defensibility (10) | Exact source citations, approved hash, private reader/export, measured latency/token counts | No tamper-proof independent audit; total electricity/hardware/hosting cost unmeasured. |
| Demo (5) | Actual continuous run and visible failure under 3 minutes; live local/authenticated interface | Required YouTube/Vimeo publication link absent from repo; production gate not in video. |

## Deployment checks still separate from challenge implementation

Roy remains officer and evaluator using the existing account. Verify production
sign-in → review → save → approve exact revision → file → read/export and
cross-account denial. Owner reports officer-registry deployment. Windows Ollama
and Cloudflare Tunnel setup still needs actual hosted inference verification;
see `local-qwen.md`. Resend sender/domain and Neon SMTP remain deployment tasks,
not mandatory challenge-stack components. Historical energy/solar data is an
optional extension and does not block the permitted synthetic submission.
