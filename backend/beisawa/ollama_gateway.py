"""Desktop inference gateway. Native Ollama remains on loopback, never public."""
import asyncio
import json
import math
import secrets
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


def create_gateway(token: str, model: str = "qwen2.5:3b", *, transport=None) -> FastAPI:
    if len(token) < 32 or not token.isascii():
        raise ValueError("Set a random gateway token of at least 32 ASCII characters")
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    lock = asyncio.Lock()

    @app.middleware("http")
    async def authenticate(request: Request, call_next):
        supplied = request.headers.get("authorization", "")
        if not secrets.compare_digest(supplied.encode(), ("Bearer " + token).encode()):
            return JSONResponse({"detail": "Authentication required"}, status_code=401)
        return await call_next(request)

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
    async def proxy(path: str, request: Request):
        if request.url.query or (request.method, path) not in {("GET", "api/tags"), ("POST", "api/chat")}:
            return JSONResponse({"detail": "Route not available"}, status_code=404)
        payload = None
        if path == "api/chat":
            # Stream request bytes with a hard cap before parsing.
            raw = bytearray()
            async for part in request.stream():
                raw.extend(part)
                if len(raw) > 1_048_576:
                    return JSONResponse({"detail": "Request too large"}, status_code=413)
            try:
                payload = json.loads(raw)
                if not isinstance(payload, dict) or payload.get("model") != model or payload.get("stream") is not False:
                    raise ValueError()
                if set(payload) - {"model", "messages", "stream", "format", "options"}:
                    raise ValueError()
                options = payload.get("options", {})
                if not isinstance(options, dict) or set(options) - {"temperature", "num_predict", "num_ctx"}:
                    raise ValueError()
                if not isinstance(payload.get("messages"), list):
                    raise ValueError()
                if any(not isinstance(m, dict) or m.get("role") not in {"system", "user", "assistant"} or not isinstance(m.get("content"), str) or set(m) - {"role", "content"} for m in payload["messages"]):
                    raise ValueError()
                temperature = options.get("temperature", 0)
                if type(temperature) not in {int, float} or not math.isfinite(temperature) or not 0 <= temperature <= 2:
                    raise ValueError()
                for key, maximum in [("num_predict", 1024), ("num_ctx", 8192)]:
                    if key in options and (type(options[key]) is not int or not 1 <= options[key] <= maximum):
                        raise ValueError()
                payload["options"] = {"temperature": 0, "num_predict": 512, "num_ctx": 8192, **options}
            except (ValueError, TypeError):
                return JSONResponse({"detail": "Unsupported inference request"}, status_code=422)
        if path == "api/chat" and lock.locked():
            return JSONResponse({"detail": "Inference busy; retry shortly"}, status_code=503)
        async def upstream():
            try:
                async with httpx.AsyncClient(transport=transport, timeout=180, trust_env=False) as client:
                    result = await client.request(request.method, "http://127.0.0.1:11434/" + path, json=payload)
                if result.status_code != 200:
                    return JSONResponse({"detail": "Local model unavailable"}, status_code=503)
                data = result.json()
                if path == "api/tags":
                    data = {"models": [item for item in data.get("models", []) if item.get("name") == model]}
                return JSONResponse(data, headers={"Cache-Control": "no-store"})
            except (httpx.HTTPError, ValueError):
                return JSONResponse({"detail": "Local model unavailable"}, status_code=503)
        if path == "api/chat":
            async with lock:
                return await upstream()
        return await upstream()
    return app
