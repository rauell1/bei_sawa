"""Dataset-scoped OCDS accessors.

OCDS OCIDs and record IDs are retained as source identifiers, not used alone as
application primary keys. Internal lookups use a namespaced key composed from the
source dataset id, OCID, and OCDS record id.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote

from beisawa.config import get_settings


class DuplicateRecordReference(ValueError):
    """The same dataset-scoped source reference appears more than once."""


@lru_cache(maxsize=4)
def load_dataset(data_file: str | None = None) -> dict[str, Any]:
    path = Path(data_file).resolve() if data_file else get_settings().data_dir / "ocds_demo.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or not isinstance(payload.get("records"), list):
        raise ValueError(f"Invalid OCDS dataset manifest: {path}")
    if not isinstance(payload.get("dataset_id"), str) or not payload["dataset_id"].strip():
        raise ValueError(f"Dataset is missing a stable dataset_id: {path}")
    return payload


def dataset_source_id(data_file: str | None = None) -> str:
    return load_dataset(data_file)["dataset_id"]


@lru_cache(maxsize=4)
def load_records(data_file: str | None = None) -> tuple[dict[str, Any], ...]:
    """Load a dataset's records without rewriting the source OCDS objects."""

    return tuple(load_dataset(data_file)["records"])


def clear_record_cache() -> None:
    load_dataset.cache_clear()
    load_records.cache_clear()


def make_record_key(source_id: str, ocid: str, record_id: str) -> str:
    """Create a stable internal key from the complete source context."""

    parts = (source_id, ocid, record_id)
    if any(not isinstance(part, str) or not part.strip() for part in parts):
        raise ValueError("A record key requires source_id, OCID, and OCDS record id.")
    return "::".join(quote(part, safe="") for part in parts)


def split_record_key(record_key: str) -> tuple[str, str, str]:
    parts = record_key.split("::") if isinstance(record_key, str) else []
    if len(parts) != 3 or any(not part for part in parts):
        raise ValueError("record_key must encode source_id, OCID, and OCDS record id.")
    return tuple(unquote(part) for part in parts)  # type: ignore[return-value]


def record_key_for(record: dict[str, Any], source_id: str | None = None) -> str:
    return make_record_key(
        source_id or dataset_source_id(),
        record.get("ocid"),
        record.get("id"),
    )


def find_record(
    record_key: str,
    records: tuple[dict[str, Any], ...] | None = None,
    source_id: str | None = None,
) -> dict[str, Any] | None:
    """Resolve a source record only by its dataset-scoped composite key.

    Bare OCIDs are deliberately rejected. If duplicate copies of the same
    composite source reference occur, fail closed instead of silently picking one.
    """

    try:
        key_source_id, key_ocid, key_record_id = split_record_key(record_key)
    except ValueError:
        return None
    if source_id is not None and source_id != key_source_id:
        return None
    matches = [
        record
        for record in (records if records is not None else load_records())
        if record.get("ocid") == key_ocid
        and record.get("id") == key_record_id
        and key_source_id == (source_id or dataset_source_id())
    ]
    if len(matches) > 1:
        raise DuplicateRecordReference(
            "The dataset contains more than one record with this source reference."
        )
    return matches[0] if matches else None


def compiled_release(record: dict[str, Any]) -> tuple[dict[str, Any], str]:
    """Return the compiled release and its JSON Pointer base in a record."""

    compiled = record.get("compiledRelease")
    if isinstance(compiled, dict):
        return compiled, "/compiledRelease"
    releases = record.get("releases")
    if isinstance(releases, list) and releases and isinstance(releases[-1], dict):
        index = len(releases) - 1
        return releases[-1], f"/releases/{index}"
    return {}, "/compiledRelease"


def record_summary(record: dict[str, Any], source_id: str | None = None) -> dict[str, Any]:
    source_id = source_id or dataset_source_id()
    release, _ = compiled_release(record)
    tender = release.get("tender") or {}
    awards = release.get("awards") or []
    award = awards[0] if len(awards) == 1 and isinstance(awards[0], dict) else {}
    estimate = tender.get("value") or {}
    award_value = award.get("value") or {}
    return {
        "record_key": record_key_for(record, source_id),
        "source_id": source_id,
        "ocid": record.get("ocid", ""),
        "record_id": record.get("id", ""),
        "title": tender.get("title") or "Untitled OCDS record",
        "status": tender.get("status") or "unknown",
        "procurement_method": tender.get("procurementMethod"),
        "number_of_tenderers": tender.get("numberOfTenderers"),
        "estimated_value": estimate.get("amount"),
        "award_value": award_value.get("amount"),
        "currency": estimate.get("currency") or award_value.get("currency"),
        "provenance": "synthetic_demo_data",
    }


def search_records(query: str = "", limit: int = 20) -> list[dict[str, Any]]:
    normalized = query.strip().casefold()
    source_id = dataset_source_id()
    items = []
    for record in load_records():
        summary = record_summary(record, source_id)
        haystack = " ".join(
            str(summary.get(key) or "")
            for key in ("source_id", "ocid", "record_id", "title", "status", "procurement_method")
        ).casefold()
        if normalized and normalized not in haystack:
            continue
        items.append(summary)
        if len(items) >= limit:
            break
    return items
