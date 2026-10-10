"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ApprovalPanel } from "./approval-panel";
import { authClient } from "@/lib/auth/client";
import { getDrafts } from "@/lib/api";
import {
  createReview,
  getAudit,
  getHealth,
  getTenders,
  saveDraft,
} from "@/lib/api";
import type {
  AuditEvent,
  Citation,
  DraftReceipt,
  Health,
  ReviewResult,
  Tender,
} from "@/lib/types";

const MATERIALS_URL =
  "https://drive.google.com/drive/folders/1Pyq7oBfYci6wDIzKlTdDl-vz_42gOhJH?usp=sharing";

function formatMoney(amount: number | null, currency: string | null): string {
  if (amount === null || amount === undefined) return "Not recorded";
  const code = currency || "KES";
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${code} ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(amount)}`;
  }
}

function formatTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-KE", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function prettyName(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (name === "grid") return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
  if (name === "file") return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></svg>;
  if (name === "search") return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>;
  if (name === "external") return <svg {...common}><path d="M14 3h7v7M10 14 21 3" /><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" /></svg>;
  if (name === "arrow") return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === "clock") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  if (name === "spark") return <svg {...common}><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></svg>;
  if (name === "download") return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></svg>;
  if (name === "menu") return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
}

function CitationCard({ citation }: { citation: Citation }) {
  return (
    <div className="citation-card">
      <div className="citation-mark">{citation.citation_id}</div>
      <div className="citation-copy">
        <span className="citation-title">{citation.label}</span>
        <small className="citation-context">{citation.source_id} · {citation.ocid} · {citation.record_id} · {citation.release_id || "release id unavailable"}</small>
        <code>{citation.json_pointer}</code>
      </div>
      <div className="citation-value">{typeof citation.value === "string" ? citation.value : JSON.stringify(citation.value)}</div>
    </div>
  );
}

function ToolTrail({ events, loading, localPreview }: { events: AuditEvent[]; loading: boolean; localPreview: boolean }) {
  return (
    <div className="trail-card">
      <div className="trail-head">
        <div>
          <div className="section-kicker">TRANSPARENCY LOG</div>
          <h3>Tool-call trail</h3>
        </div>
        <span className="live-tag"><span className="live-dot" /> {localPreview ? "LOCAL JSONL" : "YOUR ACTIVITY"}</span>
      </div>
      <p className="trail-intro">{localPreview ? "Completed MCP calls are written to a local JSONL log; it is not tamper-proof." : "Your completed reviews, MCP calls, model calls, and draft saves are recorded in your private workspace."}</p>
      {loading ? (
        <div className="empty-trail">Loading the audit trail…</div>
      ) : events.length === 0 ? (
        <div className="empty-trail">Run a search or review to create the first trace event.</div>
      ) : (
        <div className="event-list">
          {events.slice(0, 8).map((event) => (
            <details className="event-row" key={event.event_id}>
              <summary>
                <span className={`event-icon ${event.event_type === "model_call" ? "is-model" : ""}`}>
                  <Icon name={event.event_type === "model_call" ? "spark" : "file"} size={15} />
                </span>
                <span className="event-name">
                  <strong>{event.tool || event.model || "Model call"}</strong>
                  <small>{event.server || event.provider || "agent"} · {event.request_id.slice(0, 8)}</small>
                </span>
                <span className="event-time">{formatTime(event.timestamp)}</span>
                <span className="event-chevron">⌄</span>
              </summary>
              <div className="event-details">
                <div className="event-meta">{event.duration_ms ?? "—"} ms · {event.event_type}</div>
                <div className="event-json"><b>Input</b><pre>{JSON.stringify(event.inputs, null, 2)}</pre></div>
                <div className="event-json"><b>Output</b><pre>{JSON.stringify(event.outputs, null, 2)}</pre></div>
                {event.error && <div className="event-error">{event.error}</div>}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home({ localPreview = false }: { localPreview?: boolean }) {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [query, setQuery] = useState("");
  const [selectedRecordKey, setSelectedRecordKey] = useState("");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [draft, setDraft] = useState<DraftReceipt | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<DraftReceipt[]>([]);
  const [draftsError, setDraftsError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const refreshAudit = useCallback(async () => {
    try {
      setAudit(await getAudit());
    } catch {
      // A cold-starting API should not block the rest of the desk.
    }
  }, []);

  useEffect(() => {
    if (localPreview) return;
    let active = true;
    getDrafts().then(items => { if (active) setSavedDrafts(items); })
      .catch(() => { if (active) setDraftsError("Your saved drafts could not be loaded. Please refresh to try again."); });
    return () => { active = false; };
  }, [localPreview]);

  async function signOut() {
    setSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message || "Could not sign out");
      window.location.assign("/login");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign out. Please retry.");
      setSigningOut(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([getTenders(), getHealth(), getAudit()])
      .then(([records, serviceHealth, events]) => {
        if (!active) return;
        setTenders(records);
        setHealth(serviceHealth);
        setAudit(events);
        setSelectedRecordKey(records[0]?.record_key || "");
      })
      .catch((reason: unknown) => {
        if (active) setSearchError(reason instanceof Error ? reason.message : "Could not reach the BeiSawa API.");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filteredTenders = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return tenders;
    return tenders.filter((tender) => `${tender.title} ${tender.source_id} ${tender.ocid} ${tender.record_id}`.toLocaleLowerCase().includes(normalized));
  }, [query, tenders]);

  const syntheticData = health?.data_provenance !== "historical_source_data";
  const selectedTender = tenders.find((item) => item.record_key === selectedRecordKey) || null;
  const completedCalls = audit.filter((event) => event.event_type === "mcp_tool_call").length;
  const surfacedFlags = review?.report.findings.length ?? 0;
  const qwenTagPresent = health?.model.available && health.model.mode === "ollama" && health.model.is_open_weights_model;
  const isTestMode = health?.model.mode === "test_stub";
  const otherOllamaModel = health?.model.mode === "ollama" && !health.model.is_open_weights_model;

  async function runReview() {
    if (!selectedRecordKey) return;
    setReviewing(true);
    setError("");
    setDraft(null);
    try {
      const result = await createReview(selectedRecordKey);
      setReview(result);
      await refreshAudit();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Review could not be completed.");
      await refreshAudit();
    } finally {
      setReviewing(false);
    }
  }

  async function createDraftMemo() {
    if (!review) return;
    setSavingDraft(true);
    setError("");
    try {
      const receipt = await saveDraft(review.report);
      setDraft(receipt);
      if (!localPreview) {
        setSavedDrafts(previous => [receipt, ...previous]);
        setDraftsError("");
      }
      await refreshAudit();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Draft could not be saved.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function refreshHealth() {
    try {
      setHealth(await getHealth());
    } catch {
      setHealth(null);
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#top" aria-label="BeiSawa home" onClick={() => setMobileNavOpen(false)}>
          <BrandLogo inverse />
        </a>
        <div className="nav-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#review" onClick={() => setMobileNavOpen(false)}><Icon name="grid" /> <span>Review desk</span><span className="nav-count">01</span></a>
          <a className="nav-item" href="#records" onClick={() => setMobileNavOpen(false)}><Icon name="search" /> <span>OCDS records</span></a>
          <a className="nav-item" href="#audit" onClick={() => setMobileNavOpen(false)}><Icon name="file" /> <span>Tool-call trail</span><span className="nav-live">●</span></a>
          <a className="nav-item" href="#governance" onClick={() => setMobileNavOpen(false)}><Icon name="shield" /> <span>Governance rules</span></a>
        </nav>
        <div className="sidebar-rule" />
        <div className="nav-label">PROJECT RESOURCES</div>
        <a className="materials-link" href={MATERIALS_URL} target="_blank" rel="noreferrer">
          <span className="materials-icon"><Icon name="file" size={16} /></span>
          <span><strong>BeiSawa materials</strong><small>Challenge files · Google Drive</small></span>
          <Icon name="external" size={14} />
        </a>
        <div className="sidebar-bottom">
          <div className="side-safety-icon"><Icon name="shield" size={18} /></div>
          <div><strong>Human review required</strong><small>Human approval before internal filing</small></div>
        </div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileNavOpen(!mobileNavOpen)}><Icon name="menu" /></button>
          <div className="breadcrumb"><span>BeiSawa</span><i>/</i><strong>Review desk</strong></div>
          <div className="topbar-right">
            {!localPreview && <button className="auth-switch" onClick={signOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button>}
            <span className="data-badge"><span className="data-dot" /> {syntheticData ? "SYNTHETIC DEMO DATA" : "HISTORICAL SOURCE DATA"}</span>
            <button className={`model-status ${qwenTagPresent ? "model-ready" : isTestMode ? "model-preview" : "model-offline"}`} onClick={refreshHealth} title={health?.model.notice || "Checking local model"}>
              <span className="status-dot" />{qwenTagPresent ? "QWEN TAG PRESENT" : isTestMode ? "TEST PREVIEW MODE" : otherOllamaModel ? "CONFIGURED MODEL NOT QWEN" : "QWEN · CHECK STATUS"}
            </button>
          </div>
        </header>

        <div className="page-wrap">
          <section className="hero-section">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> PROCUREMENT GOVERNANCE <span className="eyebrow-dot">·</span> VALUE FOR MONEY</div>
              <h1>Every finding<br /><em>has a receipt.</em></h1>
              <p>BeiSawa reviews Open Contracting Data Standard records, checks value signals and prepares cited notes for a human reviewer. It never makes the procurement decision.</p>
              <div className="hero-actions">
                <a className="button button-dark" href="#review">Open review desk <Icon name="arrow" size={16} /></a>
                <a className="text-link" href="#governance">How the guardrails work <Icon name="arrow" size={15} /></a>
              </div>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
              <div className="visual-core"><span className="core-label">SOURCE</span><strong>OCDS</strong><small>↙ ↘</small></div>
              <div className="visual-node node-top"><span className="node-line" /><Icon name="search" size={16} /><span>check</span></div>
              <div className="visual-node node-right"><span className="node-line" /><Icon name="shield" size={16} /><span>verify</span></div>
              <div className="visual-node node-bottom"><span className="node-line" /><Icon name="file" size={16} /><span>draft</span></div>
              <div className="visual-stamp"><Icon name="check" size={13} /> HUMAN REVIEW REQUIRED</div>
            </div>
          </section>

          <section className="metric-grid" aria-label="Workspace snapshot">
            <div className="metric-card"><div className="metric-top"><span>{syntheticData ? "DEMO RECORDS" : "SOURCE RECORDS"}</span><span className="metric-icon mint"><Icon name="file" size={16} /></span></div><strong>{loading ? "—" : String(tenders.length).padStart(2, "0")}</strong><small>{syntheticData ? "OCDS-shaped · invented data" : "Historical subset · verify publisher and archive"}</small></div>
            <div className="metric-card"><div className="metric-top"><span>REVIEW SIGNALS</span><span className="metric-icon amber"><Icon name="search" size={16} /></span></div><strong>{String(surfacedFlags).padStart(2, "0")}</strong><small>{review ? "In the current review" : "Run a review to surface checks"}</small></div>
            <div className="metric-card"><div className="metric-top"><span>TOOL CALLS LOGGED</span><span className="metric-icon blue"><Icon name="clock" size={16} /></span></div><strong>{String(completedCalls).padStart(2, "0")}</strong><small>Inputs · outputs · timestamps</small></div>
            <div className="metric-card policy-metric"><div className="metric-top"><span>APPROVAL / FILING</span><span className="metric-icon outline"><Icon name="shield" size={16} /></span></div><strong>{localPreview ? "Hosted only" : "Human gate"}</strong><small>{localPreview ? "Local preview cannot approve or file" : "Named officer · exact revision · private filing"}</small></div>
          </section>

          <section className="workspace-section" id="review">
            <div className="section-heading">
              <div><div className="section-kicker">01 / REVIEW WORKSPACE</div><h2>Review a procurement record</h2></div>
              <div className="section-subtitle"><span className="lock-mark">⌑</span> Read-only analysis <span className="bullet">·</span> Draft-only output</div>
            </div>

            <div className="workspace-grid">
              <section className="review-card" id="records">
                <div className="card-title-row">
                  <div className="card-step">01</div>
                  <div><div className="section-kicker">SELECT A RECORD</div><h3>Choose an OCDS record</h3></div>
                  <span className="standard-tag">OCDS</span>
                </div>
                <label className="field-label" htmlFor="record-search">Search by title, OCID, record id or source dataset</label>
                <div className="search-field"><Icon name="search" size={17} /><input id="record-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or OCID" /><span className="search-shortcut">⌕</span></div>
                <label className="field-label select-label" htmlFor="record-select">Source record <span>{filteredTenders.length} AVAILABLE</span></label>
                <select id="record-select" className="record-select" value={selectedRecordKey} onChange={(event) => { setSelectedRecordKey(event.target.value); setReview(null); setDraft(null); }} disabled={!filteredTenders.length}>
                  {filteredTenders.length === 0 && <option value="">No records match this search</option>}
                  {filteredTenders.map((tender) => <option key={tender.record_key} value={tender.record_key}>{tender.title} — {tender.ocid} · {tender.source_id}</option>)}
                </select>
                {selectedTender ? (
                  <div className="selected-record">
                    <div className="record-title-line"><div className="record-file"><Icon name="file" size={18} /></div><div><strong>{selectedTender.title}</strong><small>{selectedTender.record_id} <span>·</span> {selectedTender.ocid}</small><small>Source dataset: {selectedTender.source_id}</small></div></div>
                    <div className="record-data-grid">
                      <div><span>TENDER ESTIMATE</span><strong>{formatMoney(selectedTender.estimated_value, selectedTender.currency)}</strong></div>
                      <div><span>AWARD VALUE</span><strong>{formatMoney(selectedTender.award_value, selectedTender.currency)}</strong></div>
                      <div><span>RECORDED TENDERERS</span><strong>{selectedTender.number_of_tenderers === null ? "Not recorded" : selectedTender.number_of_tenderers}</strong></div>
                    </div>
                    <div className="record-footer"><span className="synthetic-tag"><span /> {selectedTender.provenance === "synthetic_demo_data" ? "Synthetic example" : "Historical source"}</span><span className="method-tag">{selectedTender.procurement_method || "Method not recorded"}</span></div>
                  </div>
                ) : (
                  <div className="selected-record missing-record">{loading ? "Loading source records…" : "No record selected."}</div>
                )}
                {searchError && <div className="inline-error">{searchError}</div>}
                <button className="button button-primary run-button" onClick={runReview} disabled={!selectedRecordKey || reviewing || loading}>
                  {reviewing ? <><span className="spinner" /> Running LangGraph review…</> : <>Run value-for-money review <Icon name="arrow" size={17} /></>}
                </button>
                <div className="review-footnote"><Icon name="shield" size={14} /> Rule checks are deterministic; verify every model note against its citations.</div>
              </section>

              <section className="results-card" aria-live="polite">
                {!review && !reviewing ? (
                  <div className="results-empty">
                    <div className="empty-art"><span className="empty-ring ring-a" /><span className="empty-ring ring-b" /><span className="empty-document"><Icon name="file" size={23} /></span></div>
                    <div className="section-kicker">YOUR REVIEW REPORT</div>
                    <h3>Evidence first.<br /><em>Conclusions later.</em></h3>
                    <p>Choose an OCDS source record and run the review. Every signal will come with a source record and exact JSON Pointer.</p>
                    <div className="empty-steps"><span><i>1</i> Retrieve</span><b>—</b><span><i>2</i> Check</span><b>—</b><span><i>3</i> Cite</span></div>
                  </div>
                ) : reviewing ? (
                  <div className="results-loading">
                    <div className="loading-orbit"><span /><i /><b /></div>
                    <div className="section-kicker">LANGGRAPH IN PROGRESS</div>
                    <h3>Following the evidence trail</h3>
                    <p>Retrieving the OCDS record, reading review guidance and checking the source fields.</p>
                    <div className="loading-steps"><span className="step-done"><Icon name="check" size={13} /> Record</span><span className="step-active"><span className="tiny-spinner" /> Evidence checks</span><span>Qwen note</span></div>
                  </div>
                ) : review ? (
                  <div className="report-view">
                    <div className="report-header">
                      <div><div className="section-kicker">REVIEW REPORT <span className="report-id">{review.review_id.slice(0, 8)}</span></div><h3>{review.report.findings.length ? "Review signals to verify" : "No automated signals"}</h3><p>{review.report.title}</p></div>
                      <span className={`result-badge ${review.report.findings.length ? "signal" : "clear"}`}><span />{review.report.findings.length ? `${review.report.findings.length} SIGNAL${review.report.findings.length === 1 ? "" : "S"}` : "NO SIGNAL"}</span>
                    </div>
                    <div className="model-note">
                      <div className="model-note-icon"><Icon name="spark" size={16} /></div>
                      <div><div className="model-note-top"><strong>{review.model.name}</strong><span>{review.model.used ? "LOCAL OLLAMA MODEL" : "TEST / PREVIEW ONLY"}</span></div><p>{review.model_notes.review_note}</p>
                        <div className="note-citations">{review.model_notes.citation_ids.map((id) => <span key={id}>{id}</span>)}</div>
                      </div>
                    </div>
                    {review.report.findings.length > 0 ? (
                      <div className="finding-list">
                        {review.report.findings.map((finding, index) => (
                          <article className="finding-card" key={finding.finding_id}>
                            <div className="finding-head"><div className="finding-number">0{index + 1}</div><div className="finding-copy"><div className="finding-label"><span className={`severity-dot ${finding.severity}`} /> {prettyName(finding.signal_type)} <span>·</span> {finding.severity} review signal</div><h4>{finding.title}</h4></div></div>
                            <p className="finding-explanation">{finding.explanation}</p>
                            <div className="evidence-block"><div className="evidence-title"><span>OCDS SOURCE EVIDENCE</span><span>{finding.citations.length} CITATION{finding.citations.length === 1 ? "" : "S"}</span></div>{finding.citations.map((citation) => <CitationCard key={citation.citation_id} citation={citation} />)}</div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="no-signals"><div className="no-signal-icon"><Icon name="check" size={17} /></div><div><strong>No rule-based review signal from available fields.</strong><p>This is not an assurance that the procurement is compliant. Review the record and its data coverage.</p></div></div>
                    )}
                    {review.model_notes.questions.length > 0 && <div className="questions-panel"><div className="evidence-title"><span>NEUTRAL QUESTIONS FOR A HUMAN REVIEWER</span><span>{review.model_notes.questions.length}</span></div>{review.model_notes.questions.map((question, index) => <div className="review-question" key={`${index}-${question.text}`}><span>Q{index + 1}</span><p>{question.text}</p><div>{question.citation_ids.map((id) => <b key={id}>{id}</b>)}</div></div>)}</div>}
                    {review.report.limitations.length > 0 && <div className="limitations"><strong>Data limitations</strong>{review.report.limitations.map((item) => <p key={item}><span>!</span>{item}</p>)}</div>}
                    <div className="report-disclaimer"><Icon name="shield" size={14} /> {review.report.disclaimer}</div>
                    <div className="report-actions">
                      <button className="button button-dark save-draft" onClick={createDraftMemo} disabled={savingDraft}>{savingDraft ? <><span className="spinner" /> Saving draft…</> : <>Save a private review draft <Icon name="download" size={16} /></>}</button>
                      <span className="draft-only-note">Nothing is submitted or published.</span>
                    </div>
                    {draft && <div className="draft-receipt"><span className="receipt-check"><Icon name="check" size={15} /></span><div><strong>Draft saved for human review</strong><small>{draft.draft_id} · no approval or filing action taken</small>{!localPreview && <a href={draft.path}>Download draft</a>}</div></div>}
                  </div>
                ) : null}
                {error && <div className="report-error" role="alert"><strong>Could not finish that action</strong><span>{error}</span>{!qwenTagPresent && !isTestMode && <small>Check that Ollama is running and the configured Qwen 2.5 tag is present. The task is configured not to disguise a model outage as a Qwen result.</small>}</div>}
              </section>
            </div>
          </section>

          {!localPreview && <section className="audit-section" id="saved-drafts">
            <div className="section-heading"><div><div className="section-kicker">YOUR WORKSPACE</div><h2>Saved drafts</h2></div></div>
            {draftsError && <p role="alert">{draftsError}</p>}
            {!draftsError && !savedDrafts.length && <p>Your drafts will appear here after you save a review.</p>}
            <ul className="saved-drafts">{savedDrafts.map(item => <li key={item.draft_id}><a href={item.path}>{item.draft_id}</a><span>{item.ocid} · {formatTime(item.created_at)}</span></li>)}</ul>
            <ApprovalPanel drafts={savedDrafts} />
          </section>}
          <section className="audit-section" id="audit">
            <div className="section-heading audit-heading"><div><div className="section-kicker">02 / ACCOUNTABILITY</div><h2>{localPreview ? "A trace for every tool call" : "Your review activity"}</h2></div><div className="audit-count"><span className="live-dot" /> {audit.length} RECENT EVENTS</div></div>
            <ToolTrail events={audit} loading={loading} localPreview={localPreview} />
          </section>

          <section className="governance-section" id="governance">
            <div className="governance-heading"><span className="governance-icon"><Icon name="shield" size={21} /></span><div><div className="section-kicker">03 / GOVERNANCE BY DESIGN</div><h2>No automated procurement decisions.</h2></div></div>
            <div className="governance-grid">
              <div><span className="governance-index">01</span><strong>Cited source fields</strong><p>Configured signals link to the selected source record, source identifiers and exact JSON Pointers.</p></div>
              <div><span className="governance-index">02</span><strong>Draft, never decide</strong><p>There are no award, reject, cancel, publish or external submission tools in the agent.</p></div>
              <div><span className="governance-index">03</span><strong>{localPreview ? "Local activity trail" : "Private review workspace"}</strong><p>{localPreview ? "Completed MCP and model calls are logged locally. The JSONL log is not tamper-proof; drafts require human review." : "Saved drafts and review activity belong to your account. They require human review and are not approved or filed reports."}</p></div>
            </div>
            <div className="governance-bottom"><span>DEMO DATA NOTICE</span><p>{syntheticData ? "All sample procurement records are invented. They must not be treated as real procurement evidence or allegations." : "Historical subset: verify the archived source and publisher. Review signals are not allegations."}</p><a href={MATERIALS_URL} target="_blank" rel="noreferrer">Open BeiSawa materials <Icon name="external" size={13} /></a></div>
          </section>
          <footer className="page-footer"><a href="#top" aria-label="BeiSawa home"><BrandLogo compact /></a><span>Built for governance review <b>·</b> Nairobi, Kenya</span></footer>
        </div>
      </main>
    </div>
  );
}
