# Provenance, reuse, and disclosure

This inventory records what is and is not behind the current BeiSawa working tree. It is not a legal opinion or a complete software bill of materials.

## Product and source-code history

- The starting repository commit is `e5194e6` (`Initial commit`). The current branch history includes `b9028c4` (backend/MCP), `384b524` (Next.js desk), and `c8c8147` (governance documentation/deployment configuration), all dated 8 October 2026 and co-authored with `arena-agent`. Their exact code/doc contributions can be inspected with `git show --stat <commit>`.
- Neon integration and approval/tool-loop changes were merged through PRs #3 and #4. Current recorded-run work is on `codex/complete-evaluation`.
- Core BeiSawa workflow, analysis rules, MCP server/client glue, UI, and synthetic fixtures were created in this repository branch. No third-party procurement agent, benchmark, result table, or production dataset was copied into the app.
- The owner-provided design audit and build brief were received as conversation text. The linked Google Drive folder is linked in the UI/README but has not been read, imported, or synchronized; the Google Drive connector was disconnected in this session. No claim is made about the folder contents.

## Data and findings

`backend/beisawa/data/ocds_demo.json` contains four invented OCDS-shaped fixtures with `dataset_id: beisawa-synthetic-ocds-demo-v1` and an explicit synthetic-data notice. Names, records, amounts, and dates in those fixtures are fictional. They were authored for deterministic tests and are not sourced from an eligible historical procurement dataset. The prototype has no external publisher feed, budget system, market-price source, or refresh schedule. Derived findings are computed from those fixture fields only; they are not real observations or ground truth.

The application links citation values to JSON Pointers and binds records internally by source dataset id, OCID, and OCDS record id. This is a prototype identity key, not evidence of archival authenticity or a complete amendment-history store.

## Models and tooling

- Model adapter: local Ollama chat API, configured by default for `qwen2.5:7b`. No weights are vendored. A genuine local CPU Qwen 3B run is recorded in EVALS; no historical-data quality result is claimed. The test stub is deterministic and is explicitly not an open-weights-model run.
- Agent framework: LangGraph, used for a bounded Qwen tool-choice loop with evidence retry/abstention and a separate durable human approval interrupt. Stub mode retains the fixture sequence.
- Protocol: BeiSawa's own MCP server and calls use the MCP Python SDK over stdio. The filesystem integration is also an MCP client/server call, not a direct Python helper presented as MCP.
- Borrowed server: npm package `@modelcontextprotocol/server-filesystem@2026.8.31`, pinned by `package.json` and `package-lock.json`. Its concrete role is to read the playbook through its existing allowed-directory-aware MCP file-reading implementation; the agent does not call its mutation tools. The installed npm manifest declares `SEE LICENSE IN LICENSE`, but the downloaded package archive does not contain that file. The referenced source repository has a licensing-transition notice at the package's published source commit ([`LICENSE` at `a40bc270fb5ece62673f8a1196f57116d885c5eb`](https://github.com/modelcontextprotocol/servers/blob/a40bc270fb5ece62673f8a1196f57116d885c5eb/LICENSE)). Because per-file permissions and the exact redistribution licence are not resolved here, re-check upstream source/tag permissions and obtain appropriate legal review before release; do not infer the whole package is MIT or Apache-2.0 from the repository-level notice.

## Direct dependencies and licence notes

The application dependencies are declared in `pyproject.toml`, `frontend/package.json`, root `package.json`, and their lockfiles. Python version ranges are not fully locked in `pyproject.toml`; the versions present in this sandbox are environment state, not a reproducible release bill of materials.

| Dependency family | Use | Licence note observed |
|---|---|---|
| FastAPI, LangGraph, MCP Python SDK | HTTP API, graph, protocol client/server | Installed metadata identifies MIT for the inspected versions. |
| HTTPX, Uvicorn | HTTP client and ASGI server | Installed metadata identifies BSD-3-Clause for the inspected versions. |
| Next.js, React | Browser UI | Installed npm metadata identifies MIT for the inspected versions. |
| `@modelcontextprotocol/server-filesystem` | Borrowed MCP file-reading tool | Package metadata refers to an omitted `LICENSE` file; resolve exact package/source rights before release. |
| Other transitive dependencies | Runtime/build/test support | Full transitive licence inventory and notices have not been generated. |

The repository currently contains a full MIT `LICENSE` and `pyproject.toml` MIT metadata as a **provisional, unconfirmed** project licence. Owner confirmation of MIT versus Apache-2.0 is required before this contribution is published. If the owner chooses Apache-2.0, update the licence file, package metadata, and notices consistently.

## Verification boundary

The current branch's automated test suite uses synthetic fixtures and an explicit test stub; `EVALS.md` records the observed run. The current frontend build and post-migration test-stub live preview both passed; rerun from a clean checkout before release. No claim is made for real-data efficacy, Qwen quality, authenticated review, institutional use, hosting region, data residency, savings, update frequency, or adoption. A public recorded-run browser walkthrough exists; no named evaluator login is configured.

## Historical data preparation — 9 October 2026

No historical dataset has been imported. `scripts/import_historical.py` can select
completed, dated energy/solar awards from an actual OCDS record package without
rewriting records. It requires source, publisher, retrieval date and licence URLs,
records the original archive SHA-256, and rejects empty subsets. Metadata supplied
to this script is not independent proof of Kenyan publisher identity or licence
permission. Keep the original archive and verify both before use. Configure a
validated subset using `BEISAWA_DATA_FILE`; default fixtures remain synthetic.
Registry metadata is reachable; archive access and source validation remain pending as detailed below.

## Recorded weights and source research — 9 October 2026

Official `qwen2.5:3b` GGUF SHA-256 is `5ee4f07cdb9beadbbb293e85803c569b01bd37ed059d2715faa7bb405f31caa6` (1,929,903,008 bytes). The official template, system prompt and licence were also verified before importing into Ollama. This 3B release uses the **Qwen RESEARCH LICENSE AGREEMENT (19 September 2024)**; do not infer Apache-2.0 rights from other Qwen variants. Weights remain ignored local files, outside the repository's source licence. The recorded JSON contains invented source records and actual local model outputs, not account credentials or production officer details.

The [Makueni County registry entry](https://data.open-contracting.org/en/publication/13) was consulted on 9 October 2026. It identifies the county's official procurement portal, 2021–2022 coverage and **CC BY-NC-SA 4.0**. Download redirects to `fastly.data.open-contracting.org`, still denied by the managed proxy (403). No archive or real energy/solar award has been imported. Any future redistribution must preserve attribution and licence obligations separately from the code's MIT licence. The [PPRA registry entry](https://data.open-contracting.org/en/publication/147) was also consulted; a dataset-specific redistribution licence was not established, so no PPRA records are redistributed.
