from __future__ import annotations

from typing import Any, Callable

import pytest

from beisawa.data import load_records, record_key_for


def _unique_demo_record(ocid: str) -> dict[str, Any]:
    matches = [record for record in load_records() if record.get("ocid") == ocid]
    if len(matches) != 1:
        raise AssertionError(f"Expected exactly one fixture with OCID {ocid!r}; got {len(matches)}")
    return matches[0]


@pytest.fixture
def demo_record() -> Callable[[str], dict[str, Any]]:
    """Resolve a fixture for tests while keeping production lookups dataset-scoped."""

    return _unique_demo_record


@pytest.fixture
def demo_record_key() -> Callable[[str], str]:
    """Return the internal source_id + OCID + record_id key for a fixture."""

    return lambda ocid: record_key_for(_unique_demo_record(ocid))
