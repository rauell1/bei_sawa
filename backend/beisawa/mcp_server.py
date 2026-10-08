"""BeiSawa's own MCP server: scoped OCDS lookup, checks, and local draft writing."""

from __future__ import annotations

import json
from typing import Any

from mcp.server.fastmcp import FastMCP

from beisawa.analysis import analyze_record
from beisawa.config import get_settings
from beisawa.data import dataset_source_id, find_record, search_records
from beisawa.drafts import create_draft

mcp = FastMCP("bei-sawa-ocds-review")


def _encode(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


@mcp.tool()
def search_tenders(query: str = "", limit: int = 20) -> str:
    """Search the local OCDS dataset; results include a dataset-scoped record_key."""

    bounded_limit = max(1, min(int(limit), 50))
    items = search_records(query=query, limit=bounded_limit)
    return _encode(
        {
            "items": items,
            "count": len(items),
            "source_id": dataset_source_id(),
            "provenance": "synthetic_demo_data",
        }
    )


@mcp.tool()
def get_tender_record(record_key: str) -> str:
    """Return one source record by its composite source_id + OCID + record-id key."""

    record = find_record(record_key)
    if record is None:
        return _encode({"error": "not_found", "record_key": record_key})
    return _encode(
        {
            "source_id": dataset_source_id(),
            "record_key": record_key,
            "record": record,
        }
    )


@mcp.tool()
def analyze_value_for_money(record_key: str) -> str:
    """Run deterministic checks for one scoped record and attach JSON Pointer citations."""

    record = find_record(record_key)
    if record is None:
        return _encode({"error": "not_found", "record_key": record_key})
    return _encode(analyze_record(record, dataset_source_id()))


@mcp.tool()
def draft_review_memo(record_key: str, report_json: str) -> str:
    """Write a citation-validated local draft; this never changes a tender or files a report."""

    try:
        report = json.loads(report_json)
    except json.JSONDecodeError as exc:
        return _encode({"error": "invalid_report_json", "message": str(exc)})
    if not isinstance(report, dict) or report.get("record_key") != record_key:
        return _encode({"error": "record_mismatch", "record_key": record_key})
    try:
        result = create_draft(report, get_settings().drafts_dir)
    except (ValueError, OSError) as exc:
        return _encode({"error": "draft_rejected", "message": str(exc)})
    return _encode(result)


if __name__ == "__main__":
    mcp.run(transport="stdio")
