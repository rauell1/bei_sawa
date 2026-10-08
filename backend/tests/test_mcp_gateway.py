from __future__ import annotations

import json
from pathlib import Path

import pytest

from beisawa.config import get_settings, reset_settings_for_tests
from beisawa.mcp_client import MCPGateway


@pytest.mark.asyncio
async def test_own_mcp_and_borrowed_filesystem_tools_are_audited(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("BEISAWA_HOME", str(Path(__file__).resolve().parents[2]))
    monkeypatch.setenv("BEISAWA_RUNTIME_DIR", str(tmp_path))
    monkeypatch.setenv("BEISAWA_TEST_SECRET", "do-not-forward")
    reset_settings_for_tests()
    settings = get_settings()
    request_id = "test-request-123"
    try:
        probe = MCPGateway(settings=settings)
        assert "BEISAWA_TEST_SECRET" not in probe._own_server_parameters().env
        assert "BEISAWA_TEST_SECRET" not in probe._filesystem_server_parameters().env
        async with MCPGateway(include_filesystem=True, request_id=request_id, settings=settings) as gateway:
            tool_response = await gateway.sessions["bei_sawa"].list_tools()
            own_tool_names = {tool.name for tool in tool_response.tools}
            search = await gateway.call("bei_sawa", "search_tenders", {"query": "clinic", "limit": 5})
            playbook = await gateway.call(
                "filesystem",
                "read_text_file",
                {"path": str(settings.data_dir / "review_playbook.md")},
            )
        assert own_tool_names == {
            "search_tenders",
            "get_tender_record",
            "analyze_value_for_money",
            "draft_review_memo",
        }
        assert not any(
            word in name
            for name in own_tool_names
            for word in ("award", "reject", "cancel", "publish")
        )
        assert search["count"] == 1
        assert search["items"][0]["ocid"] == "ocds-beisawa-demo-2026-0001"
        assert "human reviewer" in playbook["text"]
        rows = [json.loads(line) for line in settings.audit_path.read_text().splitlines()]
        assert len(rows) == 2
        assert {row["server"] for row in rows} == {"bei_sawa", "filesystem"}
        for row in rows:
            assert row["request_id"] == request_id
            assert row["timestamp"]
            assert row["inputs"]
            assert row["outputs"] is not None
    finally:
        reset_settings_for_tests()
