import { authConfigured, getAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (!authConfigured()) return Response.json({ error: "Sign-in is not configured" }, { status: 503 });
  try {
    const handlers = getAuth().handler();
    const method = request.method as keyof typeof handlers;
    return await handlers[method](request, context);
  } catch {
    return Response.json({ error: "Sign-in service is unavailable" }, { status: 503 });
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
