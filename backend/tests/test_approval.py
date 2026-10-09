import json
import pytest
from beisawa.approval import prepare_gate, resume_gate


def test_gate_interrupt_is_portable_and_only_resumes_for_matching_human():
    saved = json.loads(json.dumps(prepare_gate("draft-id", "a" * 64, "officer-id")))
    assert saved["interrupt"]["content_hash"] == "a" * 64
    assert saved["checkpoint"]["channel_values"].get("ready_to_file") is None
    approval = dict(content_hash="a" * 64, approver_id="officer-id", approver_name="Test Officer", decision="approve")
    assert resume_gate(saved, approval, "officer-id")["ready_to_file"] is True
    for bad in [{**approval, "decision": "reject"}, {**approval, "content_hash": "b" * 64}, {**approval, "approver_id": "someone-else"}, {**approval, "approver_name": ""}]:
        with pytest.raises(ValueError):
            resume_gate(saved, bad, "officer-id")
    with pytest.raises(ValueError):
        resume_gate(saved, approval, "other-owner")


def test_unknown_workflow_revision_cannot_be_resumed():
    saved = prepare_gate("draft-id", "a" * 64, "officer-id")
    saved["workflow_version"] = 2
    with pytest.raises(ValueError, match="Unsupported"):
        resume_gate(saved, {}, "officer-id")
