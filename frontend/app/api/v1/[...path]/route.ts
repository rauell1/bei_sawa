import { authConfigured, getAuth, isLocalPreview } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const allowed = /^(health|tenders|reviews|drafts(?:\/draft-[a-f0-9]{32}(?:\/(decision|file|status))?)?|audit|approval-policy|filed-reports)$/;
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const origin = request.headers.get("origin");
  if (request.method === "POST" && origin && origin !== new URL(request.url).origin) {
    return Response.json({ detail: "Cross-origin requests are not allowed" }, { status: 403 });
  }
  const { path } = await context.params;
  const resource = path.join("/");
  if (!allowed.test(resource)) return Response.json({ detail: "Route not found" }, { status: 404 });
  let token: string | undefined;
  if (!isLocalPreview()) {
    if (!authConfigured()) return Response.json({ detail: "Sign-in is not configured" }, { status: 503 });
    try {
      const auth = getAuth();
      const { data: session, error: sessionError } = await auth.getSession();
      if (sessionError) return Response.json({ detail: "Sign-in service is unavailable" }, { status: 503 });
      if (!session?.user) return Response.json({ detail: "Sign in required" }, { status: 401 });
      const { data, error } = await auth.token();
      if (error || !data?.token) return Response.json({ detail: "Session expired; sign in again" }, { status: 401 });
      token = data.token;
    } catch {
      return Response.json({ detail: "Sign-in service is unavailable" }, { status: 503 });
    }
  }
  const baseUrl = isLocalPreview()
    ? process.env.API_INTERNAL_URL || "http://127.0.0.1:8000"
    : process.env.NEON_FUNCTION_API_BASE_URL;
  if (!baseUrl) return Response.json({ detail: "Review API is not configured" }, { status: 503 });
  try {
    const target = new URL(`/api/v1/${resource}`, baseUrl);
    if (!isLocalPreview() && target.protocol !== "https:") throw new Error();
    target.search = new URL(request.url).search;
    const headers = new Headers({ Accept: "application/json" });
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const hasBody = request.method === "POST";
    if (hasBody) headers.set("Content-Type", request.headers.get("Content-Type") || "application/json");
    // Do not forward user-supplied Authorization, cookies, or identity headers.
    const response = await fetch(target, { method: request.method, headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(130_000) });
    const responseHeaders = new Headers({ "Content-Type": response.headers.get("Content-Type") || "application/json", "Cache-Control": "no-store" });
    const attachment = response.headers.get("Content-Disposition");
    if (attachment) responseHeaders.set("Content-Disposition", attachment);
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return Response.json({ detail: "Review API is unavailable" }, { status: 503 });
  }
}
export const GET = handle;
export const POST = handle;
