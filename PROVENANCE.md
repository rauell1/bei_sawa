# Provenance, reuse, and disclosure

This inventory records what is and is not behind the current BeiSawa working tree. It is not a legal opinion or a complete software bill of materials.

## Product and source-code history

- The starting repository commit is `e5194e6` (`Initial commit`). The current branch history includes `b9028c4` (backend/MCP), `384b524` (Next.js desk), and `c8c8147` (governance documentation/deployment configuration), all dated 8 October 2026 and co-authored with `arena-agent`. Their exact code/doc contributions can be inspected with `git show --stat <commit>`.
- The current working branch is `arena/af66face-bei-sawa`. The audit-driven record-key, tests, and documentation changes in this working tree are not yet committed or pushed.
- Core BeiSawa workflow, analysis rules, MCP server/client glue, UI, and synthetic fixtures were created in this repository branch. No third-party procurement agent, benchmark, result table, or production dataset was copied into the app.
- The owner-provided design audit and build brief were received as conversation text. The linked Google Drive folder is linked in the UI/README but has not been read, imported, or synchronized; the Google Drive connector was disconnected in this session. No claim is made about the folder contents.

## Data and findings

`backend/beisawa/data/ocds_demo.json` contains four invented OCDS-shaped fixtures with `dataset_id: beisawa-synthetic-ocds-demo-v1` and an explicit synthetic-data notice. Names, records, amounts, and dates in those fixtures are fictional. They were authored for deterministic tests and are not sourced from an eligible historical procurement dataset. The prototype has no external publisher feed, budget system, market-price source, or refresh schedule. Derived findings are computed from those fixture fields only; they are not real observations or ground truth.

The application links citation values to JSON Pointers and binds records internally by source dataset id, OCID, and OCDS record id. This is a prototype identity key, not evidence of archival authenticity or a complete amendment-history store.

## Models and tooling

- Model adapter: local Ollama chat API, configured by default for `qwen2.5:7b`. No weights are vendored. This sandbox had neither `ollama` nor `docker` installed; no Qwen response, resource profile, or quality result was observed. The test stub is deterministic and is explicitly not an open-weights-model run.
- Agent framework: LangGraph, used for a fixed retrieval → analysis → reflection sequence. It is not currently an autonomous planner.
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

The current branch's automated test suite uses synthetic fixtures and an explicit test stub; `EVALS.md` records the observed run. The current frontend build and post-migration test-stub live preview both passed; rerun from a clean checkout before release. No claim is made for real-data efficacy, Qwen quality, authenticated review, institutional use, hosting region, data residency, savings, update frequency, or adoption. No public demo video or evaluator login exists.
