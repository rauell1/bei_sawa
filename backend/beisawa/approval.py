"""Portable LangGraph human interrupt; Neon stores checkpoints with immutable drafts.

This graph never writes a filed report. The Neon transaction remains the authority
for role checks, exact-hash approval, ownership, and idempotent filing.
"""
from typing import TypedDict
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command, interrupt


class FilingState(TypedDict, total=False):
    draft_id: str
    content_hash: str
    owner_id: str
    decision: str
    approver_name: str
    ready_to_file: bool


def _graph(saver):
    def human_review(state):
        decision = interrupt({"draft_id": state["draft_id"], "content_hash": state["content_hash"], "requires": "named authenticated human decision"})
        if decision.get("content_hash") != state["content_hash"] or decision.get("approver_id") != state["owner_id"] or not decision.get("approver_name"):
            raise ValueError("Approval does not match this draft revision and owner")
        return {"decision": decision["decision"], "approver_name": decision["approver_name"]}
    def file_report(state):
        if state["decision"] != "approve":
            raise ValueError("Rejected drafts cannot be filed")
        return {"ready_to_file": True}
    graph = StateGraph(FilingState)
    graph.add_node("human_review", human_review)
    graph.add_node("file_report", file_report)
    graph.add_edge(START, "human_review")
    graph.add_edge("human_review", "file_report")
    graph.add_edge("file_report", END)
    return graph.compile(checkpointer=saver)


def prepare_gate(draft_id: str, content_hash: str, owner_id: str) -> dict:
    saver = InMemorySaver()
    config = {"configurable": {"thread_id": draft_id}}
    result = _graph(saver).invoke({"draft_id": draft_id, "content_hash": content_hash, "owner_id": owner_id}, config)
    saved = saver.get_tuple(config)
    return {"workflow_version": 1, "checkpoint": saved.checkpoint, "metadata": saved.metadata,
            "interrupt": result["__interrupt__"][0].value}


def resume_gate(saved: dict, approval: dict, owner_id: str) -> dict:
    if saved.get("workflow_version") != 1:
        raise ValueError("Unsupported approval workflow revision")
    checkpoint = saved["checkpoint"]
    state = checkpoint["channel_values"]
    if state["owner_id"] != owner_id or state["content_hash"] != approval["content_hash"]:
        raise ValueError("Checkpoint owner or revision mismatch")
    saver = InMemorySaver()
    config = {"configurable": {"thread_id": state["draft_id"], "checkpoint_ns": ""}}
    saver.put(config, checkpoint, saved["metadata"], checkpoint["channel_versions"])
    result = _graph(saver).invoke(Command(resume=approval), config)
    return {"ready_to_file": result.get("ready_to_file", False), "draft_id": result["draft_id"], "content_hash": result["content_hash"]}
