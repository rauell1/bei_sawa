import { BRAND } from "./brand";

type Kind = "verify-email" | "reset-password" | "draft-saved" | "report-filed";
const COPY: Record<Kind, { subject: string; heading: string; intro: string; action: string; notice: string }> = {
  "verify-email": { subject: "Confirm your BeiSawa email address", heading: "Welcome to BeiSawa", intro: "Confirm your email address to finish setting up your private review workspace.", action: "Confirm email address", notice: "If you did not create a BeiSawa account, you can ignore this email." },
  "reset-password": { subject: "Reset your BeiSawa password", heading: "Reset your password", intro: "A password reset was requested for your BeiSawa account. Use the secure link below to choose a new password.", action: "Reset password", notice: "If you did not request this, ignore this email. Your password stays unchanged." },
  "draft-saved": { subject: "Your BeiSawa draft is saved for review", heading: "Your draft is ready for human review", intro: "A private review draft has been saved. Saving a draft does not approve it or file a report.", action: "Open review desk", notice: "Review the cited source and exact revision before making a decision. No procurement decision or external submission has been made." },
  "report-filed": { subject: "Your BeiSawa internal report is filed", heading: "Internal report filed", intro: "An internal report has been filed after matching human approval of its exact revision.", action: "Open review desk", notice: "Internal filing does not submit a report to a procurement authority or make a procurement decision." },
};
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));

/** Render only: this function never sends, queues, or invents authentication links.
 * trustedAuthOrigin must come from operator configuration, never email/body input.
 */
export function renderCommunication(kind: Kind, actionUrl: string, options: { trustedAuthOrigin?: string; reference?: string } = {}) {
  const url = new URL(actionUrl);
  const allowed = new Set<string>([BRAND.origin]);
  if (options.trustedAuthOrigin) {
    const origin = new URL(options.trustedAuthOrigin);
    if (origin.protocol !== "https:" || origin.username || origin.password) throw new Error("Invalid configured auth origin");
    allowed.add(origin.origin);
  }
  if (url.protocol !== "https:" || url.username || url.password || !allowed.has(url.origin)) throw new Error("Communication action must use the BeiSawa or configured authentication origin");
  const copy = COPY[kind];
  const reference = options.reference ? `Reference: ${options.reference}` : "";
  const link = escape(url.href);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${copy.subject}</title>
</head>
<body style="margin:0;background:#f7f8f4;font-family:Arial,sans-serif;color:#193b2e">
<div style="display:none;max-height:0;overflow:hidden">${copy.intro}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:white;border:1px solid #dce3dc;border-radius:12px">
<tr>
<td style="padding:32px">
<img src="${BRAND.origin}/brand/email-wordmark" width="240" height="60" alt="${BRAND.name} — ${BRAND.tagline}" style="display:block;border:0;max-width:100%;height:auto">
<h1 style="font-size:26px;line-height:1.25;margin:32px 0 16px">${copy.heading}</h1>
<p style="font-size:15px;line-height:1.7">${copy.intro}</p>${reference ? `<p style="font-size:13px">${escape(reference)}</p>` : ""}<table role="presentation" cellspacing="0" cellpadding="0">
<tr>
<td bgcolor="#193b2e" style="border-radius:6px">
<a href="${link}" style="display:inline-block;padding:14px 22px;color:white;text-decoration:none;font-weight:bold">${copy.action}</a>
</td>
</tr>
</table>
<p style="font-size:13px;line-height:1.6;margin-top:24px">${copy.notice}</p>
<p style="font-size:12px;line-height:1.6">If the button does not work, copy this link into your browser:<br>
<a href="${link}" style="color:#193b2e;word-break:break-all">${link}</a>
</p>
<hr style="border:0;border-top:1px solid #dce3dc;margin-top:28px">
<p style="font-size:12px;line-height:1.6">${BRAND.name} · ${BRAND.tagline}<br>
<a href="${BRAND.origin}" style="color:#193b2e">beisawa.rauell.systems</a>
<br>${BRAND.senderEmail}<br>Your workspace is private. Never share your password or verification link.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
  return { from: `${BRAND.senderName} <${BRAND.senderEmail}>`, subject: copy.subject, html, text: `${BRAND.name} — ${BRAND.tagline}\n\n${copy.heading}\n\n${copy.intro}\n${reference}\n\n${copy.action}: ${url.href}\n\n${copy.notice}\n\n${BRAND.origin}\nNever share your password or verification link.` };
}
