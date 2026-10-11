# BeiSawa: Value-for-Money Review Agent

**“Bei sawa” means “fair price” in Swahili.** BeiSawa is a governance-track prototype for evidence-led review of procurement records. It is not a generic business website and it cannot award, reject, cancel, publish, or submit a tender.

> **Status: submission verification remains open.** The stated synthetic-data prototype is implemented and tested. An actual unedited 126-second Qwen run, refusal evidence, bounded tool recovery, exact-hash human approval and private internal filing are included. Public YouTube/Vimeo publication, official submission-period dates, and authenticated production checks are not independently evidenced here. The owner reports external eligibility, practitioner contact and submission steps completed; no institutional partnership is inferred.

## Run in one command

After cloning, with Docker Engine/Desktop and Compose v2 installed:

```bash
docker compose up --build
```

Open **http://localhost:3000/demo/run**. This local workflow uses real Qwen 2.5 3B
and clearly labelled invented records; it needs no Neon, Vercel or Resend account.
First startup downloads images and about 1.93GB of model weights. Allow at least
8GB available RAM, sufficient Docker memory, and about 20GB free disk for images,
builds and weights. CPU speed affects latency. Existing weights are reused; model
failures are explicit, never silently replaced with a stub. Do not publish this
unauthenticated local stack as the production site. The named officer workflow
is separately hosted and authenticated. [Setup and reproduction](docs/reproduce.md)
distinguishes verified cached startup from unverified empty-volume download.

**Chosen track/theme:** Governance · Financial services / Value for money.
**Tender-cycle scope:** retrospective triage of tender estimates, awards and
competition counts, not bid-document evaluation or bidder ranking. No historical
price benchmark, budget reconciliation or unpaid-invoice assessment is claimed.
The supplied challenge explicitly permits an original synthetic set; real
historical data is optional, not an eligibility prerequisite.

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

Open **http://localhost:3000**. This is an explicit UI/test preview; the UI labels it as not Qwen. To attempt the configured local model instead, install Ollama and pull `qwen2.5:3b`, then run `./dev.sh` without the `stub` setting. An unavailable model returns an error rather than being silently replaced.

The Compose frontend/backend builds pass. A real CPU-only Qwen 3B run completed using checksum-verified official weights imported into Ollama; see [EVALS](EVALS.md). A fresh one-command registry pull and empty-volume recovery remain unverified. First-run model downloads require several gigabytes and enough memory for the model. Compose defaults to `qwen2.5:3b`; set `OLLAMA_MODEL=qwen2.5:7b` for 7B.

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
for the exact environment variables, migration, and live validation checklist. The owner chose computer-hosted Qwen; [Windows Ollama gateway and tunnel setup](docs/local-qwen.md) connects that computer to Render without exposing native Ollama.

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
- **Proposed workflow:** retrospective review for Makueni County Government’s internal audit function. This is an intended use case, not a deployment or partnership claim. Practitioner contact is owner-reported; interview notes were not supplied.
- **Domain:** `beisawa.rauell.systems`; hosted sign-in and review desk were observed by the owner. Authenticated end-to-end production verification is still required.
- **Repository:** [rauell1/bei_sawa](https://github.com/rauell1/bei_sawa). The repository is public; the current working branch is not a deployed demo.
- **Deadline:** the supplied page displays 15 October but separately marks opening/closing timestamps TBC. The owner reports the external submission steps completed; exact timestamp evidence is not in this repository. Do not push after the official cutoff.
- **Evaluator:** Roy Okola Otieno uses the existing officer account; authenticated production workflow remains unverified. The public demo includes a 35-second recorded-run walkthrough.
- **Licence:** [`LICENSE`](LICENSE) currently contains MIT as the project’s OSI-approved MIT source licence. Third-party code and model weights retain their own licences.

## Architecture, evidence and limitations

- [`ARCHITECTURE.md`](ARCHITECTURE.md) describes the implementation that exists today, not the target production design.
- [`EVALS.md`](EVALS.md) separates observed prototype checks from unrun Qwen/data/authentication evaluations.
- [`PROVENANCE.md`](PROVENANCE.md) records original work, dependencies, fixtures, and reuse.
- [`SUBMISSION.md`](SUBMISSION.md) is a cautious draft, not a claim of institutional deployment or evaluation evidence.
- [`docs/requirements.md`](docs/requirements.md) maps each acceptance item to evidence and remaining work.

No live tender data, personal procurement data, external budget data, or frontier-model endpoint is included. Historical import is optional and rejects unreviewed sources and active processes. The new approval/filing implementation saves internal immutable reports only after exact-hash human approval. Production approval still requires officer configuration and validation.
