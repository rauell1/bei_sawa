import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { createApi, type Database, type ObjectStore, type Services } from "../service";
import { authenticateWith } from "../auth";

const postgres = new PGlite();
const db: Database = {
  query: (sql, values) => postgres.query(sql, values),
  async connect() { return { query: db.query, release() {} }; },
};
const objects = new Map<string, string>();
let failUpload = false;
const storage: ObjectStore = {
  async put(key, value) { if (failUpload) throw new Error("Storage down"); objects.set(key, value); },
  async get(key) { const value = objects.get(key); if (!value) throw new Error("Missing object"); return value; },
  async delete(key) { objects.delete(key); },
  async ready() {},
};
const issuer = "https://auth.example.test";
const keys = await generateKeyPair("EdDSA", { extractable: true });
const publicKey = { ...await exportJWK(keys.publicKey), kid: "test-key" };
const authenticate = authenticateWith(createLocalJWKSet({ keys: [publicKey] }), issuer);
async function token(owner = "reviewer-a", options: { expired?: boolean; issuer?: string; anonymous?: boolean } = {}) {
  return new SignJWT(options.anonymous ? { role: "anonymous" } : {}).setProtectedHeader({ alg: "EdDSA", kid: "test-key" })
    .setSubject(owner).setIssuer(options.issuer || issuer).setIssuedAt().setExpirationTime(options.expired ? "0s" : "5m").sign(keys.privateKey);
}
const report = { record_key: "synthetic/ocid/record", ocid: "synthetic-ocid", record_id: "record", source_id: "synthetic", findings: [] };
let sequence = 0;
let engineCalls = 0;
const engine: Services["engine"] = async (path, init) => {
  engineCalls++;
  const data = init?.body ? JSON.parse(String(init.body)) : {};
  if (path === "/internal/approval/prepare") return Response.json({ interrupt: { draft_id: data.draft_id, content_hash: data.content_hash }, checkpoint: { draft_id: data.draft_id } });
  if (path === "/internal/approval/resume") return Response.json({ ready_to_file: true, draft_id: data.checkpoint.checkpoint.draft_id, content_hash: data.approval.content_hash });
  if (path === "/api/v1/reviews") return Response.json({ review_id: `review-${++sequence}`, record_key: data.record_key, report, trace: [], model: { provider: "stub" } });
  if (path === "/api/v1/drafts") {
    if (data.report.record_key !== report.record_key || data.report.findings.length) return Response.json({ detail: "Invalid report" }, { status: 422 });
    return Response.json({ draft_id: `draft-${(++sequence).toString(16).padStart(32, "0")}`, ...report, status: "draft_requires_human_review", created_at: new Date().toISOString(), external_action_taken: false });
  }
  if (path === "/api/v1/health") return Response.json({ status: "ok", model: { mode: "test_stub" } });
  return Response.json({ items: [report] });
};
const api = createApi({ db, objects: storage, authenticate, engine });
async function request(path: string, options: { owner?: string; body?: unknown; bearer?: string; headers?: Record<string, string> } = {}) {
  const bearer = options.bearer ?? await token(options.owner);
  return api(new Request(`https://api.example.test/api/v1/${path}`, {
    method: options.body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  }));
}
before(async () => { await postgres.exec(await readFile(new URL("../schema.sql", import.meta.url), "utf8")); });
after(async () => { await postgres.close(); });

