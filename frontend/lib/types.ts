export type Tender = {
  record_key: string;
  source_id: string;
  ocid: string;
  record_id: string;
  title: string;
  status: string;
  procurement_method: string | null;
  number_of_tenderers: number | null;
  estimated_value: number | null;
  award_value: number | null;
  currency: string | null;
  provenance: string;
};

export type Citation = {
  citation_id: string;
  source_id: string;
  record_key: string;
  ocid: string;
  record_id: string;
  release_id: string | null;
  json_pointer: string;
  label: string;
  value: unknown;
};

export type Finding = {
  finding_id: string;
  source_id: string;
  record_key: string;
  signal_type: string;
  severity: "low" | "medium" | "high" | string;
  title: string;
  explanation: string;
  status: string;
  record_id: string;
  ocid: string;
  citations: Citation[];
};

export type ReviewReport = {
  source_id: string;
  record_key: string;
  ocid: string;
  record_id: string;
  title: string;
  record_date: string | null;
  provenance: string;
  result_label: string;
  findings: Finding[];
  limitations: string[];
  checks: { check: string; status: string }[];
  citations: Citation[];
  disclaimer: string;
};

export type ModelNotes = {
  review_note: string;
  citation_ids: string[];
  questions: { text: string; citation_ids: string[] }[];
  provider: string;
  model: string;
  used: boolean;
  notice: string;
};

export type ReviewResult = {
  review_id: string;
  record_key: string;
  ocid: string;
  source_record: { source_id: string; record_key: string; record: Record<string, unknown> };
  report: ReviewReport;
  model: { provider: string; name: string; used: boolean; notice: string };
  model_notes: ModelNotes;
  trace: { step: string; server: string; tool: string }[];
};

export type Health = {
  status: string;
  service: string;
  data_provenance: string;
  mcp_servers: Record<string, string>;
  model: {
    mode: string;
    model: string;
    available: boolean;
    is_open_weights_model: boolean;
    notice: string;
  };
  policy: string;
};

export type AuditEvent = {
  event_id: string;
  event_type: string;
  timestamp: string;
  started_at?: string;
  duration_ms?: number | null;
  request_id: string;
  server?: string;
  tool?: string;
  provider?: string;
  model?: string;
  inputs: unknown;
  outputs: unknown;
  error?: string | null;
};

export type DraftReceipt = {
  draft_id: string;
  source_id: string;
  record_key: string;
  ocid: string;
  record_id: string;
  status: string;
  path: string;
  created_at: string;
  external_action_taken: boolean;
  message: string;
};
