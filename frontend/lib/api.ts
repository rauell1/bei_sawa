import type { AuditEvent, DraftReceipt, Health, ReviewResult, Tender } from "@/lib/types";

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body.detail === "string" ? body.detail : `Request failed (${response.status})`;
    throw new Error(detail);
  }
  return body as T;
}

export async function getHealth(): Promise<Health> {
  return readJson(await fetch("/api/v1/health", { cache: "no-store" }));
}

export async function getTenders(query = ""): Promise<Tender[]> {
  const params = new URLSearchParams({ q: query, limit: "30" });
  const result = await readJson<{ items: Tender[] }>(
    await fetch(`/api/v1/tenders?${params.toString()}`, { cache: "no-store" }),
  );
  return result.items;
}

export async function createReview(recordKey: string): Promise<ReviewResult> {
  return readJson(
    await fetch("/api/v1/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ record_key: recordKey }),
    }),
  );
}

export async function saveDraft(report: ReviewResult["report"]): Promise<DraftReceipt> {
  return readJson(
    await fetch("/api/v1/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ report }),
    }),
  );
}

export async function getAudit(): Promise<AuditEvent[]> {
  const result = await readJson<{ events: AuditEvent[] }>(
    await fetch("/api/v1/audit?limit=40", { cache: "no-store" }),
  );
  return result.events;
}
