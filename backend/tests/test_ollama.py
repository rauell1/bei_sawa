from __future__ import annotations

import pytest

from beisawa.analysis import analyze_record
from beisawa.ollama import ModelOutputError, _validate_notes


def test_model_notes_require_valid_source_citations(demo_record) -> None:
    report = analyze_record(demo_record("ocds-beisawa-demo-2026-0001"))
    with pytest.raises(ModelOutputError, match="did not cite"):
        _validate_notes(
            {"review_note": "Please check the value.", "citation_ids": [], "questions": []}, report
        )


def test_model_questions_reject_unknown_citations(demo_record) -> None:
    report = analyze_record(demo_record("ocds-beisawa-demo-2026-0001"))
    with pytest.raises(ModelOutputError, match="valid source citation"):
        _validate_notes(
            {
                "review_note": "",
                "citation_ids": [],
                "questions": [{"text": "Why?", "citation_ids": ["C999"]}],
            },
            report,
        )


def test_stub_mode_is_not_mislabeled_as_qwen(demo_record) -> None:
    from beisawa.ollama import _stub_notes

    report = analyze_record(demo_record("ocds-beisawa-demo-2026-0001"))
    result = _stub_notes(report)
    assert result["review_note"].startswith("Test-mode summary")
    assert all(cid in {c["citation_id"] for c in report["citations"]} for cid in result["citation_ids"])
