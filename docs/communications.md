# BeiSawa branding and account communication

The approved identity is **BeiSawa**, styled **beiSawa**, with **Value, with evidence**,
forest `#193b2e` and sage `#81a889`. The owner selected **Resend** and
**BeiSawa <info@rauell.systems>**. This identifies the intended sender; it does not
establish that the domain is verified or that delivery is configured.

## Implemented in the application

- Downloaded drafts use a `beisawa-draft-…` filename; canonical report content and approval hashes are unchanged.
- The wordmark uses a bundled DejaVu Sans Bold font so its typography is stable across devices and generated images. The upstream licence accompanies the font in `public/brand/FONT-LICENSE.txt`.
- Shared brand constants and SVG geometry across the site and share-image generator.
- Branded browser icon, page titles, Open Graph PNG and PNG email mark at
  `https://beisawa.rauell.systems/brand/email-logo`, plus the full email lockup at `/brand/email-wordmark`.
- Signup verification callback `/account/verified`, branded password reset and
  resend-verification flow. The verification page checks Neon session state before
  claiming success. Provider errors are never interpreted as a verified account.
- Account pages discourage indexing and use a no-referrer policy so email tokens
  are not propagated in referrers. This is not a claim that provider-side logs redact tokens.
- Four HTML/plain-text communication designs: verification, reset, draft saved,
  internal report filed. Consistent sender, subjects, logo, fallback link and privacy
  wording. Draft messages never claim approval; filing messages never claim external submission.

Run `npx tsx scripts/communications/preview.ts` for previews in ignored
`var/communications/`. These previews do not send emails and contain no valid tokens.
`frontend/lib/communications.ts` is a renderer, **not an active mail integration**.
Notification emails must only be triggered after the corresponding committed
operation; no automatic draft/filing notifications are enabled by this change.

## Resend + Neon setup still required

1. In Resend, verify `rauell.systems` using the actual DNS records supplied by Resend
   (DKIM/SPF and any other requested records). Do not guess DNS values or delete
   existing mail records. Confirm the chosen From address is permitted.
2. Create a suitably scoped sending API key; store it securely. Never commit it,
   paste it in chat, or put it into a public frontend environment variable.
3. In Neon Auth's **production branch** email-provider configuration, choose custom
   SMTP (the API calls this `standard`): host `smtp.resend.com`, port `465` with TLS,
   username `resend`, password the Resend API key, sender email `info@rauell.systems`,
   sender name `BeiSawa`. Confirm these settings against Resend's current SMTP docs.
   Enter credentials in the provider's secure UI; avoid CLI flags that leak secrets
   through shell history or process arguments. No Vercel Resend key is needed for
   this Neon-managed SMTP flow.
4. Keep `https://beisawa.rauell.systems` in Neon's trusted redirect domains. Password
   reset returns to `/reset-password`; verification returns to `/account/verified`.
   Preserve the real provider-generated verification URL/token; changing the
   hostname or replacing it with a callback URL will break authentication.
5. Test inbox delivery and actual reset/verification links with a user-approved test
   account. Confirm From name/address, reply handling, expiry behavior and mobile rendering.
   No test messages were sent during implementation.

### Important template boundary

The inspected Neon CLI 8.2.0 and installed API expose SMTP/sender fields, but **no
email-subject, logo or HTML-template field**. Shared-provider sender overrides are
ignored. Custom SMTP changes delivery/sender configuration; it does not by itself
install our HTML templates into Neon. Neon-rendered email bodies may therefore
retain provider branding. If Neon offers template customization in the current
console, use its documented placeholders and actual signed links when applying
these designs. Otherwise full body/subject customization needs a supported Neon
email hook or another supported authentication delivery integration. Do not
intercept emails, forge verification tokens or replace authentication to simulate
branding. This provider-controlled part remains unresolved until a supported path
is confirmed. The public docs fetch was denied by the managed proxy in this session.

No SMTP provider was changed remotely and no delivered-email branding is claimed.
