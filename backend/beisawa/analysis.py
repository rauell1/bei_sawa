"""Deterministic, citation-first value-for-money checks over OCDS JSON."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from beisawa.data import load_dataset, compiled_release, dataset_source_id, record_key_for, record_summary


DISCLAIMER = (
    "Automated triage only. A review signal is not evidence of wrongdoing and is not a "
    "procurement decision. A human must verify the underlying record and applicable rules."
)


def _pointer_value(document: Any, pointer: str) -> Any:
    if pointer == "":
        return document
    if not pointer.startswith("/"):
        raise ValueError("JSON Pointer must be empty or start with '/'.")
    current = document
    for raw_segment in pointer[1:].split("/"):
        segment = raw_segment.replace("~1", "/").replace("~0", "~")
        if isinstance(current, list):
            try:
                current = current[int(segment)]
            except (ValueError, IndexError) as exc:
                raise KeyError(pointer) from exc
        elif isinstance(current, dict) and segment in current:
            current = current[segment]
        else:
            raise KeyError(pointer)
    return current


def _as_decimal(value: Any) -> Decimal | None:
    if isinstance(value, bool) or value is None:
        return None
    try:
        number = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None
    return number if number.is_finite() and number >= 0 else None


def analyze_record(record: dict[str, Any], source_id: str | None = None) -> dict[str, Any]:
    """Create review signals whose source values can all be resolved from this record."""

    source_id = source_id or dataset_source_id()
    record_key = record_key_for(record, source_id)
    release, release_base = compiled_release(record)
    summary = record_summary(record, source_id)
    tender = release.get("tender") if isinstance(release.get("tender"), dict) else {}
    awards = release.get("awards") if isinstance(release.get("awards"), list) else []
    award = awards[0] if awards and isinstance(awards[0], dict) else {}
    tender_value = tender.get("value") if isinstance(tender.get("value"), dict) else {}
    award_value = award.get("value") if isinstance(award.get("value"), dict) else {}

    citations: list[dict[str, Any]] = []
    findings: list[dict[str, Any]] = []
    checks: list[dict[str, Any]] = []
    limitations: list[str] = []

    def cite(pointer_suffix: str, value: Any, label: str) -> dict[str, Any]:
        citation_id = f"C{len(citations) + 1}"
        citation = {
            "citation_id": citation_id,
            "source_id": source_id,
            "record_key": record_key,
            "ocid": record.get("ocid"),
            "record_id": record.get("id"),
            "release_id": release.get("id"),
            "json_pointer": f"{release_base}{pointer_suffix}",
            "label": label,
            "value": value,
        }
        citations.append(citation)
        return citation

    # Keep a resolvable source anchor even when a record has no usable value fields. This
    # lets the model ask a properly cited data-completeness question without inventing facts.
    cite("/ocid", record.get("ocid"), "OCDS record identifier")

    estimate = _as_decimal(tender_value.get("amount"))
    award_amount = _as_decimal(award_value.get("amount"))
    estimate_currency = tender_value.get("currency")
    award_currency = award_value.get("currency")

    if len(awards) != 1:
        limitations.append("A single award is required for this simple estimate comparison; comparison was skipped.")
        checks.append({"check": "estimate_vs_award", "status": "not_assessed"})
    elif estimate is None:
        limitations.append("No usable tender estimate is recorded; the value comparison was skipped.")
        checks.append({"check": "estimate_vs_award", "status": "not_assessed"})
    elif estimate <= 0:
        limitations.append("A positive tender estimate is required for a percentage comparison; comparison was skipped.")
        checks.append({"check": "estimate_vs_award", "status": "not_assessed"})
    elif award_amount is None:
        limitations.append("No usable award value is recorded; the value comparison was skipped.")
        checks.append({"check": "estimate_vs_award", "status": "not_assessed"})
    elif not estimate_currency or not award_currency or estimate_currency != award_currency:
        limitations.append("Tender estimate and award currencies are missing or differ; comparison was skipped.")
        checks.append({"check": "estimate_vs_award", "status": "not_assessed"})
    else:
        estimate_citation = cite(
            f"/tender/value/amount", tender_value.get("amount"), "Tender estimate amount"
        )
        award_citation = cite(
            "/awards/0/value/amount", award_value.get("amount"), "First award amount"
        )
        currency_citations = [
            cite("/tender/value/currency", estimate_currency, "Tender estimate currency"),
            cite("/awards/0/value/currency", award_currency, "First award currency"),
        ]
        delta = award_amount - estimate
        percentage = (delta / estimate * Decimal("100")) if estimate > 0 else Decimal("0")
        if estimate > 0 and percentage > Decimal("10"):
            finding = {
                "finding_id": "value_above_estimate",
                "signal_type": "estimate_variance",
                "severity": "medium",
                "title": "Award value is over 10% above the recorded estimate",
                "explanation": (
                    f"The recorded first-award value is {percentage.quantize(Decimal('0.1'))}% "
                    "above the tender estimate. This is a prompt to verify scope, amendments, "
                    "and the published estimate; it is not proof of overpayment."
                ),
                "status": "requires_human_review",
                "citations": [estimate_citation, award_citation, *currency_citations],
            }
            findings.append(finding)
            checks.append({"check": "estimate_vs_award", "status": "review_signal"})
        else:
            checks.append({"check": "estimate_vs_award", "status": "no_signal"})

    tenderers = tender.get("numberOfTenderers")
    if isinstance(tenderers, int) and not isinstance(tenderers, bool) and tenderers >= 0:
        tenderers_citation = cite(
            "/tender/numberOfTenderers", tenderers, "Recorded number of tenderers"
        )
        if tenderers < 3:
            findings.append(
                {
                    "finding_id": "limited_recorded_competition",
                    "signal_type": "competition_review",
                    "severity": "low",
                    "title": "Fewer than three tenderers are recorded",
                    "explanation": (
                        "The record shows fewer than three tenderers. Check the competition "
                        "record and any documented justification; the count alone does not "
                        "establish a procurement breach."
                    ),
                    "status": "requires_human_review",
                    "citations": [tenderers_citation],
                }
            )
            checks.append({"check": "recorded_competition", "status": "review_signal"})
        else:
            checks.append({"check": "recorded_competition", "status": "no_signal"})
    else:
        limitations.append("A valid tenderer count is not present; the competition check was skipped.")
        checks.append({"check": "recorded_competition", "status": "not_assessed"})

    for finding in findings:
        if not finding["citations"]:
            raise AssertionError("A finding must have at least one source citation.")
        finding["source_id"] = source_id
        finding["record_key"] = record_key
        finding["record_id"] = record.get("id")
        finding["ocid"] = record.get("ocid")

    return {
        "source_id": source_id,
        "record_key": record_key,
        "ocid": record.get("ocid"),
        "record_id": record.get("id"),
        "title": summary["title"],
        "record_date": release.get("date"),
        "provenance": load_dataset().get("provenance", "unverified_source"),
        "result_label": "Review signal(s) found" if findings else "No automated signal found",
        "findings": findings,
        "limitations": limitations,
        "checks": checks,
        "citations": citations,
        "disclaimer": DISCLAIMER,
    }
