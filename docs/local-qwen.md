# Live Qwen on Roy's Windows computer

Chosen by the owner: run inference on the computer, while Vercel, Neon and Render
continue to host the app. The computer must remain awake and online for real
reviews. This setup is implemented and locally tested as a gateway; the actual
Windows/tunnel/Render deployment is not yet verified.

Native Ollama stays at `127.0.0.1:11434`. A separate gateway at `127.0.0.1:11435`
requires a random bearer secret and allows only model listing and non-streaming
chat for `qwen2.5:3b`. It refuses model management, other models, oversized requests
and unbounded output/context settings. One chat at a time. Render supplies the
secret; browsers and Neon users never receive it. The gateway forwards only to
loopback and does not pass its authorization header to Ollama. It is not a
multi-tenant inference platform; all authorized calls share one desktop model.

## Prepare the computer

Install Ollama and Cloudflare Tunnel using their official installers or winget:

```powershell
winget install --id Ollama.Ollama
winget install --id Cloudflare.cloudflared
```

Restart PowerShell after installation. In the repository, update `main`, then:

```powershell
ollama pull qwen2.5:3b
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e .
powershell -ExecutionPolicy Bypass -File .\scripts\start-qwen-gateway.ps1 -CopyToken
```

The script generates the secret once, stores it encrypted for this Windows user
in ignored `var/operator/qwen-gateway-token.dpapi`, and copies it to the clipboard
when requested. Paste into Render's secret setting, not chat. Later starts reuse
the encrypted secret. Losing or rotating it requires updating Render too. The
helper process must stay running. It never prints the secret. Ollama must also
be running; the gateway does not install or start the model itself. Python 3.11
and sufficient free memory are prerequisites; the weights alone are about 1.93GB.

## Connect a named Cloudflare Tunnel

Use a hostname under the domain managed in your Cloudflare account, for example
`qwen.rauell.systems`. This is a proposed hostname, not an existing deployment.
In Cloudflare's tunnel dashboard, create a tunnel for this computer and install
its connector using the dashboard's Windows instructions. Treat the connector
token as a credential. Configure the published hostname with service
`http://127.0.0.1:11435`, **not** the native Ollama port. Cloudflare provides HTTPS
at the public hostname. No inbound router port opening is needed.

Verify an unauthenticated request to `/api/tags` returns 401. If it returns a model
list without the secret, stop and fix the tunnel target. Keep the gateway token
out of logs, URLs and browser JavaScript. Do not make native Ollama public.

## Configure Render and restart the engine

| Variable | Value |
|---|---|
| `BEISAWA_LLM_MODE` | `ollama` |
| `OLLAMA_MODEL` | `qwen2.5:3b` |
| `OLLAMA_BASE_URL` | `https://qwen.rauell.systems` (use the actual tunnel hostname) |
| `OLLAMA_API_KEY` | Secret copied by the helper |
| `BEISAWA_ENGINE_REQUIRE_AUTH` | `1` |

Deploy latest `main` to Render for authenticated gateway support. Vercel does not
need the gateway secret or Ollama URL. Keep the existing Neon Function URL and
Neon JWT configuration. Reopen BeiSawa and confirm health identifies an available
Ollama/Qwen model. Run a real review and inspect its model-used flag and tool trace;
never call a stub run live Qwen. A sleeping computer, disconnected tunnel, busy
model or failed token match must result in an explicit error.

Cloudflare plan-specific request timeouts may constrain long inference calls;
measure the actual run on this computer. The prior cloud CPU run took 98.554
seconds across multiple model calls; this is not a promised desktop latency.

## Verification boundary

Local tests cover authorization, route/model scope, request limits, upstream
failure messages and HTTPS secret transport. They use a fake loopback model, not
new Qwen quality evidence. The real existing Qwen run remains documented in EVALS.
PowerShell/Windows encryption, Cloudflare account/DNS and authenticated production
inference require the owner's computer and secure settings; they were not run in
this Linux cloud environment.
