import httpx
import pytest
from types import SimpleNamespace
from beisawa.ollama_gateway import create_gateway
from beisawa.ollama_connection import ollama_headers

TOKEN = "test-gateway-secret-" + "a" * 32

@pytest.mark.asyncio
async def test_gateway_auth_routes_model_scope_and_local_only_forwarding():
    calls = []
    def upstream(request):
        calls.append(request)
        assert request.url.host == "127.0.0.1" and request.url.port == 11434
        assert "authorization" not in request.headers
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": "qwen2.5:3b"}, {"name": "other"}]})
        import json
        options = json.loads(request.content)["options"]
        assert options["num_predict"] == 512 and options["num_ctx"] == 8192
        return httpx.Response(200, json={"message": {"content": "actual upstream response"}})
    app = create_gateway(TOKEN, transport=httpx.MockTransport(upstream))
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url="http://gateway") as client:
        assert (await client.get("/api/tags")).status_code == 401
        assert (await client.get("/api/tags", headers={"Authorization": "Bearer wrong"})).status_code == 401
        assert not calls
        headers = {"Authorization": "Bearer " + TOKEN}
        for path in ["/api/delete", "/api/pull", "/api/tags?target=remote", "/docs"]:
            assert (await client.get(path, headers=headers)).status_code == 404
        assert not calls
        assert (await client.get("/api/tags", headers=headers)).json() == {"models": [{"name": "qwen2.5:3b"}]}
        valid = {"model": "qwen2.5:3b", "stream": False, "messages": [{"role": "user", "content": "review"}]}
        for change in [{"model": "other"}, {"stream": True}, {"options": {"temperature": "high"}}, {"options": {"num_predict": 100000}}, {"messages": [{"role": "user", "content": "text", "images": ["data"]}]}]:
            assert (await client.post("/api/chat", headers=headers, json={**valid, **change})).status_code == 422
        assert len(calls) == 1
        assert (await client.post("/api/chat", headers=headers, json=valid)).json()["message"]["content"] == "actual upstream response"

@pytest.mark.asyncio
async def test_gateway_caps_body_and_does_not_expose_upstream_errors():
    app = create_gateway(TOKEN, transport=httpx.MockTransport(lambda request: httpx.Response(500, text="private upstream details")))
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url="http://gateway", headers={"Authorization": "Bearer " + TOKEN}) as client:
        assert (await client.post("/api/chat", content="x" * 1_048_577)).status_code == 413
        response = await client.get("/api/tags")
        assert response.status_code == 503 and "private upstream" not in response.text

def test_secret_transport_requires_https_outside_loopback():
    assert ollama_headers(SimpleNamespace(ollama_api_key=None)) == {}
    assert ollama_headers(SimpleNamespace(ollama_api_key=TOKEN, ollama_base_url="https://qwen.example.test"))["Authorization"] == "Bearer " + TOKEN
    with pytest.raises(ValueError):
        ollama_headers(SimpleNamespace(ollama_api_key=TOKEN, ollama_base_url="http://qwen.example.test"))
    with pytest.raises(ValueError):
        create_gateway("short")
