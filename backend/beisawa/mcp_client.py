"""Audited stdio clients for BeiSawa and the borrowed MCP filesystem server."""

from __future__ import annotations

import json
import os
import shlex
import shutil
import sys
import time
from contextlib import AsyncExitStack
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from beisawa.audit import get_audit_logger
from beisawa.config import Settings, get_settings


class MCPToolError(RuntimeError):
    """A tool call failed or returned an MCP error result."""


class MCPGateway:
    """Start only the MCP servers needed for a request and log every tool invocation."""

    def __init__(
        self,
        *,
        include_filesystem: bool = False,
        request_id: str | None = None,
        settings: Settings | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.include_filesystem = include_filesystem
        self.request_id = request_id or str(uuid4())
        self._stack = AsyncExitStack()
        self.sessions: dict[str, ClientSession] = {}
        self.audit = get_audit_logger()

    async def __aenter__(self) -> "MCPGateway":
        await self._open_server("bei_sawa", self._own_server_parameters())
        if self.include_filesystem:
            await self._open_server("filesystem", self._filesystem_server_parameters())
        return self

    async def __aexit__(self, exc_type: Any, exc: Any, traceback: Any) -> None:
        await self._stack.aclose()

    def _own_server_parameters(self) -> StdioServerParameters:
        child_env = {
            "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
            "HOME": os.environ.get("HOME", str(self.settings.home)),
            "BEISAWA_HOME": str(self.settings.home),
            "BEISAWA_DATA_DIR": str(self.settings.data_dir),
            "BEISAWA_DRAFTS_DIR": str(self.settings.drafts_dir),
            "BEISAWA_AUDIT_PATH": str(self.settings.audit_path),
        }
        if self.settings.data_file:
            child_env["BEISAWA_DATA_FILE"] = str(self.settings.data_file)
        return StdioServerParameters(
            command=sys.executable,
            args=["-m", "beisawa.mcp_server"],
            env=child_env,
            cwd=str(self.settings.home),
        )

    def _filesystem_server_parameters(self) -> StdioServerParameters:
        allowed_dir = str(self.settings.data_dir)
        configured = self.settings.mcp_filesystem_command
        if configured:
            parts = shlex.split(configured)
            command, extra_args = parts[0], parts[1:]
            return StdioServerParameters(
                command=command,
                args=[*extra_args, allowed_dir],
                env=self._filesystem_environment(),
                cwd=str(self.settings.home),
            )

        local_bin = self.settings.home / "node_modules" / ".bin" / "mcp-server-filesystem"
        global_bin = shutil.which("mcp-server-filesystem")
        if local_bin.exists():
            command = str(local_bin)
            args = [allowed_dir]
        elif global_bin:
            command = global_bin
            args = [allowed_dir]
        else:
            command = shutil.which("npx") or "npx"
            args = ["--yes", "@modelcontextprotocol/server-filesystem@2026.8.31", allowed_dir]
        return StdioServerParameters(
            command=command,
            args=args,
            env=self._filesystem_environment(),
            cwd=str(self.settings.home),
        )

    def _filesystem_environment(self) -> dict[str, str]:
        return {
            "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
            "HOME": os.environ.get("HOME", str(self.settings.home)),
            "NO_UPDATE_NOTIFIER": "1",
        }

    async def _open_server(self, name: str, params: StdioServerParameters) -> None:
        read_stream, write_stream = await self._stack.enter_async_context(stdio_client(params))
        session = await self._stack.enter_async_context(ClientSession(read_stream, write_stream))
        await session.initialize()
        self.sessions[name] = session

    async def call(
        self,
        server: str,
        tool: str,
        arguments: dict[str, Any],
        *,
        request_id: str | None = None,
    ) -> Any:
        call_request_id = request_id or self.request_id
        session = self.sessions.get(server)
        if session is None:
            raise MCPToolError(f"MCP server '{server}' is not connected for this request.")

        started = datetime.now(UTC).isoformat()
        start_clock = time.perf_counter()
        result_payload: Any = None
        error_message: str | None = None
        try:
            result = await session.call_tool(tool, arguments=arguments)
            texts = [block.text for block in result.content if getattr(block, "text", None) is not None]
            text = "\n".join(texts)
            if getattr(result, "isError", False):
                raise MCPToolError(text or f"MCP tool {server}.{tool} returned an error.")
            if server == "bei_sawa":
                try:
                    result_payload = json.loads(text)
                except json.JSONDecodeError as exc:
                    raise MCPToolError(f"MCP tool {tool} returned invalid JSON.") from exc
            elif tool == "read_text_file":
                result_payload = {"text": text}
            else:
                result_payload = {"text": text}
            return result_payload
        except Exception as exc:
            error_message = f"{type(exc).__name__}: {exc}"
            raise
        finally:
            self.audit.record_tool_call(
                request_id=call_request_id,
                server=server,
                tool=tool,
                inputs=arguments,
                outputs=result_payload,
                error=error_message,
                started_at=started,
                duration_ms=round((time.perf_counter() - start_clock) * 1000, 2),
            )
