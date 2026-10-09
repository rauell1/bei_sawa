import pg from "pg";
import { createRemoteJWKSet } from "jose";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { attachDatabasePool } from "@neon/functions";
import { createApi, type Services } from "./service";
import { authenticateWith } from "./auth";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
let handler: ReturnType<typeof createApi> | undefined;
function buildServices(): Services {
  const jwks = createRemoteJWKSet(new URL(required("NEON_AUTH_JWKS_URL")));
  const issuer = new URL(required("NEON_AUTH_BASE_URL")).origin;
  const db = new pg.Pool({ connectionString: required("DATABASE_URL"), max: 5, connectionTimeoutMillis: 10_000 });
  attachDatabasePool(db);
  const s3 = new S3Client({ forcePathStyle: true, endpoint: required("AWS_ENDPOINT_URL_S3"), region: required("AWS_REGION") });
  const bucket = "beisawa-drafts";
  const engineUrl = new URL(required("BEISAWA_ENGINE_URL"));
  if (engineUrl.protocol !== "https:") throw new Error("BEISAWA_ENGINE_URL must use HTTPS");
  return {
    db,
    // Operator-maintained subject -> officer name registry; never read from requests.
    approverName(owner) {
      const officers = JSON.parse(process.env.BEISAWA_APPROVERS || "{}");
      const name = Object.hasOwn(officers, owner) ? officers[owner] : undefined;
      return typeof name === "string" && name.trim() && name.length <= 200 ? name.trim() : undefined;
    },
    authenticate: authenticateWith(jwks, issuer),
    objects: {
      async put(key, body) { await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "application/json", CacheControl: "private, no-store" })); },
      async get(key) {
        const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (!response.Body) throw new Error("Missing stored draft");
        return response.Body.transformToString();
      },
      async delete(key) { await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); },
      async ready() { await s3.send(new HeadBucketCommand({ Bucket: bucket })); },
    },
    engine(path, init, authorization) {
      return fetch(new URL(path, engineUrl), { ...init, redirect: "error", signal: AbortSignal.timeout(240_000), headers: { ...init?.headers, Authorization: authorization || "" } });
    },
  };
}
export default {
  async fetch(request: Request): Promise<Response> {
    try {
      handler ??= createApi(buildServices());
      return await handler(request);
    } catch {
      console.error("Neon API configuration is incomplete");
      return Response.json({ detail: "Service is not configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  },
};
