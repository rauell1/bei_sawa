"use client";
import { useEffect, useState } from "react";
import { BrandLogo } from "../brand-logo";
import { authClient } from "@/lib/auth/client";

export default function ResetPassword() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") || ""); }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const fields = new FormData(event.currentTarget);
    const newPassword = String(fields.get("password"));
    if (newPassword !== fields.get("confirm")) { setMessage("Passwords do not match."); setPending(false); return; }
    try {
      const { error } = await authClient.resetPassword({ newPassword, token });
      if (error) throw new Error(error.message || "The reset link is invalid or expired.");
      setToken(""); setMessage("Password updated. You can sign in now.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Password could not be updated."); }
    finally { setPending(false); }
  }
  return <main className="auth-page"><section className="auth-card"><a className="auth-brand" href="/login" aria-label="BeiSawa sign in"><BrandLogo /></a><h1>Choose a new password</h1>
    {!token && !message && <p>Open the reset link from your email to continue.</p>}
    {token && <form onSubmit={submit}>
      <label>New password<input type="password" name="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>
      <label>Confirm password<input type="password" name="confirm" autoComplete="new-password" required minLength={8} maxLength={128} /></label>
      <button type="submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</button>
    </form>}
    {message && <p role="status">{message}</p>}<a href="/login">Back to sign in</a>
  </section></main>;
}
