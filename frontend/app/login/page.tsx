"use client";

import { useState } from "react";
import { BrandLogo } from "../brand-logo";
import { authClient } from "@/lib/auth/client";

export default function Login() {
  const [register, setRegister] = useState(false);
  const [recover, setRecover] = useState(false);
  const [verify, setVerify] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setMessage("");
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email"));
    const password = String(fields.get("password"));
    try {
      if (verify) {
        const result = await authClient.sendVerificationEmail({ email, callbackURL: `${window.location.origin}/account/verified` });
        if (result.error) throw new Error(result.error.message || "Verification request failed");
        setMessage("If this BeiSawa account needs verification, you’ll receive a new verification link. Check your inbox and spam folder.");
        return;
      }
      if (recover) {
        const result = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` });
        if (result.error) throw new Error(result.error.message || "Recovery request failed");
        setMessage("If this email has a BeiSawa account, you’ll receive a link to reset your password. Check your inbox and spam folder.");
        return;
      }
      const result = register
        ? await authClient.signUp.email({ email, password, name: String(fields.get("name")), callbackURL: `${window.location.origin}/account/verified` })
        : await authClient.signIn.email({ email, password, callbackURL: "/" });
      if (result.error) throw new Error(result.error.message || "Sign-in failed");
      const { data } = await authClient.getSession();
      if (data?.user) window.location.assign("/");
      else setMessage("Check your inbox for a BeiSawa verification email. Open its link to confirm your address, then return here to sign in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "BeiSawa sign-in is temporarily unavailable. Please try again.");
    } finally { setPending(false); }
  }
  return <main className="auth-page"><section className="auth-card">
    <a className="auth-brand" href="/demo" aria-label="BeiSawa public demo"><BrandLogo /></a>
    <h1>{verify ? "Confirm your email address" : recover ? "Reset your password" : register ? "Create your reviewer account" : "Sign in to your review desk"}</h1>
    <p>Your review drafts are private to your account. The demo records are synthetic.</p>
    <form onSubmit={submit}>
      {register && <label>Name<input name="name" autoComplete="name" required maxLength={100} /></label>}
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      {!recover && !verify && <label>Password<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={8} maxLength={128} /></label>}
      <button disabled={pending} type="submit">{pending ? "Please wait…" : verify ? "Send verification link" : recover ? "Send reset link" : register ? "Create account" : "Sign in"}</button>
    </form>
    {message && <p role="status">{message}</p>}
    <button className="auth-switch" disabled={pending} onClick={() => { setRegister(recover || verify ? false : !register); setRecover(false); setVerify(false); setMessage(""); }}>{register || recover || verify ? "Back to sign in" : "Create an account"}</button>
    {!register && !recover && !verify && <button className="auth-switch" disabled={pending} onClick={() => { setRecover(true); setMessage(""); }}>Forgot password?</button>}
    {!register && !recover && !verify && <button className="auth-switch" disabled={pending} onClick={() => { setVerify(true); setMessage(""); }}>Resend verification email</button>}
    <p><a href="/demo">View the public recorded Qwen review</a></p>
  </section></main>;
}
