import Link from "next/link";
import evidence from "../../public/evidence/qwen-2026-10-09.json";
import styles from "./page.module.css";

export const metadata = { title: "Recorded Qwen review · BeiSawa" };

export default function Demo() {
  const run = evidence.review;
  return <main className={styles.page}>
    <header><div className="section-kicker">BEISAWA · RECORDED MODEL RUN</div>
      <h1>A cited review, with its tool choices</h1>
      <p>This is a recording of a genuine local Qwen run on an invented clinic-roofing record. It is public and requires no account.</p>
      <p><strong>Synthetic data · 9 October 2026 · recorded playback</strong></p>
      <p>Production approval and filing were not exercised. This single run does not measure accuracy on real tenders.</p>
      <nav><Link href="/login">Open the private review desk</Link><a href="/evidence/qwen-2026-10-09.json" download>Download the complete run and audit</a></nav>
      <p><a href="/evidence/qwen-walkthrough.mp4">Watch the 35-second recorded-run walkthrough</a>. This video browses the evidence below; it is not a recording of live inference or production approval.</p>
    </header>
    <section><h2>Run evidence</h2>
      <dl><dt>Model</dt><dd>{evidence.model_tag} · Ollama {evidence.weight_provenance.ollama_version}</dd>
        <dt>Started (UTC)</dt><dd>{evidence.recorded_at}</dd>
        <dt>Elapsed</dt><dd>{evidence.timings_seconds.review} seconds for review; {evidence.timings_seconds.draft} seconds for draft save</dd>
        <dt>Hardware</dt><dd>{evidence.hardware.architecture}; {evidence.hardware.visible_cpu_count} visible CPUs</dd>
        <dt>Imported manifest digest</dt><dd><code>{evidence.model_digest}</code></dd>
        <dt>Weight SHA-256</dt><dd><code>{evidence.weight_provenance.gguf_sha256}</code></dd>
      </dl>
      <p>{evidence.weight_provenance.import} Weights use the {evidence.weight_provenance.licence}.</p>
    </section>
    <section><h2>Choices made by Qwen</h2><p>The server exposes tools whose prerequisites are satisfied, scopes their arguments to this record, and limits the loop to eight choices.</p>
      <ol>{run.trace.map((step, index) => <li key={index}><strong>{step.tool}</strong><p>{step.reason}</p></li>)}</ol>
    </section>
    <section><h2>{run.report.title}</h2><p>{run.report.result_label}</p>
      {run.report.findings.map(finding => <article key={finding.finding_id}><h3>{finding.title}</h3><p>{finding.explanation}</p>
        <ul>{finding.citations.map(citation => <li key={citation.citation_id}><strong>{citation.citation_id}</strong>: {citation.label} = {String(citation.value)} <code>{citation.json_pointer}</code></li>)}</ul>
      </article>)}
      <h3>Qwen's review note</h3><p>{run.model_notes.review_note}</p>
      <p>Citations: {run.model_notes.citation_ids.join(", ")}</p>
      <h3>Questions for human review</h3><ul>{run.model_notes.questions.map((question, index) => <li key={index}>{question.text} ({question.citation_ids.join(", ")})</li>)}</ul>
      <p>{run.report.disclaimer}</p>
    </section>
    <section><h2>Draft saved; awaiting human review</h2><p>Status: <code>{evidence.draft.status}</code>. Saving a draft does not approve it or file a report.</p>
      <p>The separate Neon workflow binds a named officer's approval to the immutable content hash. Its production path remains unverified.</p>
    </section>
  </main>;
}
