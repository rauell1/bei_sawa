"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export default function Login() {
  const [register, setRegister] = useState(false);
  const [recover, setRecover] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setMessage("");
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email"));
    const password = String(fields.get("password"));
    try {
      if (recover) {
        const result = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` });
        if (result.error) throw new Error(result.error.message || "Recovery request failed");
        setMessage("If an account exists for this email, a password reset link will be sent.");
        return;
      }
      const result = register
        ? await authClient.signUp.email({ email, password, name: String(fields.get("name")), callbackURL: "/" })
        : await authClient.signIn.email({ email, password, callbackURL: "/" });
      if (result.error) throw new Error(result.error.message || "Sign-in failed");
      const { data } = await authClient.getSession();
      if (data?.user) window.location.assign("/");
      else setMessage("Check your email to verify your account, then sign in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in service is unavailable");
    } finally { setPending(false); }
  }
  return <main className="auth-page"><section className="auth-card">
    <div className="section-kicker">BEISAWA · FAIR PRICE, WITH EVIDENCE</div>
    <h1>{recover ? "Reset your password" : register ? "Create your reviewer account" : "Sign in to your review desk"}</h1>
    <p>Your review drafts are private to your account. The demo records are synthetic.</p>
    <form onSubmit={submit}>
      {register && <label>Name<input name="name" autoComplete="name" required maxLength={100} /></label>}
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      {!recover && <label>Password<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={8} maxLength={128} /></label>}
      <button disabled={pending} type="submit">{pending ? "Please wait…" : recover ? "Send reset link" : register ? "Create account" : "Sign in"}</button>
    </form>
    {message && <p role="status">{message}</p>}
    <button className="auth-switch" disabled={pending} onClick={() => { setRegister(recover ? false : !register); setRecover(false); setMessage(""); }}>{register || recover ? "Back to sign in" : "Create an account"}</button>
    {!register && !recover && <button className="auth-switch" disabled={pending} onClick={() => { setRecover(true); setMessage(""); }}>Forgot password?</button>}
  </section></main>;
}
