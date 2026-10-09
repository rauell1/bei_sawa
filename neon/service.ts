import { createHash, randomUUID } from "node:crypto";

type Json = Record<string, any>;
export interface Queries {
  query(text: string, values?: any[]): Promise<{ rows: any[] }>;
}
export interface Database extends Queries {
  connect(): Promise<Queries & { release(): void }>;
}
export interface ObjectStore {
  put(key: string, body: string): Promise<void>;
  get(key: string): Promise<string>;
  delete(key: string): Promise<void>;
  ready(): Promise<void>;
}
export interface Services {
  authenticate(request: Request): Promise<string>;
  approverName?(owner: string): string | undefined;
  db: Database;
  objects: ObjectStore;
  engine(path: string, init?: RequestInit, authorization?: string): Promise<Response>;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
class CommitOutcomeUnknown extends Error {}
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson((value as Json)[key])}`).join(",")}}`;
}
export const contentHash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const json = (body: unknown, status = 200) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});
async function body(request: Request): Promise<Json> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "JSON is required");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1_000_000) { await reader.cancel(); throw new HttpError(413, "Request is too large"); }
    chunks.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new HttpError(400, "Invalid JSON body"); }
}
async function engineJson(services: Services, request: Request, path: string, data?: Json): Promise<Json> {
  const response = await services.engine(path, data ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  } : undefined, request.headers.get("authorization") || undefined);
  if (!response.ok) {
    // Upstream errors may contain local paths or model URLs. Keep them server-side.
    if ([404, 422, 503].includes(response.status)) throw new HttpError(response.status,
      response.status === 422 ? "The report or record failed validation" : response.status === 404 ? "Record not found" : "Review model is unavailable");
    throw new HttpError(502, "Review engine request failed");
  }
  return response.json();
}
function event(tool: string, input: Json, output: unknown): Json {
  return { event_id: randomUUID(), request_id: randomUUID(), timestamp: new Date().toISOString(),
    event_type: "application_call", server: "neon", tool, inputs: input, outputs: output };
}
async function writeEvent(db: Queries, owner: string, value: Json) {
  await db.query("INSERT INTO beisawa_events (event_id, owner_id, event) VALUES ($1, $2, $3::jsonb)",
    [value.event_id, owner, JSON.stringify(value)]);
}
async function writeEngineEvents(db: Queries, owner: string, result: Json) {
  for (const value of result.audit_events || []) {
    if (!value || typeof value.event_id !== "string" || typeof value.request_id !== "string") throw new HttpError(502, "Engine returned an invalid trace");
    await writeEvent(db, owner, value);
  }
}
async function transaction(db: Database, work: (client: Queries) => Promise<void>) {
  const client = await db.connect();
  let committing = false;
  try {
    await client.query("BEGIN");
    await work(client);
    committing = true;
    await client.query("COMMIT");
  } catch (error) {
    if (committing) throw new CommitOutcomeUnknown("Database commit outcome is unknown");
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export function createApi(services: Services) {
  return async function fetch(request: Request): Promise<Response> {
    try {
      const owner = await services.authenticate(request);
      if (!owner || owner.length > 200) throw new HttpError(401, "Sign in required");
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/$/, "");
      if (path === "/api/v1/health" && request.method === "GET") {
        await services.db.query("SELECT 1 FROM beisawa_drafts LIMIT 1");
        await services.objects.ready();
        const result = await engineJson(services, request, path);
        return json({ ...result, persistence: { database: "neon", storage: "neon_private_bucket", auth: "neon" } });
      }
      if (path === "/api/v1/tenders" && request.method === "GET") {
        const q = url.searchParams.get("q") || "";
        const limit = Number(url.searchParams.get("limit") || 20);
        if (q.length > 200 || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new HttpError(422, "Invalid search parameters");
        return json(await engineJson(services, request, `${path}?${new URLSearchParams({ q, limit: String(limit) })}`));
      }
      if (path === "/api/v1/reviews" && request.method === "POST") {
        const data = await body(request);
        if (Object.keys(data).some(key => key !== "record_key") || typeof data.record_key !== "string" || !data.record_key || data.record_key.length > 600) throw new HttpError(422, "A dataset-scoped record_key is required");
        const result = await engineJson(services, request, path, data);
        if (result.record_key !== data.record_key || typeof result.review_id !== "string") throw new HttpError(502, "Engine returned an inconsistent review");
        await transaction(services.db, async client => {
          await client.query("INSERT INTO beisawa_reviews (review_id, owner_id, record_key, result) VALUES ($1, $2, $3, $4::jsonb)",
            [result.review_id, owner, result.record_key, JSON.stringify(result)]);
          await writeEvent(client, owner, event("review", { record_key: result.record_key }, { review_id: result.review_id, trace: result.trace, model: result.model }));
          await writeEngineEvents(client, owner, result);
        });
        return json(result);
      }
      if (path === "/api/v1/drafts" && request.method === "POST") {
        const data = await body(request);
        if (Object.keys(data).some(key => key !== "report") || !data.report || typeof data.report !== "object" || Array.isArray(data.report)) throw new HttpError(422, "A review report is required");
        // The Python/MCP engine re-resolves every citation and recomputes canonical findings.
        const result = await engineJson(services, request, path, { report: data.report });
        if (typeof result.draft_id !== "string" || !/^draft-[a-f0-9]{32}$/.test(result.draft_id) || result.record_key !== data.report.record_key || result.external_action_taken !== false) throw new HttpError(502, "Engine returned an inconsistent draft");
        const key = `drafts/${createHash("sha256").update(owner).digest("hex")}/${result.draft_id}.json`;
        const { audit_events: _audit, ...draftReceipt } = result;
        const hash = contentHash(data.report);
        const checkpoint = await engineJson(services, request, "/internal/approval/prepare", { draft_id: result.draft_id, content_hash: hash });
        if (checkpoint.interrupt?.content_hash !== hash || checkpoint.interrupt?.draft_id !== result.draft_id) throw new HttpError(502, "Approval interrupt does not match draft");
        const receipt = { ...draftReceipt, content_hash: hash, path: `/api/v1/drafts/${result.draft_id}`,
          storage: "neon", message: "Saved privately for your human review. No approval or filing action was taken." };
        await services.objects.put(key, JSON.stringify({ ...receipt, report: data.report, decision: null, human_approver: null }));
        try {
          await transaction(services.db, async client => {
            await client.query("INSERT INTO beisawa_drafts (draft_id, owner_id, record_key, object_key, receipt, content_hash, snapshot, gate_checkpoint) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8::jsonb)",
              [result.draft_id, owner, result.record_key, key, JSON.stringify(receipt), hash, JSON.stringify(data.report), JSON.stringify(checkpoint)]);
            await writeEvent(client, owner, event("save_draft", { record_key: result.record_key }, { draft_id: result.draft_id }));
            await writeEngineEvents(client, owner, result);
          });
        } catch (error) {
          // Best-effort orphan cleanup. A failed persistence step never returns a success receipt.
          // A connection loss during COMMIT might mean the row was committed.
          // Keep its private bytes until reconciliation rather than deleting a referenced object.
          if (!(error instanceof CommitOutcomeUnknown)) await services.objects.delete(key).catch(() => console.error("Orphan draft cleanup failed"));
          throw error;
        }
        return json(receipt);
      }
      if (path === "/api/v1/drafts" && request.method === "GET") {
        const { rows } = await services.db.query("SELECT receipt FROM beisawa_drafts WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 100", [owner]);
        return json({ items: rows.map(row => row.receipt) });
      }
      if (/^\/api\/v1\/drafts\/draft-[a-f0-9]{32}$/.test(path) && request.method === "GET") {
        const id = path.split("/").pop();
        const { rows } = await services.db.query("SELECT object_key FROM beisawa_drafts WHERE draft_id = $1 AND owner_id = $2", [id, owner]);
        if (!rows[0]) throw new HttpError(404, "Draft not found");
        return new Response(await services.objects.get(rows[0].object_key), { headers: {
          "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${id}.json"`, "Cache-Control": "no-store",
        } });
      }
      if (path === "/api/v1/approval-policy" && request.method === "GET") {
        const name = services.approverName?.(owner);
        return json({ can_approve: Boolean(name), approver_name: name || null });
      }
      const gate = path.match(/^\/api\/v1\/drafts\/(draft-[a-f0-9]{32})\/(decision|file|status)$/);
      if (gate) {
        const id = gate[1], action = gate[2];
        if (action === "status" && request.method === "GET") {
          const { rows } = await services.db.query("SELECT d.content_hash, a.approver_name, a.decision, f.report_id FROM beisawa_drafts d LEFT JOIN beisawa_approvals a USING (draft_id) LEFT JOIN beisawa_filed_reports f USING (draft_id) WHERE d.draft_id=$1 AND d.owner_id=$2", [id, owner]);
          if (!rows[0]) throw new HttpError(404, "Draft not found");
          return json(rows[0]);
        }
        if (request.method !== "POST" || action === "status") throw new HttpError(405, "Method not allowed");
        const name = services.approverName?.(owner);
        if (!name) throw new HttpError(403, "Your account is not a configured approval officer");
        const data = await body(request);
        const allowedKeys = action === "decision" ? ["content_hash", "decision"] : ["content_hash"];
        if (Object.keys(data).some(key => !allowedKeys.includes(key)) || !/^[a-f0-9]{64}$/.test(data.content_hash || "") ||
          (action === "decision" && !["approve", "reject"].includes(data.decision))) throw new HttpError(422, "An exact draft hash and valid decision are required");
        let result: Json = {};
        await transaction(services.db, async client => {
          // Serialize decisions and filing, including retries after ambiguous commits.
          const { rows } = await client.query("SELECT * FROM beisawa_drafts WHERE draft_id=$1 AND owner_id=$2 FOR UPDATE", [id, owner]);
          const draft = rows[0];
          if (!draft) throw new HttpError(404, "Draft not found");
          if (!draft.gate_checkpoint || !draft.content_hash || !draft.snapshot || contentHash(draft.snapshot) !== draft.content_hash) throw new HttpError(409, "Draft needs to be saved again before approval");
          if (data.content_hash !== draft.content_hash) throw new HttpError(409, "Draft content hash does not match");
          const approval = (await client.query("SELECT * FROM beisawa_approvals WHERE draft_id=$1", [id])).rows[0];
          if (action === "decision") {
            if (approval) {
              if (approval.decision !== data.decision || approval.approver_id !== owner || approval.content_hash !== draft.content_hash) throw new HttpError(409, "This revision already has an immutable decision");
              result = approval;
              return;
            }
            result = (await client.query("INSERT INTO beisawa_approvals (draft_id, owner_id, content_hash, approver_id, approver_name, decision) VALUES ($1,$2,$3,$2,$4,$5) RETURNING *", [id, owner, draft.content_hash, name, data.decision])).rows[0];
            await writeEvent(client, owner, event("human_decision", { draft_id: id, content_hash: draft.content_hash }, { decision: data.decision, approver_id: owner, approver_name: name }));
          } else {
            if (!approval || approval.decision !== "approve" || approval.content_hash !== draft.content_hash || approval.owner_id !== owner) throw new HttpError(409, "Filing requires matching human approval");
            const existing = (await client.query("SELECT * FROM beisawa_filed_reports WHERE draft_id=$1", [id])).rows[0];
            if (existing) { result = existing; return; }
            const resumed = await engineJson(services, request, "/internal/approval/resume", { checkpoint: draft.gate_checkpoint, approval });
            if (resumed.ready_to_file !== true || resumed.draft_id !== id || resumed.content_hash !== draft.content_hash) throw new HttpError(409, "Human approval workflow did not authorize filing");
            result = (await client.query("INSERT INTO beisawa_filed_reports (report_id, draft_id, owner_id, content_hash, snapshot, approval) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb) RETURNING *", [randomUUID(), id, owner, draft.content_hash, JSON.stringify(draft.snapshot), JSON.stringify(approval)])).rows[0];
            await writeEvent(client, owner, event("file_report", { draft_id: id, content_hash: draft.content_hash }, { report_id: result.report_id, approver_name: approval.approver_name }));
          }
        });
        return json(result);
      }
      if (path === "/api/v1/filed-reports" && request.method === "GET") {
        const { rows } = await services.db.query("SELECT * FROM beisawa_filed_reports WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 100", [owner]);
        return json({ items: rows });
      }
      if (path === "/api/v1/audit" && request.method === "GET") {
        const limit = Number(url.searchParams.get("limit") || 50);
        if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new HttpError(422, "Invalid audit limit");
        const { rows } = await services.db.query("SELECT event FROM beisawa_events WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2", [owner, limit]);
        return json({ events: rows.map(row => row.event), count: rows.length, log_format: "Neon Postgres; owner-scoped application events" });
      }
      throw new HttpError(404, "Route not found");
    } catch (error) {
      if (error instanceof HttpError) return json({ detail: error.message }, error.status);
      console.error("Neon API request failed");
      return json({ detail: "Service unavailable; please retry later" }, 503);
    }
  };
}
