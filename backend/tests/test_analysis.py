from __future__ import annotations

from copy import deepcopy

from beisawa.analysis import _pointer_value, analyze_record
from beisawa.data import load_records


def test_over_estimate_signal_cites_both_values_and_currencies(demo_record) -> None:
    record = demo_record("ocds-beisawa-demo-2026-0001")
    report = analyze_record(record)
    variance = next(item for item in report["findings"] if item["signal_type"] == "estimate_variance")
    assert "18.0%" in variance["explanation"]
    assert {item["json_pointer"] for item in variance["citations"]} == {
        "/compiledRelease/tender/value/amount",
        "/compiledRelease/awards/0/value/amount",
        "/compiledRelease/tender/value/currency",
        "/compiledRelease/awards/0/value/currency",
    }
    assert all(item["ocid"] == record["ocid"] for item in variance["citations"])
    assert all(item["record_id"] == record["id"] for item in variance["citations"])
    assert all(item["record_key"] == report["record_key"] for item in variance["citations"])


def test_low_competition_is_neutral_and_cited(demo_record) -> None:
    record = demo_record("ocds-beisawa-demo-2026-0004")
    report = analyze_record(record)
    finding = next(item for item in report["findings"] if item["signal_type"] == "competition_review")
    assert finding["citations"][0]["json_pointer"] == "/compiledRelease/tender/numberOfTenderers"
    assert "does not establish" in finding["explanation"]
    assert finding["status"] == "requires_human_review"


def test_below_estimate_record_has_no_value_variance_signal(demo_record) -> None:
    report = analyze_record(demo_record("ocds-beisawa-demo-2026-0002"))
    assert not any(item["signal_type"] == "estimate_variance" for item in report["findings"])
    assert {check["status"] for check in report["checks"]} == {"no_signal"}


def test_missing_fields_are_limitations_not_findings(demo_record) -> None:
    report = analyze_record(demo_record("ocds-beisawa-demo-2026-0003"))
    assert report["findings"] == []
    assert len(report["limitations"]) == 2
    assert all(check["status"] == "not_assessed" for check in report["checks"])
    assert report["result_label"] == "No automated signal found"


def test_zero_estimate_is_not_mislabeled_as_no_signal(demo_record) -> None:
    record = deepcopy(demo_record("ocds-beisawa-demo-2026-0001"))
    record["compiledRelease"]["tender"]["value"]["amount"] = 0
    report = analyze_record(record)
    estimate_check = next(item for item in report["checks"] if item["check"] == "estimate_vs_award")
    assert estimate_check["status"] == "not_assessed"
    assert any("positive tender estimate" in item for item in report["limitations"])
    assert not any(item["signal_type"] == "estimate_variance" for item in report["findings"])


def test_multiple_awards_are_not_compared_against_one_total_estimate(demo_record) -> None:
    record = deepcopy(demo_record("ocds-beisawa-demo-2026-0001"))
    record["compiledRelease"]["awards"].append(deepcopy(record["compiledRelease"]["awards"][0]))
    report = analyze_record(record)
    estimate_check = next(item for item in report["checks"] if item["check"] == "estimate_vs_award")
    assert estimate_check["status"] == "not_assessed"
    assert any("single award" in item for item in report["limitations"])
    assert not any(item["signal_type"] == "estimate_variance" for item in report["findings"])


def test_all_demo_records_are_explicitly_synthetic() -> None:
    records = load_records()
    assert len(records) >= 4
    assert all(record.get("id", "").startswith("record-demo-") for record in records)
    assert all(record.get("compiledRelease", {}).get("tag") == ["compiled"] for record in records)


def test_every_signal_in_every_fixture_resolves_to_its_record() -> None:
    for record in load_records():
        report = analyze_record(record)
        for finding in report["findings"]:
            assert finding["ocid"] == record["ocid"]
            assert finding["record_id"] == record["id"]
            assert finding["record_key"] == report["record_key"]
            assert finding["citations"]
            for citation in finding["citations"]:
                assert citation["source_id"] == report["source_id"]
                assert citation["record_key"] == report["record_key"]
                assert citation["release_id"] == record["compiledRelease"]["id"]
                assert _pointer_value(record, citation["json_pointer"]) == citation["value"]
