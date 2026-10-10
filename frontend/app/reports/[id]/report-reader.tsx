"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getFiledReport } from "@/lib/api";
import type { FiledReport } from "@/lib/types";
import { BrandLogo } from "../../brand-logo";
export default function ReportReader({ id }: { id: string }) {
  const [report, setReport] = useState<FiledReport>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getFiledReport(id).then(value => { if (active) setReport(value); }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Report could not be loaded."); });
    return () => { active = false; };
  }, [id]);
  const snapshot = report?.snapshot;
  return <main className="report-reader">
    <header><BrandLogo /><p>Private internal filed report · Human approval required</p><Link className="no-print" href="/">Return to review desk</Link></header>
    {error && <p role="alert">{error}</p>}
    {!report && !error && <p role="status">Loading your filed report…</p>}
    {report && snapshot && <>
      <div className="report-actions no-print"><button className="button button-dark" onClick={() => window.print()}>Print / save as PDF</button><a className="button" href={`/api/v1/filed-reports/${id}?download=1`}>Download original JSON</a></div>
      <section><h1>{snapshot.title || snapshot.ocid}</h1><p><strong>{snapshot.provenance === "synthetic_demo_data" ? "Synthetic demo data — invented record" : "Source record — verify publisher provenance"}</strong></p>
        <p>{snapshot.result_label}</p><dl><dt>Report ID</dt><dd>{report.report_id}</dd><dt>Filed</dt><dd>{new Date(report.created_at).toLocaleString("en-KE")}</dd><dt>Approval officer</dt><dd>{report.approval.approver_name}</dd><dt>Approved</dt><dd>{new Date(report.approval.created_at).toLocaleString("en-KE")}</dd><dt>Exact content SHA-256</dt><dd><code>{report.content_hash}</code></dd><dt>Source</dt><dd>{snapshot.source_id} · {snapshot.ocid} · {snapshot.record_id}</dd></dl>
      </section>
      <section><h2>Review signals</h2>{snapshot.findings?.length ? snapshot.findings.map(finding => <article key={finding.finding_id}><h3>{finding.title}</h3><p>{finding.explanation}</p><p>Citations: {finding.citations.map(c => c.citation_id).join(", ")}</p></article>) : <p>No configured review signal. This is not assurance of value or compliance.</p>}</section>
      <section><h2>Source citations</h2>{snapshot.citations?.map(c => <article key={c.citation_id}><strong>{c.citation_id} · {c.label}</strong><p><code>{c.json_pointer}</code></p><p>Observed value: {typeof c.value === "object" ? JSON.stringify(c.value) : String(c.value)}</p></article>)}</section>
      <section><h2>Assessment limits</h2><ul>{snapshot.limitations?.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul><p>{snapshot.disclaimer}</p><p>Internal filing records the approved revision. It does not submit a report externally or decide procurement.</p></section>
    </>}
  </main>;
}
