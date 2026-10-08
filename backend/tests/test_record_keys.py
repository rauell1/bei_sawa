from __future__ import annotations

from copy import deepcopy

import pytest

from beisawa.data import (
    DuplicateRecordReference,
    dataset_source_id,
    find_record,
    make_record_key,
    search_records,
)


def test_same_ocid_and_record_id_are_scoped_by_source_dataset() -> None:
    first = {"ocid": "ocds-same", "id": "record-same", "compiledRelease": {}}
    second = deepcopy(first)
    key_a = make_record_key("publisher-a:dataset-1", first["ocid"], first["id"])
    key_b = make_record_key("publisher-b:dataset-1", second["ocid"], second["id"])
    assert key_a != key_b
    assert find_record(key_a, records=(first,), source_id="publisher-a:dataset-1") is first
    assert find_record(key_b, records=(second,), source_id="publisher-b:dataset-1") is second
    assert find_record("ocds-same", records=(first,), source_id="publisher-a:dataset-1") is None


def test_same_source_ocid_can_be_scoped_by_distinct_record_id() -> None:
    first = {"ocid": "ocds-same", "id": "record-release-a", "compiledRelease": {}}
    second = {"ocid": "ocds-same", "id": "record-release-b", "compiledRelease": {}}
    key_a = make_record_key("publisher-a:dataset-1", first["ocid"], first["id"])
    key_b = make_record_key("publisher-a:dataset-1", second["ocid"], second["id"])

    assert key_a != key_b
    assert find_record(key_a, records=(first, second), source_id="publisher-a:dataset-1") is first
    assert find_record(key_b, records=(first, second), source_id="publisher-a:dataset-1") is second


def test_duplicate_full_source_reference_fails_closed() -> None:
    record = {"ocid": "ocds-dup", "id": "record-dup", "compiledRelease": {}}
    key = make_record_key("dataset-a", record["ocid"], record["id"])
    with pytest.raises(DuplicateRecordReference):
        find_record(key, records=(record, deepcopy(record)), source_id="dataset-a")


def test_search_can_filter_by_dataset_source_id() -> None:
    source_id = dataset_source_id()
    results = search_records(source_id)
    assert results
    assert all(item["source_id"] == source_id for item in results)
