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
