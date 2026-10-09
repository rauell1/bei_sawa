# Approval and internal filing

Drafts pause at a LangGraph `interrupt`. The Python engine returns a portable
checkpoint; Neon stores it with the canonical report, SHA-256 digest, and private
object receipt. The named human decision is a separate authenticated API action.
Filing resumes the graph from that persisted checkpoint and inserts an immutable
report snapshot in a serialized Neon transaction. Repeating filing returns the
same report ID. Rejection permanently closes that revision; save a new draft to
revise it. Internal filing does not submit anything to a procurement authority.

The production identity is the verified Neon JWT subject, obtained by the Next.js
proxy from the Neon session. No body/header can supply the officer identity.
Only subjects in the operator-maintained `BEISAWA_APPROVERS` JSON map can decide
or file. Map each actual Neon user ID to that officer's authorized display name:
`{"<Neon user id>":"<authorized officer name>"}`. Set this variable locally before
`neon deploy`; `neon.ts` passes it to the Function. Empty configuration disables
approval. Do not insert invented officer names or grant approval to every signup.
This version restricts decisions and filing to the officer's own workspace; it
has no delegated review queue or separate institutional filing role.

After updating Render to this code, run `npm run db:migrate`, deploy the Neon
Function, and deploy Vercel. Existing legacy drafts intentionally cannot be
approved: save a new validated revision. Configure the actual named officer and
verify approve, reject, reload, and retry in production. Do not call this gate
live-verified until those operations have succeeded.

The engine's internal resume route computes graph state only; it has no database
filing authority. The Neon transaction verifies role, owner, snapshot hash,
immutable decision, and checkpoint result independently. Runtime database
credentials can still modify tables; distinct database roles and tamper-evident
institutional audit remain outside this implementation.
