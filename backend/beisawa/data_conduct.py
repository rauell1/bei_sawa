"""Fail closed on historical data until the operator reviews its conduct."""
from datetime import datetime, timezone


def validate_data_conduct(manifest):
    if manifest.get("provenance") == "synthetic_demo_data":
        return  # Operator-authored, explicitly invented fixtures remain allowed.
    source = manifest.get("source", {})
    if manifest.get("provenance") != "historical_source_data" or source.get("personal_data_reviewed") is not True:
        raise ValueError("Historical data requires an explicit personal-data review; use synthetic fixtures otherwise")
    retrieved = datetime.fromisoformat(source["retrieved_at"].replace("Z", "+00:00"))
    if retrieved.tzinfo is None or retrieved > datetime.now(timezone.utc):
        raise ValueError("Historical source retrieval must be dated in the past with a timezone")
    for record in manifest["records"]:
        release = record.get("compiledRelease", {})
        if release.get("tender", {}).get("status") != "complete":
            raise ValueError("Live or unverified tender processes are not allowed")
        awards = release.get("awards", [])
        if not awards:
            raise ValueError("Historical review requires dated awards")
        for award in awards:
            date = datetime.fromisoformat(award.get("date", "").replace("Z", "+00:00"))
            if date.tzinfo is None or date >= retrieved:
                raise ValueError("Historical awards must predate source retrieval")
        # This is a tripwire, not automated proof that arbitrary text is free of PII.
        def inspect(value):
            if isinstance(value, dict):
                if any(key in value for key in ["contactPoint", "person", "personName", "dateOfBirth", "nationalId"]):
                    raise ValueError("Remove personal/contact details before importing procurement records")
                for nested in value.values():
                    inspect(nested)
            elif isinstance(value, list):
                for nested in value:
                    inspect(nested)
        inspect(record)
