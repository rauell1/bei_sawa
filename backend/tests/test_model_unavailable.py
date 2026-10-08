from __future__ import annotations

from pathlib import Path

import pytest

from beisawa.analysis import analyze_record
from beisawa.config import Settings
from beisawa.ollama import ModelUnavailableError, create_review_notes


@pytest.mark.asyncio
async def test_qwen_mode_fails_explicitly_when_ollama_is_unreachable(tmp_path, demo_record) -> None:
    settings = Settings(
        home=Path("."),
        data_dir=Path("backend/beisawa/data"),
        drafts_dir=tmp_path / "drafts",
        audit_path=tmp_path / "audit.jsonl",
        ollama_base_url="http://127.0.0.1:1",
        ollama_model="qwen2.5:7b",
        llm_mode="ollama",
        mcp_filesystem_command=None,
    )
    report = analyze_record(demo_record("ocds-beisawa-demo-2026-0001"))
    with pytest.raises(ModelUnavailableError, match="ollama pull qwen2.5:7b"):
        await create_review_notes(report, "safe playbook", request_id="offline-test", settings=settings)
