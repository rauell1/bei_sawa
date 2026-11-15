import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

let auth: ReturnType<typeof createNeonAuth> | undefined;
function onHostedPlatform() {
  const onCloudflareWorkers =
    typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
  return Boolean(process.env.VERCEL) || onCloudflareWorkers;
}
export function isLocalPreview() {
  // A hosted deployment (Vercel or Cloudflare Workers) must never bypass authentication.
  return process.env.BEISAWA_DEPLOYMENT_MODE === "local" && !onHostedPlatform();
}
export function authConfigured() {
  return Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);
}
export function getAuth() {
  if (!authConfigured()) throw new Error("Neon authentication is not configured");
  auth ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });
  return auth;
}