test("schema migration can be repeated without discarding rows", async () => {
  await postgres.exec(await readFile(new URL("../schema.sql", import.meta.url), "utf8"));
  assert.equal((await request("health")).status, 200);
});
test("missing, forged, expired, wrong-issuer and anonymous tokens cannot call the engine", async () => {
  const initial = engineCalls;
  assert.equal((await api(new Request("https://api.example.test/api/v1/tenders"))).status, 401);
  for (const bearer of ["forged", await token("reviewer-a", { expired: true }), await token("reviewer-a", { issuer: "https://attacker.test" }), await token("anon-user", { anonymous: true })]) {
    assert.equal((await request("tenders", { bearer })).status, 401);
  }
  assert.equal(engineCalls, initial);
});
test("client-supplied identity cannot change the database owner", async () => {
  assert.equal((await request("reviews", { body: { record_key: report.record_key }, headers: { "x-user-id": "reviewer-b" } })).status, 200);
  const { rows } = await db.query("SELECT owner_id FROM beisawa_reviews");
  assert.equal(rows[0].owner_id, "reviewer-a");
});
test("draft upload persists private bytes and can be listed/downloaded after rebuilding the handler", async () => {
  const saved = await request("drafts", { body: { report } });
  assert.equal(saved.status, 200);
  const receipt = await saved.json();
  assert.equal(receipt.storage, "neon");
  assert.equal(receipt.external_action_taken, false);
  const restarted = createApi({ db, objects: storage, authenticate, engine });
  const auth = { Authorization: `Bearer ${await token()}` };
  const listing = await restarted(new Request("https://api.example.test/api/v1/drafts", { headers: auth }));
  assert.equal((await listing.json()).items[0].draft_id, receipt.draft_id);
  const downloaded = await restarted(new Request(`https://api.example.test${receipt.path}`, { headers: auth }));
  assert.equal(downloaded.status, 200);
  assert.match(downloaded.headers.get("Content-Disposition")!, /attachment/);
  assert.deepEqual((await downloaded.json()).report, report);
});
test("a second reviewer cannot list or download another user's draft or audit", async () => {
  const saved = await request("drafts", { body: { report } });
  const receipt = await saved.json();
  assert.deepEqual((await (await request("drafts", { owner: "reviewer-b" })).json()).items, []);
  assert.equal((await request(`drafts/${receipt.draft_id}`, { owner: "reviewer-b" })).status, 404);
  assert.deepEqual((await (await request("audit", { owner: "reviewer-b" })).json()).events, []);
  assert.ok((await (await request("audit")).json()).events.length > 0);
});
test("altered report is rejected before upload", async () => {
  const count = objects.size;
  assert.equal((await request("drafts", { body: { report: { ...report, findings: [{ forged: true }] } } })).status, 422);
  assert.equal(objects.size, count);
});
test("storage failure is not acknowledged or inserted into Postgres", async () => {
  const before = (await db.query("SELECT * FROM beisawa_drafts")).rows.length;
  failUpload = true;
  try { assert.equal((await request("drafts", { body: { report } })).status, 503); }
  finally { failUpload = false; }
  assert.equal((await db.query("SELECT * FROM beisawa_drafts")).rows.length, before);
});
test("database failure rolls back metadata and removes the orphan object", async () => {
  const before = objects.size;
  const failingDb: Database = { query: db.query, async connect() {
    return { release() {}, async query(sql, values) {
      if (sql.startsWith("INSERT INTO beisawa_events")) throw new Error("Database down");
      return db.query(sql, values);
    } };
  } };
  const failing = createApi({ db: failingDb, objects: storage, authenticate, engine });
  const response = await failing(new Request("https://api.example.test/api/v1/drafts", {
    method: "POST", headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" }, body: JSON.stringify({ report }),
  }));
  assert.equal(response.status, 503);
  assert.equal(objects.size, before);
});
test("unknown commit outcome never deletes an object that may already have committed metadata", async () => {
  const before = objects.size;
  const uncertainDb: Database = { query: db.query, async connect() {
    return { release() {}, async query(sql, values) {
      const result = await db.query(sql, values);
      if (sql === "COMMIT") throw new Error("Connection lost after commit");
      return result;
    } };
  } };
  const uncertain = createApi({ db: uncertainDb, objects: storage, authenticate, engine });
  const response = await uncertain(new Request("https://api.example.test/api/v1/drafts", {
    method: "POST", headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" }, body: JSON.stringify({ report }),
  }));
  assert.equal(response.status, 503);
  assert.equal(objects.size, before + 1);
  const { rows } = await db.query("SELECT object_key FROM beisawa_drafts");
  assert.ok(rows.every(row => objects.has(row.object_key)));
});
test("invalid limits and unsupported routes fail without forwarding arbitrary paths", async () => {
  assert.equal((await request("audit?limit=999999")).status, 422);
  assert.equal((await request("tenders?limit=NaN")).status, 422);
  assert.equal((await request("admin/delete")).status, 404);
});

const officerApi = createApi({ db, objects: storage, authenticate, engine,
  approverName: owner => owner === "reviewer-a" ? "Test Approval Officer" : undefined });
