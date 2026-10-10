"""Run on the Windows computer hosting Ollama; put Cloudflare Tunnel in front."""
import os
import uvicorn
from beisawa.ollama_gateway import create_gateway
if __name__ == "__main__":
    app = create_gateway(os.getenv("BEISAWA_OLLAMA_GATEWAY_TOKEN", ""), os.getenv("BEISAWA_GATEWAY_MODEL", "qwen2.5:3b"))
    uvicorn.run(app, host="127.0.0.1", port=11435)
