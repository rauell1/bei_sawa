import importlib.util
import json
from pathlib import Path
import pytest

spec = importlib.util.spec_from_file_location("historical_import", Path(__file__).parents[2] / "scripts/import_historical.py")
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)


def test_import_preserves_record_and_rejects_active_or_future_awards():
    # Invented test input only, never shipped as historical data.
    record = {"ocid": "test-only", "id": "test-only", "compiledRelease": {"tender": {"title": "Solar energy", "status": "complete"}, "awards": [{"date": "2020-01-01T00:00:00Z", "value": {"amount": 1, "currency": "KES"}}]}}
    kwargs = dict(source_url="https://source.example.test/records", publisher="Test publisher", license_url="https://source.example.test/license", retrieved_at="2026-10-09T00:00:00Z", dataset_id="test-only", personal_data_reviewed=True)
    raw = json.dumps({"records": [record]}).encode()
    assert module.build_manifest(raw, **kwargs)["records"] == [record]
    record["compiledRelease"]["tender"]["status"] = "active"
    with pytest.raises(ValueError, match="No completed"):
        module.build_manifest(json.dumps({"records": [record]}).encode(), **kwargs)
    record["compiledRelease"]["tender"]["status"] = "complete"
    record["compiledRelease"]["awards"][0]["date"] = "2030-01-01T00:00:00Z"
    with pytest.raises(ValueError, match="No completed"):
        module.build_manifest(json.dumps({"records": [record]}).encode(), **kwargs)


def test_historical_load_and_import_refuse_unreviewed_active_or_personal_data(tmp_path):
    from beisawa.data import load_dataset, clear_record_cache
    record = {"ocid": "test", "id": "test", "compiledRelease": {"tender": {"title": "Solar", "status": "complete"}, "awards": [{"date": "2020-01-01T00:00:00Z", "value": {"currency": "KES"}}]}}
    kwargs = dict(source_url="https://example.test/data", publisher="Test", license_url="https://example.test/license", retrieved_at="2026-01-01T00:00:00Z", dataset_id="test")
    raw = json.dumps({"records": [record]}).encode()
    with pytest.raises(ValueError, match="personal data"):
        module.build_manifest(raw, **kwargs)
    manifest = module.build_manifest(raw, personal_data_reviewed=True, **kwargs)
    path = tmp_path / "source.json"
    def load(value):
        clear_record_cache(); path.write_text(json.dumps(value)); return load_dataset(str(path))
    assert load(manifest)["records"] == [record]
    manifest["source"]["personal_data_reviewed"] = False
    with pytest.raises(ValueError, match="personal-data review"):
        load(manifest)
    manifest["source"]["personal_data_reviewed"] = True
    manifest["records"][0]["compiledRelease"]["tender"]["status"] = "active"
    with pytest.raises(ValueError, match="Live"):
        load(manifest)
    record["compiledRelease"]["tender"]["status"] = "complete"
    record["contactPoint"] = {"name": "Private person"}
    with pytest.raises(ValueError, match="personal/contact"):
        module.build_manifest(json.dumps({"records": [record]}).encode(), personal_data_reviewed=True, **kwargs)
    clear_record_cache()
