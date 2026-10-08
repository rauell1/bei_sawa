from __future__ import annotations

import asyncio
import json
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from beisawa.config import reset_settings_for_tests
from beisawa.data import search_records
from beisawa.main import app


@pytest.fixture
def preview_environment(tmp_path, monkeypatch):
    root = Path(__file__).resolve().parents[2]
    monkeypatch.setenv("BEISAWA_HOME", str(root))
    monkeypatch.setenv("BEISAWA_RUNTIME_DIR", str(tmp_path))
    monkeypatch.setenv("BEISAWA_LLM_MODE", "stub")
    reset_settings_for_tests()
    yield tmp_path
    reset_settings_for_tests()


@pytest.mark.asyncio
async def test_health_endpoint_identifies_test_stub_and_guardrails(preview_environment) -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/health")
    body = response.json()
    assert response.status_code == 200
    assert body["model"]["mode"] == "test_stub"
    assert body["model"]["is_open_weights_model"] is False
    assert "no award/reject/cancel/publish" in body["policy"]


@pytest.mark.asyncio
async def test_review_api_requires_dataset_scoped_record_key(preview_environment) -> None:
    tender = search_records()[0]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        invalid = await client.post("/api/v1/reviews", json={"ocid": tender["ocid"]})
        response = await client.post("/api/v1/reviews", json={"record_key": tender["record_key"]})
        draft = await client.post("/api/v1/drafts", json={"report": response.json()["report"]})
    assert invalid.status_code == 422
    assert response.status_code == 200
    assert response.json()["record_key"] == tender["record_key"]
    assert response.json()["source_record"]["record_key"] == tender["record_key"]
    assert response.json()["report"]["source_id"] == tender["source_id"]
    assert {event["event_type"] for event in response.json()["audit_events"]} == {"mcp_tool_call", "model_call"}
    assert len({event["request_id"] for event in response.json()["audit_events"]}) == 1
    assert draft.status_code == 200
    assert draft.json()["record_key"] == tender["record_key"]
    assert draft.json()["external_action_taken"] is False
    assert len(draft.json()["audit_events"]) == 1
    assert draft.json()["audit_events"][0]["tool"] == "draft_review_memo"


@pytest.mark.asyncio
async def test_app_lifespan_reuses_mcp_sessions_across_requests(preview_environment) -> None:
    async with app.router.lifespan_context(app):
        gateway = app.state.mcp_gateway
        assert set(gateway.sessions) == {"bei_sawa", "filesystem"}
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            first, second = await asyncio.gather(
                client.get("/api/v1/tenders"),
                client.get("/api/v1/tenders"),
            )
            record_key = first.json()["items"][0]["record_key"]
            reviewed = await client.post("/api/v1/reviews", json={"record_key": record_key})
        assert first.status_code == second.status_code == 200
        assert reviewed.status_code == 200
        assert reviewed.json()["record_key"] == record_key
        assert app.state.mcp_gateway is gateway

    rows = [
        json.loads(line)
        for line in (preview_environment / "tool_audit.jsonl").read_text().splitlines()
    ]
    tool_rows = [row for row in rows if row["event_type"] == "mcp_tool_call"]
    assert len(tool_rows) == 5
    assert {row["server"] for row in tool_rows} == {"bei_sawa", "filesystem"}
    assert len({row["request_id"] for row in tool_rows}) == 3
    assert app.state.mcp_gateway is None
