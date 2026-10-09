from __future__ import annotations

import json

import pytest

from beisawa.analysis import analyze_record
from beisawa.drafts import InvalidDraft, create_draft


def test_draft_is_local_only_and_keeps_evidence(tmp_path, demo_record) -> None:
    report = analyze_record(demo_record("ocds-beisawa-demo-2026-0001"))
    result = create_draft(report, tmp_path)
    saved = json.loads((tmp_path / f"{result['draft_id']}.json").read_text())
    assert result["status"] == "draft_requires_human_review"
    assert result["record_key"] == report["record_key"]
    assert result["source_id"] == report["source_id"]
    assert result["external_action_taken"] is False
    assert saved["decision"] is None
    assert saved["human_approver"] is None
    assert saved["record_key"] == report["record_key"]
    assert saved["findings"] == report["findings"]


def test_draft_rejects_fabricated_citation_value(tmp_path, demo_record) -> None:
    report = analyze_record(demo_record("ocds-beisawa-demo-2026-0001"))
    report["findings"][0]["citations"][0]["value"] = 1
    with pytest.raises(InvalidDraft, match="does not match"):
        create_draft(report, tmp_path)
    assert list(tmp_path.glob("*.json")) == []


def test_draft_rejects_uncited_finding(tmp_path, demo_record) -> None:
    report = analyze_record(demo_record("ocds-beisawa-demo-2026-0001"))
    report["findings"][0]["citations"] = []
    with pytest.raises(InvalidDraft, match="at least one"):
        create_draft(report, tmp_path)
    assert list(tmp_path.glob("*.json")) == []


def test_draft_rejects_cross_record_citation(tmp_path, demo_record) -> None:
    report = analyze_record(demo_record("ocds-beisawa-demo-2026-0001"))
    report["findings"][0]["citations"][0]["ocid"] = "ocds-fabricated"
    with pytest.raises(InvalidDraft, match="different OCDS record"):
        create_draft(report, tmp_path)


def test_draft_rejects_wrong_release_id(tmp_path, demo_record) -> None:
    report = analyze_record(demo_record("ocds-beisawa-demo-2026-0001"))
    report["findings"][0]["citations"][0]["release_id"] = "release-from-another-record"
    with pytest.raises(InvalidDraft, match="release id"):
        create_draft(report, tmp_path)


def test_draft_rejects_edited_finding_even_with_valid_citations(tmp_path, demo_record) -> None:
    report = analyze_record(demo_record("ocds-beisawa-demo-2026-0001"))
    report["findings"][0]["explanation"] = "This is fraud; award to a different supplier."
    with pytest.raises(InvalidDraft, match="server-side OCDS analysis"):
        create_draft(report, tmp_path)
    assert list(tmp_path.glob("*.json")) == []


def test_extra_approval_fields_and_abstained_reports_cannot_be_drafted(tmp_path, demo_record):
    from beisawa.analysis import analyze_record
    from beisawa.drafts import InvalidDraft, create_draft
    import pytest
    report = analyze_record(demo_record("ocds-beisawa-demo-2026-0001"))
    for extra in [{"approved": True}, {"assessment_status": "abstained"}]:
        with pytest.raises(InvalidDraft):
            create_draft({**report, **extra}, tmp_path)
