import importlib.util
import json
from pathlib import Path
import pytest

spec = importlib.util.spec_from_file_location("historical_import", Path(__file__).parents[2] / "scripts/import_historical.py")
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)


def test_import_preserves_record_and_rejects_active_or_future_awards():
    # Invented test input only, never shipped as historical data.
    record = {"ocid": "test-only", "id": "test-only", "compiledRelease": {"tender": {"title": "Solar energy", "status": "complete"}, "awards": [{"date": "2020-01-01T00:00:00Z", "value": {"amount": 1, "currency": "KES"}}]}}
    kwargs = dict(source_url="https://source.example.test/records", publisher="Test publisher", license_url="https://source.example.test/license", retrieved_at="2026-10-09T00:00:00Z", dataset_id="test-only")
    raw = json.dumps({"records": [record]}).encode()
    assert module.build_manifest(raw, **kwargs)["records"] == [record]
    record["compiledRelease"]["tender"]["status"] = "active"
    with pytest.raises(ValueError, match="No completed"):
        module.build_manifest(json.dumps({"records": [record]}).encode(), **kwargs)
    record["compiledRelease"]["tender"]["status"] = "complete"
    record["compiledRelease"]["awards"][0]["date"] = "2030-01-01T00:00:00Z"
    with pytest.raises(ValueError, match="No completed"):
        module.build_manifest(json.dumps({"records": [record]}).encode(), **kwargs)
