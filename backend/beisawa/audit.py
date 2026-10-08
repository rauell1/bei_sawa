"""Append-only JSONL audit log for MCP tool calls and model requests."""

from __future__ import annotations

import json
import threading
from collections import deque
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from beisawa.config import get_settings


class AuditLogger:
    def __init__(self, path: Path):
        self.path = path
        self._lock = threading.Lock()

    def append(self, event: dict[str, Any]) -> None:
        record = {"event_id": str(uuid4()), **event}
        self.path.parent.mkdir(parents=True, exist_ok=True)
        line = json.dumps(record, ensure_ascii=False, default=str, separators=(",", ":"))
        with self._lock:
            with self.path.open("a", encoding="utf-8") as stream:
                stream.write(line + "\n")
                stream.flush()

    def record_tool_call(
        self,
        *,
        request_id: str,
        server: str,
        tool: str,
        inputs: dict[str, Any],
        outputs: Any = None,
        error: str | None = None,
        started_at: str | None = None,
        duration_ms: float | None = None,
    ) -> None:
        self.append(
            {
                "event_type": "mcp_tool_call",
                "timestamp": datetime.now(UTC).isoformat(),
                "started_at": started_at or datetime.now(UTC).isoformat(),
                "duration_ms": duration_ms,
                "request_id": request_id,
                "server": server,
                "tool": tool,
                "inputs": inputs,
                "outputs": outputs,
                "error": error,
                "human_approver": None,
            }
        )

    def record_model_call(
        self,
        *,
        request_id: str,
        model: str,
        mode: str,
        inputs: Any,
        outputs: Any,
        error: str | None = None,
        started_at: str | None = None,
        duration_ms: float | None = None,
    ) -> None:
        self.append(
            {
                "event_type": "model_call",
                "timestamp": datetime.now(UTC).isoformat(),
                "started_at": started_at or datetime.now(UTC).isoformat(),
                "duration_ms": duration_ms,
                "request_id": request_id,
                "provider": mode,
                "model": model,
                "inputs": inputs,
                "outputs": outputs,
                "error": error,
            }
        )

    def recent(self, limit: int = 50) -> list[dict[str, Any]]:
        if not self.path.exists():
            return []
        events: deque[dict[str, Any]] = deque(maxlen=limit)
        with self._lock:
            with self.path.open("r", encoding="utf-8") as stream:
                for line in stream:
                    try:
                        item = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if isinstance(item, dict):
                        events.append(item)
        return list(reversed(events))


def get_audit_logger() -> AuditLogger:
    # One module-level logger per process keeps concurrent appends serialized.
    return _get_logger(get_settings().audit_path)


_LOGGERS: dict[str, AuditLogger] = {}
_LOGGERS_LOCK = threading.Lock()


def _get_logger(path: Path) -> AuditLogger:
    key = str(path)
    with _LOGGERS_LOCK:
        if key not in _LOGGERS:
            _LOGGERS[key] = AuditLogger(path)
        return _LOGGERS[key]
