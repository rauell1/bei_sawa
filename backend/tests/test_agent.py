from __future__ import annotations

import json

import pytest

from beisawa.agent import run_review
from beisawa.config import reset_settings_for_tests


@pytest.mark.asyncio
async def test_langgraph_review_runs_with_explicit_test_stub(tmp_path, monkeypatch, demo_record_key) -> None:
    root = __import__("pathlib").Path(__file__).resolve().parents[2]
    monkeypatch.setenv("BEISAWA_HOME", str(root))
    monkeypatch.setenv("BEISAWA_RUNTIME_DIR", str(tmp_path))
    monkeypatch.setenv("BEISAWA_LLM_MODE", "stub")
    reset_settings_for_tests()
    try:
        result = await run_review(demo_record_key("ocds-beisawa-demo-2026-0001"), request_id="graph-test")
        assert result["model"]["provider"] == "test_stub"
        assert result["model"]["used"] is False
        assert len(result["report"]["findings"]) == 2
        assert [step["step"] for step in result["trace"]] == [
            "retrieve_record",
            "read_review_playbook",
            "run_citation_first_checks",
            "grounded_review_note",
        ]
        events = [json.loads(line) for line in (tmp_path / "tool_audit.jsonl").read_text().splitlines()]
        assert {event["server"] for event in events if event["event_type"] == "mcp_tool_call"} == {
            "bei_sawa",
            "filesystem",
        }
        assert any(event["event_type"] == "model_call" for event in events)
    finally:
        reset_settings_for_tests()
