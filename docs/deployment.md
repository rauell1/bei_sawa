# BeiSawa deployment: Vercel + Neon

Production web origin: `https://beisawa.rauell.systems`.
Neon project: `lingering-forest-76317462`; target branch: `production`.

## Architecture and current status

The Next.js app signs reviewers in with Neon Managed Auth. Its server routes
check the session, obtain the reviewer's JWT, and call the Neon Function API.
The Function verifies that JWT, records reviews and per-user activity in Neon
Postgres, and stores draft documents in the private `beisawa-drafts` bucket.
Draft list/download queries always constrain both the resource and its owner;
clients cannot override the identity by supplying a header or request body.

The existing Python/FastAPI service runs the LangGraph and stdio MCP review
engine. It independently verifies the same Neon JWT and re-resolves citations
and canonical findings before accepting a draft. It keeps scratch files and
MCP logs locally; those are not the durable reviewer workspace. Production
blocks direct access to the engine's aggregate audit log.

The original `beisawa` public-read bucket is retained for public assets. Private
review drafts are never written there. AI Gateway remains disabled. No approval,
report filing, or procurement decision action is implemented.

Local checks passed: Python tests, cryptographic JWT checks, owner isolation,
embedded PostgreSQL persistence, fake object-storage upload/download and failure
handling, frontend production build, unauthenticated page/API gates, and the
explicit local review/draft workflow. These checks do **not** establish live
Neon Auth, S3, database, or deployment readiness. The cloud has no Neon key,
and the Python engine's deployed URL has not been supplied. The production
merge must wait for the live checks below.

## Provision and deploy

Neon CLI 8.2.0 is installed at `/workspace/.neon-tools/bin/neon`. The Neon agent
skills and project-scoped OAuth MCP configuration are installed locally and
excluded from Git. An existing agent session may need a restart and OAuth
sign-in to activate MCP; writing its configuration does not authenticate it.

1. Add `NEON_API_KEY` securely in cloud environment settings. The requirement is
   already saved in the draft. It is a CLI management credential, not a browser
   variable. A proxy-backed placeholder works only through its configured API
   destination; never copy it into application config as a raw credential.
2. Set `BEISAWA_ENGINE_URL` to the deployed HTTPS origin of the Python service.
3. Confirm the project supports Functions and Storage. Currently supported
   regions: `aws-us-east-2`, `aws-us-east-1`, `aws-eu-central-1`, and
   `aws-ap-southeast-1`. Managed Auth requires compatible AWS/network settings.
4. From the repository root, use the existing project and production branch:

```bash
cd /workspace/bei_sawa
export PATH="/workspace/.neon-tools/bin:$PATH"
neon --config-dir /workspace/.neon-tools/config projects get lingering-forest-76317462
neon --config-dir /workspace/.neon-tools/config link \
  --project-id lingering-forest-76317462 --branch production -y --no-env-pull
neon --config-dir /workspace/.neon-tools/config config plan
neon --config-dir /workspace/.neon-tools/config deploy
neon --config-dir /workspace/.neon-tools/config neon-auth domain add https://beisawa.rauell.systems
neon --config-dir /workspace/.neon-tools/config env pull
```

`neon.ts` declares Auth, both buckets, and the real Function entry point
`neon/api.ts`. `BEISAWA_ENGINE_URL` must be set when loading that config.
Inspect the plan before applying changes to existing production services.
Do not change project region or protection settings silently.

Deploy/pull writes managed connection URLs and credentials into an ignored local
env file. Do not print or commit it. Load those values securely into the shell
before running `npm run db:migrate`. The migration is additive, transactional,
and can be repeated. Prefer `DATABASE_URL_UNPOOLED` for migrations. Application
queries use pooled `DATABASE_URL`. Keep TLS certificate verification enabled.
The API's health check fails if the schema or private bucket is inaccessible.

Review deployment credentials should have only the needed production permissions.
Provisioning an Auth service does not automatically configure production SMTP or
OAuth providers. Email verification/password reset need working Auth email delivery;
configure production mail settings in Neon and test the actual emails.

## Vercel production settings

