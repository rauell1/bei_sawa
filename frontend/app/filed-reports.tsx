"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getFiledReports } from "@/lib/api";
import type { DraftReceipt, FiledReport } from "@/lib/types";
export function FiledReports({ drafts }: { drafts: DraftReceipt[] }) {
  const [reports, setReports] = useState<FiledReport[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setReports(await getFiledReports()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Filed reports could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh, drafts]);
  useEffect(() => {
    const reload = () => { void refresh(); };
    window.addEventListener("beisawa:report-filed", reload);
    return () => window.removeEventListener("beisawa:report-filed", reload);
  }, [refresh]);
  return <section className="filed-workspace" aria-labelledby="filed-heading">
    <div className="section-kicker">YOUR WORKSPACE</div><h2 id="filed-heading">Filed reports</h2>
    <p>Private internal reports approved against an exact revision. These are not submissions to a procurement authority.</p>
    <button className="button" disabled={loading} onClick={() => void refresh()}>{loading ? "Loading reports…" : "Refresh reports"}</button>
    {error && <p role="alert">{error}</p>}
    {!loading && !error && reports.length === 0 && <p>No reports have been filed in your workspace yet.</p>}
    <ul className="saved-drafts">{reports.map(report => <li key={report.report_id}>
      <div><Link href={`/reports/${report.report_id}`}><strong>{report.snapshot.title || report.snapshot.ocid}</strong></Link>
        <p>Approved by {report.approval.approver_name} · {new Date(report.created_at).toLocaleString("en-KE")}</p>
        <span>{report.report_id}</span></div>
      <Link className="button" href={`/reports/${report.report_id}`}>Read and export</Link>
    </li>)}</ul>
  </section>;
}
