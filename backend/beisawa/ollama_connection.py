"""Credential transport for a configured private Ollama gateway; never audited."""
from urllib.parse import urlparse

def ollama_headers(settings) -> dict[str, str]:
    key = getattr(settings, "ollama_api_key", None)
    if not key:
        return {}
    url = urlparse(settings.ollama_base_url)
    if url.scheme != "https" and url.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("Authenticated Ollama gateways require HTTPS outside loopback")
    return {"Authorization": f"Bearer {key}"}
