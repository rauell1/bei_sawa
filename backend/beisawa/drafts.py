"""Safe, local-only draft writing with strict OCDS citation validation."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from beisawa.analysis import _pointer_value, analyze_record
from beisawa.data import compiled_release, dataset_source_id, find_record, record_key_for


class InvalidDraft(ValueError):
    """The submitted draft does not have valid citations for its OCDS record."""


def validate_report_citations(report: dict[str, Any], record: dict[str, Any]) -> None:
    if report.get("ocid") != record.get("ocid") or report.get("record_id") != record.get("id"):
        raise InvalidDraft("The draft does not match the selected OCDS record.")

    source_id = dataset_source_id()
    expected_record_key = record_key_for(record, source_id)
    if report.get("source_id") != source_id or report.get("record_key") != expected_record_key:
        raise InvalidDraft("The report does not match the dataset-scoped source record.")
    release, _ = compiled_release(record)
    expected_release_id = release.get("id")

    def validate_citation(citation: Any) -> None:
        if not isinstance(citation, dict):
            raise InvalidDraft("A citation must be an object.")
        if citation.get("source_id") != source_id or citation.get("record_key") != expected_record_key:
            raise InvalidDraft("A citation points to a different dataset-scoped source record.")
        if citation.get("ocid") != record.get("ocid"):
            raise InvalidDraft("A citation points to a different OCDS record.")
        if citation.get("record_id") != record.get("id"):
            raise InvalidDraft("A citation has an unexpected OCDS record id.")
        if citation.get("release_id") != expected_release_id:
            raise InvalidDraft("A citation has an unexpected OCDS release id.")
        pointer = citation.get("json_pointer")
        if not isinstance(pointer, str):
            raise InvalidDraft("A citation is missing its JSON Pointer.")
        try:
            actual = _pointer_value(record, pointer)
        except (KeyError, ValueError, IndexError) as exc:
            raise InvalidDraft(f"Citation path does not exist: {pointer}") from exc
        if actual != citation.get("value"):
            raise InvalidDraft(f"Citation value does not match the OCDS record: {pointer}")

    findings = report.get("findings")
    if not isinstance(findings, list):
        raise InvalidDraft("The report findings must be a list.")

    for finding in findings:
        if not isinstance(finding, dict):
            raise InvalidDraft("A finding must be an object.")
        if (
            finding.get("source_id") != source_id
            or finding.get("record_key") != expected_record_key
            or finding.get("ocid") != record.get("ocid")
            or finding.get("record_id") != record.get("id")
        ):
            raise InvalidDraft("A finding does not match the selected dataset-scoped OCDS record.")
        citations = finding.get("citations")
        if not isinstance(citations, list) or not citations:
            raise InvalidDraft("Every finding must contain at least one OCDS citation.")
        for citation in citations:
            validate_citation(citation)

    report_citations = report.get("citations", [])
    if not isinstance(report_citations, list):
        raise InvalidDraft("The report citations must be a list.")
    for citation in report_citations:
        validate_citation(citation)


def create_draft(report: dict[str, Any], drafts_dir: Path) -> dict[str, Any]:
    record_key = report.get("record_key")
    if not isinstance(record_key, str):
        raise InvalidDraft("A dataset-scoped source record key is required.")
    record = find_record(record_key)
    if record is None:
        raise InvalidDraft("Unknown or ambiguous source record; no draft was written.")
    validate_report_citations(report, record)
    canonical_report = analyze_record(record)
    if set(report) != set(canonical_report):
        raise InvalidDraft("Only the canonical analysis fields can be drafted; abstained reviews cannot be filed.")
    for key in (
        "source_id",
        "record_key",
        "ocid",
        "record_id",
        "title",
        "record_date",
        "provenance",
        "result_label",
        "findings",
        "limitations",
        "checks",
        "citations",
        "disclaimer",
    ):
        if report.get(key) != canonical_report.get(key):
            raise InvalidDraft(f"The report field '{key}' does not match the server-side OCDS analysis.")

    draft_id = f"draft-{uuid4().hex}"
    created_at = datetime.now(UTC).isoformat()
    document = {
        "draft_id": draft_id,
        "created_at": created_at,
        "status": "draft_requires_human_review",
        "source_id": canonical_report["source_id"],
        "record_key": canonical_report["record_key"],
        "ocid": record["ocid"],
        "record_id": record["id"],
        "title": canonical_report["title"],
        "result_label": canonical_report["result_label"],
        "findings": canonical_report["findings"],
        "limitations": canonical_report["limitations"],
        "citations": canonical_report["citations"],
        "disclaimer": canonical_report["disclaimer"],
        "decision": None,
        "human_approver": None,
        "external_action_taken": False,
    }

    drafts_dir = drafts_dir.resolve()
    drafts_dir.mkdir(parents=True, exist_ok=True)
    path = drafts_dir / f"{draft_id}.json"
    # Exclusive creation avoids an accidental overwrite, even in the extraordinarily
    # unlikely event of a generated identifier collision.
    with path.open("x", encoding="utf-8") as stream:
        json.dump(document, stream, ensure_ascii=False, indent=2)
        stream.write("\n")

    return {
        "draft_id": draft_id,
        "status": document["status"],
        "source_id": document["source_id"],
        "record_key": document["record_key"],
        "ocid": document["ocid"],
        "record_id": document["record_id"],
        "path": str(Path("drafts") / path.name),
        "created_at": created_at,
        "external_action_taken": False,
        "message": "Saved locally as a draft. It has not been approved or sent anywhere.",
    }