Use Root Directory `frontend`, Framework Preset Next.js, Install Command
`npm ci`, and Build Command `npm run build`. Add `beisawa.rauell.systems` under
Vercel Domains and apply exactly the DNS records Vercel shows at the DNS provider.

Set these in Vercel's **Production** scope, then redeploy:

| Variable | Value |
| --- | --- |
| `NEON_AUTH_BASE_URL` | Production branch's Managed Auth base URL, including its path |
| `NEON_AUTH_COOKIE_SECRET` | Independent random secret of at least 32 characters, generated securely; not supplied by Neon |
| `NEON_FUNCTION_API_BASE_URL` | Actual deployed `api` Function's HTTPS base URL from Neon |
| `NEXT_TELEMETRY_DISABLED` | Optional: `1` |

These are the frontend's actual consumers. Vercel does **not** need
`DATABASE_URL`, S3 credentials, or `NEON_API_KEY` for this architecture. Do not
prefix cookie secrets or credentials with `NEXT_PUBLIC_`. Do not set
`BEISAWA_DEPLOYMENT_MODE=local` in Vercel; the application refuses that bypass
when Vercel is detected. `API_INTERNAL_URL` is only for the explicit local workflow.

The Function receives `DATABASE_URL`, Auth URLs, and `AWS_ENDPOINT_URL_S3`,
`AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` from the services
declared in Neon. Its only explicit app variable is `BEISAWA_ENGINE_URL`.

## Python review-engine deployment

The existing `infra/backend.Dockerfile` includes Python, Node, and the filesystem
MCP server. It sets `BEISAWA_ENGINE_REQUIRE_AUTH=1` by default. Required variables:

| Variable | Value |
| --- | --- |
| `BEISAWA_ENGINE_REQUIRE_AUTH` | `1`; never disable it on a public engine |
| `NEON_AUTH_BASE_URL` | Same production branch URL as Vercel/Function |
| `NEON_AUTH_JWKS_URL` | Same production branch's JWKS URL |
| `BEISAWA_LLM_MODE` | `stub` for the labelled preview; `ollama` for real inference |
| `OLLAMA_BASE_URL` | Reachable Ollama origin if using `ollama` |
| `OLLAMA_MODEL` | `qwen2.5:7b` if using the documented real-model workflow |

The image already sets `BEISAWA_HOME`, data/runtime paths, and the MCP command.
Give it a writable runtime directory and sufficient resources for its processes.
It does not need database/S3 credentials; they remain in Neon. Public HTTPS and
access to Neon's JWKS endpoint are required. Do not expose an unauthenticated
alternate engine route. Model unavailability is reported as an error, never a
silent substitution with stub output. Real Qwen inference remains unverified.

## Live validation required before merge

On the production branch (or a representative disposable branch):

- Verify region, plan, successful deployment, and schema migration.
- Register two test reviewers; verify email when enabled. Test sign-in, session
  restoration after a reload, sign-out, reset-password mail and reset completion.
- Confirm unauthenticated calls to both the Function and Python engine are denied.
- Run a review, save a draft, reload, list and download the same persisted bytes.
- Verify the second reviewer cannot list/download the first reviewer's draft or
  see their activity. Guessing its id must still return 404.
- Confirm the draft's bucket denies anonymous reads; the separate public assets
  bucket may allow public reads.
- Verify the real Vercel domain, TLS, Auth trusted origin, and correct branch URLs.
- Confirm the model mode is labelled correctly. A successful stub run is not Qwen
  evaluation evidence.

Public deployment and merging are not yet completed or validated.

## Local validation

```bash
.venv/bin/pytest
npm run typecheck:neon
npm run test:neon
NEXT_TELEMETRY_DISABLED=1 npm run build --prefix frontend
BEISAWA_LLM_MODE=stub npm_config_cache=/tmp/beisawa-npm-cache ./dev.sh
```

`dev.sh` explicitly selects local mode and the Python backend; local mode is not
an authentication test. Neon API tests use signed JWTs, embedded PostgreSQL, and
fake object storage/engine failures. They are not a substitute for live checks.
