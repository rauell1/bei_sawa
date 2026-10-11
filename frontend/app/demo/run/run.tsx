"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "../../brand-logo";
import { createReview, getAudit, getHealth, getTenders, saveDraft } from "@/lib/api";
import type { AuditEvent, DraftReceipt, Health, ReviewResult, Tender } from "@/lib/types";
export default function LiveRun({ local }: { local: boolean }) {
  const [records, setRecords] = useState<Tender[]>([]);
  const [key, setKey] = useState("");
  const [health, setHealth] = useState<Health>();
  const [review, setReview] = useState<ReviewResult>();
  const [draft, setDraft] = useState<DraftReceipt>();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [failure, setFailure] = useState("");
  useEffect(() => { Promise.all([getTenders(), getHealth()]).then(([items, status]) => { setRecords(items); setKey(items[0]?.record_key || ""); setHealth(status); }).catch(reason => setError(String(reason.message || reason))); }, []);
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => setSeconds((Date.now() - started) / 1000), 200);
    return () => clearInterval(timer);
  }, [busy, started]);
  async function run() {
    const time = Date.now(); setStarted(time); setBusy(true); setError(""); setFailure(""); setReview(undefined); setDraft(undefined); setEvents([]);
    // Aggregate local scratch audit is disabled by the hosted engine. Hosted
    // activity appears after completion, once Neon persists request-scoped logs.
    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try { setEvents((await getAudit()).filter(e => Date.parse(e.timestamp) >= time).reverse()); } catch { /* Main request reports service failure. */ }
      finally { polling = false; }
    };
    const interval = local ? setInterval(() => void poll(), 1200) : undefined;
    try {
      const result = await createReview(key); setReview(result);
      if (result.abstained || result.report.checks.some(check => check.status === "not_assessed")) {
        setFailure("Incomplete evidence: agent abstains; no draft will be submitted for approval.");
      } else setDraft(await saveDraft(result.report));
      await poll();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Review failed."); await poll(); }
    finally { clearInterval(interval); setSeconds((Date.now() - time) / 1000); setBusy(false); }
  }
  async function demonstrateRefusal() {
    if (!review) return;
    setFailure("Testing an altered report…");
    const changed = structuredClone(review.report);
    changed.title += " changed without source";
    try { await saveDraft(changed); setFailure("Unexpected success: altered report was accepted. Investigate before submission."); }
    catch (reason) { setFailure(`Altered report refused: ${reason instanceof Error ? reason.message : "validation error"}`); }
  }
  return <main className="live-run">
    <header><BrandLogo /><div><h1>Live value-for-money review</h1><p>{health?.data_provenance === "synthetic_demo_data" ? "Synthetic invented procurement records" : "Verify source provenance"} · {local ? "Local workflow; production approval not exercised" : "Your authenticated workspace"}</p></div><Link href="/">Review desk</Link></header>
    <section><label htmlFor="live-record">Record</label><select id="live-record" value={key} disabled={busy} onChange={e => { setKey(e.target.value); setReview(undefined); setDraft(undefined); setFailure(""); }}>{records.map(record => <option key={record.record_key} value={record.record_key}>{record.title}</option>)}</select><button id="start-run" className="button button-dark" disabled={busy || !key} onClick={() => void run()}>{busy ? "Qwen is reviewing…" : "Run the agent"}</button><strong aria-live="polite">{seconds.toFixed(1)} seconds · {health?.model.mode || "checking model"}</strong><p>Source records and citations, not bid documents. No award, supplier exclusion or external submission.</p>{error && <p role="alert">{error}</p>}</section>
    <div className="live-run-columns"><section><h2>Actual tool and model calls</h2><p>{local ? "Completed calls appear as the agent runs." : "Private request logs appear after Neon persists the completed review."} Inputs, outputs and timestamps are retained.</p>{!events.length && <p>Waiting for calls…</p>}<ol>{events.map(event => <li key={event.event_id}><strong>{event.server || event.provider} · {event.tool || event.model}</strong><small>{event.timestamp} · {event.duration_ms ?? "—"} ms</small>{event.error && <p>{event.error}</p>}<details><summary>Inputs and outputs</summary><pre>{JSON.stringify({ inputs: event.inputs, outputs: event.outputs }, null, 2)}</pre></details></li>)}</ol></section>
      <section><h2>Cited report and human handover</h2>{review ? <><h3>{review.report.title}</h3>{review.report.findings.map(f => <article key={f.finding_id}><strong>{f.title}</strong><p>{f.explanation}</p>{f.citations.map(c => <p key={c.citation_id}>{c.citation_id}: {String(c.value)} <code>{c.json_pointer}</code></p>)}</article>)}<p>{review.model_notes.review_note}</p><p>{review.model.used ? "Actual model output" : "Explicit test stub: not an open-weights run"} · {review.model.name}</p>{draft && <p id="draft-status"><strong>{draft.status}</strong> · Agent stopped. A named human must approve the exact revision before internal filing.</p>}<button id="test-refusal" className="button" disabled={busy} onClick={() => void demonstrateRefusal()}>Show altered-report refusal</button></> : <p>Select a record and run the agent. Every finding needs a source.</p>}{failure && <p id="refusal-status" role="status">{failure}</p>}<p>No unit-price benchmark, budget reconciliation or invoice assessment is performed. Signals are triage prompts, not findings of wrongdoing.</p></section></div>
  </main>;
}
