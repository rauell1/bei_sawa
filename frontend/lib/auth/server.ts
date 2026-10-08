import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

let auth: ReturnType<typeof createNeonAuth> | undefined;
export function isLocalPreview() {
  // A production Vercel deployment must never bypass authentication.
  return process.env.BEISAWA_DEPLOYMENT_MODE === "local" && !process.env.VERCEL;
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
