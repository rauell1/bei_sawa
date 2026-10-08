FROM node:22-bookworm-slim AS node-runtime

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    BEISAWA_HOME=/app \
    BEISAWA_DATA_DIR=/app/backend/beisawa/data \
    BEISAWA_RUNTIME_DIR=/app/var \
    MCP_FILESYSTEM_COMMAND=/usr/local/bin/mcp-server-filesystem

# The official filesystem MCP server is a Node process; copy the supported Node runtime.
COPY --from=node-runtime /usr/local/ /usr/local/
WORKDIR /app

RUN npm install --global --no-audit --no-fund @modelcontextprotocol/server-filesystem@2026.8.31

COPY pyproject.toml README.md ./
COPY backend ./backend
RUN python -m pip install .

RUN mkdir -p /app/var/drafts
EXPOSE 8000
CMD ["uvicorn", "beisawa.main:app", "--host", "0.0.0.0", "--port", "8000"]
