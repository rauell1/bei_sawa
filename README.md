# BeiSawa: Value-for-Money Review Agent

**“Bei sawa” means “fair price” in Swahili.** BeiSawa is a governance-track prototype for evidence-led review of procurement records. It is not a generic business website and it cannot award, reject, cancel, publish, or submit a tender.

> **Status: not submission-ready.** Four synthetic records remain the only dataset. The hosted domain renders Neon sign-in; the owner deployed Render and Neon infrastructure. Named approval, canonical report hashes, persisted human-interrupt checkpoints, idempotent internal filing, and a bounded Qwen tool-choice loop are implemented and locally tested. The actual officer, production approval workflow, historical energy/solar data, named evaluator access, recorded real run and video are still required. Real Qwen/Compose verification is pending; see EVALS and [`docs/approval.md`](docs/approval.md).

> **Synthetic data notice:** The bundled records are invented for demonstration. Nothing in this repository is a claim about a real tender, supplier, or person. “No automated signal” is not assurance of value or compliance.

## What currently runs

- A Next.js procurement review desk with a direct link to the BeiSawa Drive materials folder.
- A FastAPI API and bounded LangGraph plan → execute → self-check loop in Ollama mode; explicit test mode retains the fixed fixture workflow.
- BeiSawa's own stdio MCP server with four tools: search, record retrieval, deterministic checks, and local draft writing.
- One MCP gateway with persistent stdio sessions for the lifetime of the API process; MCP child environments receive only an allowlisted set of variables.
- The upstream `@modelcontextprotocol/server-filesystem` MCP server, called through `read_text_file` to load the local review playbook. The server process itself is not an OS-enforced read-only sandbox.
- Deterministic checks for a first-award value more than 10% above the recorded tender estimate and fewer than three recorded tenderers. These are review prompts, not legal thresholds or allegations.
- Dataset-scoped internal record keys built from the dataset source id, OCID, and OCDS record id. A bare OCID is not used as an application lookup key.
- JSON Pointer citations on findings and a draft writer that re-resolves citations and recomputes the source analysis before saving.
- A local JSONL log for completed MCP calls and model calls. MCP outputs can include full source records; do not use personal/sensitive data until redaction and access controls exist. This is not tamper-proof or a durable business audit system.

In Ollama mode Qwen selects a next tool from the discovered MCP tools. The server fixes record-scoped arguments and permits no approval/filing tool. Eight choices maximum; incomplete checks trigger retrieval retry then abstention. The final note is citation-validated. Stub mode retains deterministic fixture behavior and is not an open-weights model run. Named approval and filing are separate authenticated actions; see `docs/approval.md`.

## Run a local preview

Requirements: Python 3.11, Node.js 22, npm, and network access to install dependencies.

```bash
BEISAWA_LLM_MODE=stub ./dev.sh
```

Open **http://localhost:3000**. This is an explicit UI/test preview; the UI labels it as not Qwen. To attempt the configured local model instead, install Ollama and pull `qwen2.5:7b`, then run `./dev.sh` without the `stub` setting. An unavailable model returns an error rather than being silently replaced.

The `docker compose up --build` path is present but has **not** been executed in this environment. Do not treat it as a verified one-command Qwen setup until it passes a clean build with empty volumes on the target hardware. First-run model downloads require several gigabytes and enough memory for the model. Compose defaults to `qwen2.5:3b`; set `OLLAMA_MODEL=qwen2.5:7b` for 7B.

### Checks

```bash
.venv/bin/pytest
npm run build --prefix frontend
```

These checks cover the current prototype only. They do not establish production security, Qwen task quality, deployment readiness, or challenge eligibility.

## Neon and Vercel deployment

The production architecture uses Next.js on Vercel, Neon Managed Auth, a Neon
Function API, Neon Postgres for reviewer records/activity, and private Neon Object
Storage for saved drafts. The Python/MCP review engine runs as a separate service
and independently verifies Neon JWTs. The planned web domain is
`https://beisawa.rauell.systems`. See [deployment instructions](docs/deployment.md)
for the exact environment variables, migration, and live validation checklist.

```bash
npm run typecheck:neon
npm run test:neon
```

These local integration checks are not evidence of a successful remote deployment.

## BeiSawa materials

[Open BeiSawa building materials and challenge files in Google Drive](https://drive.google.com/drive/folders/1Pyq7oBfYci6wDIzKlTdDl-vz_42gOhJH?usp=sharing). This link is available from the review desk. The app links to the folder; it does not copy, sync, or inspect Drive files.

## Challenge and project details

- **Challenge:** African Agentic AI Design Challenge; Governance track, “The Bid Box Challenge”; theme “Value for money”. Organiser spelling and official submission cutoff still need confirmation.
- **Owner:** Roy Okola Otieno · rauell.systems · Nairobi, Kenya.
- **Proposed workflow:** retrospective review for a county internal audit or procurement office. No office partnership or practitioner interview is claimed.
- **Domain:** `beisawa.rauell.systems`; deployment and DNS are not configured.
- **Repository:** [rauell1/bei_sawa](https://github.com/rauell1/bei_sawa). The repository is public; the current working branch is not a deployed demo.
- **Deadline:** 15 October 2026, as supplied by the owner; cutoff time and timezone have not been confirmed.
- **Demo video and named evaluator access:** not configured.
- **Licence:** [`LICENSE`](LICENSE) currently contains MIT as a provisional choice. Owner confirmation is required before publication of this contribution.

## Architecture, evidence and limitations

- [`ARCHITECTURE.md`](ARCHITECTURE.md) describes the implementation that exists today, not the target production design.
- [`EVALS.md`](EVALS.md) separates observed prototype checks from unrun Qwen/data/authentication evaluations.
- [`PROVENANCE.md`](PROVENANCE.md) records original work, dependencies, fixtures, and reuse.
- [`SUBMISSION.md`](SUBMISSION.md) is a cautious draft, not a claim of institutional deployment or evaluation evidence.
- [`docs/requirements.md`](docs/requirements.md) maps each acceptance item to evidence and remaining work.

No live tender data, personal procurement data, external budget data, or frontier-model endpoint is included. The new approval/filing implementation saves internal immutable reports only after exact-hash human approval. Production approval still requires officer configuration and validation.
