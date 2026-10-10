import Link from "next/link";
import { BrandLogo } from "../../brand-logo";
import { authConfigured, getAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export default async function Verified({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  let verified = false;
  if (!error && authConfigured()) {
    try {
      const session = await getAuth().getSession();
      verified = session.data?.user?.emailVerified === true;
    } catch { /* Authentication may be temporarily unavailable; never claim success. */ }
  }
  return <main className="auth-page"><section className="auth-card">
    <Link className="auth-brand" href="/login"><BrandLogo /></Link>
    <h1>{error ? "Your verification link could not be completed" : verified ? "Your email is confirmed" : "Complete your BeiSawa verification"}</h1>
    <p>{error ? "This link may have expired or already been used. Return to sign-in to check your account." : verified ? "Your BeiSawa email address is verified. You can continue to your private review desk." : "Open the latest verification link in your email, then sign in. This page alone does not confirm your email address."}</p>
    <Link href={verified ? "/" : "/login"}>{verified ? "Open your review desk" : "Return to BeiSawa sign-in"}</Link>
  </section></main>;
}
