"""Runtime configuration shared by the API and MCP server."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    home: Path
    data_dir: Path
    drafts_dir: Path
    audit_path: Path
    ollama_base_url: str
    ollama_model: str
    llm_mode: str
    mcp_filesystem_command: str | None
    data_file: Path | None = None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    package_dir = Path(__file__).resolve().parent
    default_home = package_dir.parents[1]
    home = Path(os.getenv("BEISAWA_HOME", str(default_home))).expanduser().resolve()
    data_dir = Path(os.getenv("BEISAWA_DATA_DIR", str(package_dir / "data"))).expanduser().resolve()
    runtime_dir = Path(os.getenv("BEISAWA_RUNTIME_DIR", str(home / "var"))).expanduser().resolve()
    drafts_dir = Path(os.getenv("BEISAWA_DRAFTS_DIR", str(runtime_dir / "drafts"))).expanduser().resolve()
    audit_path = Path(os.getenv("BEISAWA_AUDIT_PATH", str(runtime_dir / "tool_audit.jsonl"))).expanduser().resolve()
    return Settings(
        home=home,
        data_dir=data_dir,
        drafts_dir=drafts_dir,
        audit_path=audit_path,
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/"),
        ollama_model=os.getenv("OLLAMA_MODEL", "qwen2.5:7b"),
        llm_mode=os.getenv("BEISAWA_LLM_MODE", "ollama").strip().lower(),
        mcp_filesystem_command=os.getenv("MCP_FILESYSTEM_COMMAND"),
        data_file=Path(os.environ["BEISAWA_DATA_FILE"]).expanduser().resolve() if os.getenv("BEISAWA_DATA_FILE") else None,
    )


def reset_settings_for_tests() -> None:
    """Clear cached configuration so tests can safely change environment variables."""

    get_settings.cache_clear()
