"""Bounded LangGraph tool loop with deterministic evidence checks and abstention."""
import json
from typing import TypedDict, Any
from langgraph.graph import StateGraph, START, END
from beisawa.ollama import create_review_notes
from beisawa.planner import choose_tool

ALLOWED = {"search_tenders", "get_tender_record", "analyze_value_for_money", "draft_review_memo"}
MAX_STEPS = 8


class LoopState(TypedDict, total=False):
    record_key: str
    source_record: dict
    report: dict
    trace: list
    steps: int
    choice: dict
    feedback: str
    retrievals: int
    thin: bool
    done: bool
    abstained: bool
    model_notes: dict
    draft: dict


async def run_tool_loop(record_key, *, gateway, settings, request_id, chooser=choose_tool):
    listed = await gateway.sessions["bei_sawa"].list_tools()
    tools = [{"name": t.name, "description": t.description, "inputSchema": t.inputSchema} for t in listed.tools if t.name in ALLOWED]
    if {t["name"] for t in tools} != ALLOWED:
        raise ValueError("Required MCP tools are unavailable")
    playbook = await gateway.call("filesystem", "read_text_file", {"path": str(settings.data_dir / "review_playbook.md")}, request_id=request_id)

    async def plan(state):
        if state["steps"] >= MAX_STEPS:
            return {"choice": {"tool": "abstain", "reason": "Bounded step budget exhausted"}}
        context = {"record_key": record_key, "steps": state["steps"], "retrieved": "source_record" in state,
            "analyzed": "report" in state, "drafted": "draft" in state,
            "feedback": state.get("feedback", ""), "trace": state["trace"],
            "evidence": state.get("report", {})}
        choice = await chooser(context, tools, settings=settings, request_id=request_id)
        if choice["tool"] not in ALLOWED | {"finish", "abstain"}:
            raise ValueError("Planner selected a forbidden tool")
        return {"choice": choice}

    async def execute(state):
        choice = state["choice"]; tool = choice["tool"]
        trace = state["trace"] + [{"step": "tool_choice", "server": "ollama", "tool": tool, "reason": choice["reason"]}]
        update: dict[str, Any] = {"trace": trace, "steps": state["steps"]+1, "feedback": ""}
        if tool == "abstain":
            return {**update, "done": True, "abstained": True, "feedback": choice["reason"]}
        if tool == "finish":
            if not state.get("report") or state.get("thin"):
                return {**update, "feedback": "Cannot finish without adequate analyzed evidence; retrieve and analyze or abstain"}
            return {**update, "done": True}
        if tool in {"analyze_value_for_money", "draft_review_memo"} and not state.get("source_record"):
            return {**update, "feedback": "Retrieve the scoped record first"}
        if tool == "draft_review_memo" and (not state.get("report") or state.get("thin")):
            return {**update, "feedback": "Draft refused: adequate analyzed evidence is required"}
        if tool == "search_tenders":
            args = {"query": record_key.split("/")[-2] if "/" in record_key else record_key, "limit": 5}
        elif tool in {"get_tender_record", "analyze_value_for_money"}:
            args = {"record_key": record_key}
        else:
            args = {"record_key": record_key, "report_json": json.dumps(state["report"])}
        result = await gateway.call("bei_sawa", tool, args, request_id=request_id)
        if isinstance(result, dict) and result.get("error"):
            return {**update, "feedback": "The tool could not supply valid evidence; retrieve again or abstain"}
        if tool == "get_tender_record":
            update.update(source_record=result, retrievals=state.get("retrievals", 0)+1)
        elif tool == "analyze_value_for_money":
            if result.get("record_key") != record_key:
                raise ValueError("MCP report scope mismatch")
            update["report"] = result
        elif tool == "draft_review_memo":
            update["draft"] = result
        return update

    async def self_check(state):
        report = state.get("report")
        if not report:
            return {}
        findings_grounded = all(f.get("citations") for f in report.get("findings", []))
        # Incomplete assessments must not masquerade as a completed review.
        thin = not report.get("citations") or not findings_grounded or any(c.get("status") == "not_assessed" for c in report.get("checks", []))
        if thin:
            if state.get("retrievals", 0) >= 2:
                return {"thin": True, "done": True, "abstained": True, "feedback": "Evidence remains incomplete after retrieval retry"}
            record = await gateway.call("bei_sawa", "get_tender_record", {"record_key": record_key}, request_id=request_id)
            return {"source_record": record, "retrievals": state.get("retrievals", 0)+1, "thin": True,
                "feedback": "Self-check found incomplete evidence; record retrieved again. Reanalyze or abstain.",
                "trace": state["trace"] + [{"step": "self_check_retry", "server": "bei_sawa", "tool": "get_tender_record", "reason": "Incomplete cited evidence"}]}
        return {"thin": False}

    async def summarize(state):
        if not state.get("report") or not state.get("source_record"):
            raise ValueError("Agent abstained before retrieving and analyzing a report")
        if state.get("abstained"):
            notes = {"review_note": "Abstained: " + state.get("feedback", "Insufficient evidence"), "citation_ids": [], "questions": [],
                     "provider": "ollama", "model": settings.ollama_model, "used": True, "notice": "No completed assessment; do not file this review."}
        else:
            notes = await create_review_notes(state["report"], playbook.get("text", ""), request_id=request_id, settings=settings)
        return {"model_notes": notes}

    builder = StateGraph(LoopState)
    for name, node in [("plan", plan), ("execute", execute), ("self_check", self_check), ("summarize", summarize)]:
        builder.add_node(name, node)
    builder.add_edge(START, "plan"); builder.add_edge("plan", "execute"); builder.add_edge("execute", "self_check")
    builder.add_conditional_edges("self_check", lambda s: "summarize" if s.get("done") else "plan")
    builder.add_edge("summarize", END)
    state = await builder.compile().ainvoke({"record_key": record_key, "steps": 0, "trace": [], "retrievals": 0}, {"recursion_limit": 40})
    return {"review_id": request_id, "record_key": record_key, "source_record": state["source_record"], "ocid": state["report"]["ocid"],
        "report": state["report"], "model_notes": state["model_notes"],
        "model": {key: state["model_notes"][key] for key in ["provider", "model", "used", "notice"]} | {"name": state["model_notes"]["model"]},
        "trace": state["trace"], "abstained": state.get("abstained", False)}
