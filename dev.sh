#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PYTHON_BIN="${PYTHON_BIN:-python3}"
if [[ ! -x "$ROOT/.venv/bin/python" ]]; then
  "$PYTHON_BIN" -m venv .venv
fi

"$ROOT/.venv/bin/python" -m pip install --disable-pip-version-check -e '.[dev]'
npm ci --no-audit --no-fund
npm ci --prefix frontend --no-audit --no-fund

export BEISAWA_HOME="$ROOT"
export BEISAWA_DATA_DIR="$ROOT/backend/beisawa/data"
export BEISAWA_RUNTIME_DIR="${BEISAWA_RUNTIME_DIR:-$ROOT/var}"
export MCP_FILESYSTEM_COMMAND="$ROOT/node_modules/.bin/mcp-server-filesystem"
export API_PORT="${API_PORT:-8000}"
export WEB_PORT="${WEB_PORT:-3000}"

"$ROOT/.venv/bin/uvicorn" beisawa.main:app --host 0.0.0.0 --port "$API_PORT" &
API_PID=$!
cleanup() {
  kill "$API_PID" 2>/dev/null || true
  wait "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

API_INTERNAL_URL="http://127.0.0.1:${API_PORT}" \
  NEXT_TELEMETRY_DISABLED=1 \
  npm run dev --prefix frontend -- --port "$WEB_PORT"
