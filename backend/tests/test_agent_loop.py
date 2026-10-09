from types import SimpleNamespace
import pytest
from beisawa.agent_loop import run_tool_loop, MAX_STEPS
from beisawa.analysis import analyze_record
from beisawa.config import get_settings, reset_settings_for_tests


class Gateway:
    def __init__(self, record, report):
        self.record, self.report, self.calls = record, report, []
        self.sessions = {"bei_sawa": self}
    async def list_tools(self):
        return SimpleNamespace(tools=[SimpleNamespace(name=n, description=n, inputSchema={}) for n in ["search_tenders", "get_tender_record", "analyze_value_for_money", "draft_review_memo"]])
    async def call(self, server, tool, args, **kw):
        self.calls.append((tool, args))
        return {"text": "guidance"} if server == "filesystem" else self.record if tool == "get_tender_record" else self.report if tool == "analyze_value_for_money" else {"draft_id": "test-draft"}


@pytest.mark.asyncio
async def test_choices_use_discovered_tools_and_server_scoped_arguments(demo_record, demo_record_key, monkeypatch):
    monkeypatch.setenv("BEISAWA_LLM_MODE", "stub"); reset_settings_for_tests()
    record = demo_record("ocds-beisawa-demo-2026-0001")
    report = analyze_record(record)
    gateway = Gateway(record, report)
    sequence = iter(["get_tender_record", "analyze_value_for_money", "draft_review_memo", "finish"])
    async def choose(context, tools, **kwargs):
        assert len(tools) == 4
        return {"tool": next(sequence), "reason": "Test choice based on observed state"}
    result = await run_tool_loop(demo_record_key(record["ocid"]), gateway=gateway, settings=get_settings(), request_id="loop-test", chooser=choose)
    assert not result["abstained"]
    assert [t["tool"] for t in result["trace"]] == ["get_tender_record", "analyze_value_for_money", "draft_review_memo", "finish"]
    assert all(args.get("record_key", report["record_key"]) == report["record_key"] for tool, args in gateway.calls)
    reset_settings_for_tests()


@pytest.mark.asyncio
async def test_thin_evidence_retrieves_again_then_abstains_without_drafting(demo_record, demo_record_key, monkeypatch):
    monkeypatch.setenv("BEISAWA_LLM_MODE", "stub"); reset_settings_for_tests()
    record = demo_record("ocds-beisawa-demo-2026-0001")
    report = analyze_record(record); report["checks"][0]["status"] = "not_assessed"
    gateway = Gateway(record, report)
    sequence = iter(["get_tender_record", "analyze_value_for_money", "analyze_value_for_money"])
    async def choose(*args, **kwargs):
        return {"tool": next(sequence), "reason": "Test evidence retry"}
    result = await run_tool_loop(demo_record_key(record["ocid"]), gateway=gateway, settings=get_settings(), request_id="thin-test", chooser=choose)
    assert result["abstained"]
    assert len([t for t, _ in gateway.calls if t == "get_tender_record"]) == 2
    assert not any(t == "draft_review_memo" for t, _ in gateway.calls)
    assert any(t["step"] == "self_check_retry" for t in result["trace"])
    reset_settings_for_tests()


@pytest.mark.asyncio
async def test_step_budget_stops_repeated_choices(demo_record, demo_record_key, monkeypatch):
    monkeypatch.setenv("BEISAWA_LLM_MODE", "stub"); reset_settings_for_tests()
    record = demo_record("ocds-beisawa-demo-2026-0001")
    gateway = Gateway(record, analyze_record(record)); choices = []
    async def choose(*args, **kwargs):
        tool = "get_tender_record" if not choices else "analyze_value_for_money"
        choices.append(tool)
        return {"tool": tool, "reason": "Repeated test choice"}
    result = await run_tool_loop(demo_record_key(record["ocid"]), gateway=gateway, settings=get_settings(), request_id="bounded-test", chooser=choose)
    assert result["abstained"]
    assert len(choices) == MAX_STEPS
    reset_settings_for_tests()