async function officerRequest(path: string, data: unknown, owner = "reviewer-a") {
  return officerApi(new Request(`https://api.example.test/api/v1/${path}`, { method: "POST",
    headers: { Authorization: `Bearer ${await token(owner)}`, "Content-Type": "application/json" }, body: JSON.stringify(data) }));
}
test("filing refuses unapproved, wrong hash, spoofed identity, rejected and cross-owner drafts", async () => {
  const draft = await (await request("drafts", { body: { report } })).json();
  const prefix = `drafts/${draft.draft_id}`;
  assert.equal((await officerRequest(`${prefix}/file`, { content_hash: draft.content_hash })).status, 409);
  assert.equal((await officerRequest(`${prefix}/decision`, { content_hash: "f".repeat(64), decision: "approve" })).status, 409);
  assert.equal((await officerRequest(`${prefix}/decision`, { content_hash: draft.content_hash, decision: "approve", approver_name: "Forged officer" })).status, 422);
  assert.equal((await officerRequest(`${prefix}/decision`, { content_hash: draft.content_hash, decision: "approve" }, "reviewer-b")).status, 403);
  assert.equal((await officerRequest(`${prefix}/decision`, { content_hash: draft.content_hash, decision: "reject" })).status, 200);
  assert.equal((await officerRequest(`${prefix}/decision`, { content_hash: draft.content_hash, decision: "approve" })).status, 409);
  assert.equal((await officerRequest(`${prefix}/file`, { content_hash: draft.content_hash })).status, 409);
});
test("approval and filing survive handler restart and retries create one immutable filed snapshot", async () => {
  const draft = await (await request("drafts", { body: { report } })).json();
  const prefix = `drafts/${draft.draft_id}`;
  const data = { content_hash: draft.content_hash, decision: "approve" };
  const first = await (await officerRequest(`${prefix}/decision`, data)).json();
  assert.equal(first.approver_id, "reviewer-a");
  assert.equal(first.approver_name, "Test Approval Officer");
  assert.deepEqual(await (await officerRequest(`${prefix}/decision`, data)).json(), first);
  const filed = await (await officerRequest(`${prefix}/file`, { content_hash: draft.content_hash })).json();
  const restarted = createApi({ db, objects: storage, authenticate, engine, approverName: () => "Test Approval Officer" });
  const retry = await restarted(new Request(`https://api.example.test/api/v1/${prefix}/file`, { method: "POST", headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" }, body: JSON.stringify({ content_hash: draft.content_hash }) }));
  assert.deepEqual(await retry.json(), filed);
  assert.deepEqual(filed.snapshot, report);
  assert.equal((await db.query("SELECT * FROM beisawa_filed_reports WHERE draft_id=$1", [draft.draft_id])).rows.length, 1);
  assert.equal((await request("filed-reports", { owner: "reviewer-b" })).status, 200);
  assert.deepEqual((await (await request("filed-reports", { owner: "reviewer-b" })).json()).items, []);
});
test("tampering with a stored snapshot prevents approval", async () => {
  const draft = await (await request("drafts", { body: { report } })).json();
  await db.query("UPDATE beisawa_drafts SET snapshot=$1::jsonb WHERE draft_id=$2", [JSON.stringify({ ...report, findings: ["tampered"] }), draft.draft_id]);
  assert.equal((await officerRequest(`drafts/${draft.draft_id}/decision`, { content_hash: draft.content_hash, decision: "approve" })).status, 409);
});

test("filed report detail and download are owner-scoped and reject changed snapshots", async () => {
  const draft = await (await request("drafts", { body: { report } })).json();
  await officerRequest(`drafts/${draft.draft_id}/decision`, { content_hash: draft.content_hash, decision: "approve" });
  const filed = await (await officerRequest(`drafts/${draft.draft_id}/file`, { content_hash: draft.content_hash })).json();
  const endpoint = `filed-reports/${filed.report_id}`;
  const detail = await request(endpoint);
  assert.equal(detail.status, 200);
  assert.deepEqual((await detail.json()).snapshot, report);
  assert.equal((await request(endpoint, { owner: "reviewer-b" })).status, 404);
  assert.equal((await request(endpoint + "?download=1", { owner: "reviewer-b" })).status, 404);
  const download = await request(endpoint + "?download=1");
  assert.match(download.headers.get("Content-Disposition")!, /beisawa-report-/);
  assert.equal(download.headers.get("Cache-Control"), "no-store");
  assert.equal((await download.json()).content_hash, filed.content_hash);
  await db.query("UPDATE beisawa_filed_reports SET snapshot=$1::jsonb WHERE report_id=$2", [JSON.stringify({ ...report, title: "altered" }), filed.report_id]);
  assert.equal((await request(endpoint)).status, 409);
  assert.equal((await request(endpoint + "?download=1")).status, 409);
});
