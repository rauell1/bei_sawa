"""Prepare a closed energy/solar subset from an owner-verified OCDS record package.

Never downloads or invents records. Supply the actual downloaded package and its
publisher/licence/source URL. The archive SHA ties the subset to the original bytes.
"""
import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from beisawa.data_conduct import validate_data_conduct


def build_manifest(raw: bytes, *, source_url, publisher, license_url, retrieved_at, dataset_id, personal_data_reviewed=False):
    if not personal_data_reviewed:
        raise ValueError("Review and remove personal data before import; explicit acknowledgement required")
    for url in [source_url, license_url]:
        if urlparse(url).scheme != "https" or not urlparse(url).netloc:
            raise ValueError("Provide public HTTPS source and redistribution licence URLs")
    if not publisher.strip() or not dataset_id.strip():
        raise ValueError("Publisher and stable dataset identity are required")
    retrieved = datetime.fromisoformat(retrieved_at.replace("Z", "+00:00"))
    if retrieved.tzinfo is None:
        raise ValueError("Retrieval date requires a timezone")
    if retrieved > datetime.now(timezone.utc):
        raise ValueError("Retrieval date cannot be in the future")
    package = json.loads(raw)
    if not isinstance(package, dict) or not isinstance(package.get("records"), list):
        raise ValueError("An OCDS record package is required; release packages need source-specific compilation")
    records = []
    keys = set()
    for record in package["records"]:
        release = record.get("compiledRelease")
        if not isinstance(release, dict):
            continue  # Never guess ordering or fabricate a compiled release.
        tender = release.get("tender", {})
        if tender.get("status") != "complete":
            continue
        items = tender.get("items", []) + [i for a in release.get("awards", []) for i in a.get("items", [])]
        text = " ".join([str(tender.get("title", "")), str(tender.get("description", ""))] + [str(i.get("description", "")) for i in items])
        if not re.search(r"\b(solar|photovoltaic|energy|electricity)\b", text, re.I):
            continue
        awards = release.get("awards", [])
        if not awards or not all(a.get("date") and a.get("value", {}).get("currency") == "KES" for a in awards):
            continue
        if any(datetime.fromisoformat(a["date"].replace("Z", "+00:00")) >= retrieved for a in awards):
            continue
        key = (record.get("ocid"), record.get("id"))
        if not all(isinstance(v, str) and v for v in key) or key in keys:
            raise ValueError("Record identifiers must be present and unique")
        keys.add(key); records.append(record)
    if not records:
        raise ValueError("No completed historical energy/solar awards with dated KES values found")
    manifest = {"dataset_id": dataset_id, "provenance": "historical_source_data", "notice": "Historical source subset. Source accuracy and Kenyan publisher identity must be independently verified; review signals are not allegations.",
        "source": {"personal_data_reviewed": True, "url": source_url, "publisher": publisher, "license_url": license_url, "retrieved_at": retrieved_at, "archive_sha256": hashlib.sha256(raw).hexdigest(), "selection": "compiled release; tender complete; dated pre-retrieval awards in KES; energy/solar keyword"}, "records": records}
    validate_data_conduct(manifest)
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path); parser.add_argument("output", type=Path)
    for name in ["source-url", "publisher", "license-url", "retrieved-at", "dataset-id"]:
        parser.add_argument("--"+name, required=True)
    parser.add_argument("--personal-data-reviewed", action="store_true", help="Confirm manual review and removal of personal details (required)")
    args = parser.parse_args()
    manifest = build_manifest(args.input.read_bytes(), source_url=args.source_url, publisher=args.publisher, license_url=args.license_url, retrieved_at=args.retrieved_at, dataset_id=args.dataset_id, personal_data_reviewed=args.personal_data_reviewed)
    # Refuse to overwrite an existing archive/subset accidentally.
    with args.output.open("x", encoding="utf-8") as stream:
        json.dump(manifest, stream, indent=2, ensure_ascii=False)
        stream.write("\n")
    print(f"Saved {len(manifest['records'])} source records with archive SHA {manifest['source']['archive_sha256']}")
