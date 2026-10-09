"use client";
import { useEffect, useState } from "react";
import type { DraftReceipt } from "@/lib/types";

type Status = { content_hash: string | null; approver_name: string | null; decision: string | null; report_id: string | null };
async function read(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Approval request failed");
  return data;
}
export function ApprovalPanel({ drafts }: { drafts: DraftReceipt[] }) {
  const [policy, setPolicy] = useState<{ can_approve: boolean; approver_name: string | null }>();
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/v1/approval-policy", { cache: "no-store" }).then(read),
      Promise.all(drafts.map(async draft => [draft.draft_id, await read(await fetch(`/api/v1/drafts/${draft.draft_id}/status`, { cache: "no-store" }))] as const))])
      .then(([p, rows]) => { if (active) { setPolicy(p); setStatuses(Object.fromEntries(rows)); } })
      .catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [drafts]);
  async function act(id: string, action: "approve" | "reject" | "file") {
    setBusy(true); setError("");
    try {
      await read(await fetch(`/api/v1/drafts/${id}/${action === "file" ? "file" : "decision"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_hash: statuses[id].content_hash, ...(action === "file" ? {} : { decision: action }) }),
      }));
      const status = await read(await fetch(`/api/v1/drafts/${id}/status`, { cache: "no-store" }));
      setStatuses(current => ({ ...current, [id]: status }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Approval request failed"); }
    finally { setBusy(false); }
  }
  return <section aria-label="Human approval and filing">
    <h3>Human approval and filing</h3>
    <p>{policy?.can_approve ? `Approval officer: ${policy.approver_name}` : "Your account has no approval authority. An operator must configure a named officer."}</p>
    <p>Review the downloaded draft before deciding. Decisions bind its exact SHA-256 hash. Filing saves an immutable internal report; it does not submit a procurement decision.</p>
    {error && <p role="alert">{error}</p>}
    {drafts.map(draft => {
      const status = statuses[draft.draft_id];
      return <article key={draft.draft_id} className="draft-receipt"><div>
        <a href={draft.path}>Read {draft.draft_id}</a>
        <p>SHA-256: <code style={{ overflowWrap: "anywhere" }}>{status?.content_hash || "Legacy draft: save a new revision"}</code></p>
        <p>{status?.report_id ? `Filed report ${status.report_id} · approved by ${status.approver_name}` : status?.decision ? `${status.decision} · ${status.approver_name}` : "Paused for human review"}</p>
        {policy?.can_approve && status?.content_hash && !status.decision && <div className="report-actions">
          <button className="button button-dark" disabled={busy} onClick={() => act(draft.draft_id, "approve")}>Approve exact revision</button>
          <button className="button" disabled={busy} onClick={() => act(draft.draft_id, "reject")}>Reject revision</button>
        </div>}
        {policy?.can_approve && status?.decision === "approve" && !status.report_id && <button className="button button-dark" disabled={busy} onClick={() => act(draft.draft_id, "file")}>File approved report</button>}
      </div></article>;
    })}
  </section>;
}
