# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS node-runtime

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    BEISAWA_HOME=/app \
    BEISAWA_DATA_DIR=/app/backend/beisawa/data \
    BEISAWA_RUNTIME_DIR=/app/var \
    BEISAWA_ENGINE_REQUIRE_AUTH=1 \
    MCP_FILESYSTEM_COMMAND=/usr/local/bin/mcp-server-filesystem

# The official filesystem MCP server is a Node process; copy the supported Node runtime.
COPY --from=node-runtime /usr/local/ /usr/local/
WORKDIR /app

RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm install --global --no-audit --no-fund @modelcontextprotocol/server-filesystem@2026.8.31

COPY pyproject.toml README.md ./
COPY backend ./backend
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export PIP_CERT=/run/secrets/proxy_ca; fi; \
    python -m pip install .

RUN mkdir -p /app/var/drafts
EXPOSE 8000
CMD ["uvicorn", "beisawa.main:app", "--host", "0.0.0.0", "--port", "8000"]
