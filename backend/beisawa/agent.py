"""LangGraph workflow for scoped retrieval, evidence checks, and cited Qwen notes."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, TypedDict
from uuid import uuid4

from langgraph.graph import END, START, StateGraph

from beisawa.config import Settings, get_settings
from beisawa.mcp_client import MCPGateway
from beisawa.ollama import create_review_notes


class ReviewState(TypedDict, total=False):
    record_key: str
    request_id: str
    source_record: dict[str, Any]
    playbook: str
    report: dict[str, Any]
    model_notes: dict[str, Any]
    trace: list[dict[str, str]]


@asynccontextmanager
async def _gateway_scope(
    gateway: MCPGateway | None,
    *,
    request_id: str,
    settings: Settings,
) -> AsyncIterator[MCPGateway]:
    """Reuse the app-lifetime gateway or create a short-lived one for direct callers/tests."""

    if gateway is not None:
        yield gateway
    else:
        async with MCPGateway(
            include_filesystem=True,
            request_id=request_id,
            settings=settings,
        ) as local_gateway:
            yield local_gateway


async def run_review(
    record_key: str,
    *,
    request_id: str | None = None,
    gateway: MCPGateway | None = None,
) -> dict[str, Any]:
    request_id = request_id or str(uuid4())
    settings = get_settings()
    async with _gateway_scope(gateway, request_id=request_id, settings=settings) as gateway:
        async def retrieve(state: ReviewState) -> dict[str, Any]:
            source_record = await gateway.call(
                "bei_sawa",
                "get_tender_record",
                {"record_key": state["record_key"]},
                request_id=request_id,
            )
            if isinstance(source_record, dict) and source_record.get("error"):
                raise LookupError(f"OCDS source record not found: {state['record_key']}")
            playbook_result = await gateway.call(
                "filesystem",
                "read_text_file",
                {"path": str(settings.data_dir / "review_playbook.md")},
                request_id=request_id,
            )
            return {
                "source_record": source_record,
                "playbook": playbook_result.get("text", ""),
                "trace": [
                    {"step": "retrieve_record", "server": "bei_sawa", "tool": "get_tender_record"},
                    {"step": "read_review_playbook", "server": "filesystem", "tool": "read_text_file"},
                ],
            }

        async def analyze(state: ReviewState) -> dict[str, Any]:
            report = await gateway.call(
                "bei_sawa",
                "analyze_value_for_money",
                {"record_key": state["record_key"]},
                request_id=request_id,
            )
            if isinstance(report, dict) and report.get("error"):
                raise LookupError(f"Could not analyze source record: {state['record_key']}")
            if report.get("record_key") != state["record_key"]:
                raise ValueError("MCP analysis returned a report for a different source record.")
            return {
                "report": report,
                "trace": state.get("trace", [])
                + [
                    {
                        "step": "run_citation_first_checks",
                        "server": "bei_sawa",
                        "tool": "analyze_value_for_money",
                    }
                ],
            }

        async def reflect(state: ReviewState) -> dict[str, Any]:
            notes = await create_review_notes(
                state["report"],
                state.get("playbook", ""),
                request_id=state["request_id"],
                settings=settings,
            )
            return {
                "model_notes": notes,
                "trace": state.get("trace", [])
                + [{"step": "grounded_review_note", "server": "ollama", "tool": "qwen_review"}],
            }

        builder = StateGraph(ReviewState)
        builder.add_node("retrieve", retrieve)
        builder.add_node("analyze", analyze)
        builder.add_node("reflect", reflect)
        builder.add_edge(START, "retrieve")
        builder.add_edge("retrieve", "analyze")
        builder.add_edge("analyze", "reflect")
        builder.add_edge("reflect", END)
        graph = builder.compile()
        state = await graph.ainvoke(
            {"record_key": record_key, "request_id": request_id, "trace": []}
        )

    return {
        "review_id": request_id,
        "record_key": record_key,
        "source_record": state["source_record"],
        "ocid": state["report"]["ocid"],
        "report": state["report"],
        "model": {
            "provider": state["model_notes"]["provider"],
            "name": state["model_notes"]["model"],
            "used": state["model_notes"]["used"],
            "notice": state["model_notes"]["notice"],
        },
        "model_notes": state["model_notes"],
        "trace": state["trace"],
    }
