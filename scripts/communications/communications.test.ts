import test from "node:test";
import assert from "node:assert/strict";
import { renderCommunication } from "../../frontend/lib/communications";

test("rejects lookalike origins, credentials and executable links", () => {
  for (const url of ["javascript:alert(1)", "https://beisawa.rauell.systems.attacker.test/", "https://user:pass@beisawa.rauell.systems/"]) assert.throws(() => renderCommunication("reset-password", url));
});
test("preserves real signed provider URLs only for configured auth origin", () => {
  const url = "https://auth.example.test/verify-email?token=signed&callbackURL=https%3A%2F%2Fbeisawa.rauell.systems%2Faccount%2Fverified";
  assert.throws(() => renderCommunication("verify-email", url));
  const message = renderCommunication("verify-email", url, { trustedAuthOrigin: "https://auth.example.test" });
  assert.ok(message.text.includes(url));
  assert.ok(message.html.includes("signed&amp;callbackURL="));
});
test("escapes record references and keeps draft/filing claims distinct", () => {
  const draft = renderCommunication("draft-saved", "https://beisawa.rauell.systems/", { reference: '<img src=x onerror="alert(1)">' });
  assert.ok(draft.html.includes("&lt;img"));
  assert.ok(!draft.html.includes('<img src=x'));
  assert.ok(draft.text.includes("does not approve"));
  assert.ok(renderCommunication("report-filed", "https://beisawa.rauell.systems/").text.includes("does not submit"));
});

test("all message designs use the designated sender and PNG wordmark", () => {
  for (const kind of ["verify-email", "reset-password", "draft-saved", "report-filed"] as const) {
    const message = renderCommunication(kind, "https://beisawa.rauell.systems/");
    assert.equal(message.from, "BeiSawa <info@rauell.systems>");
    assert.ok(message.subject.includes("BeiSawa"));
    assert.ok(message.html.includes("/brand/email-wordmark"));
    assert.ok(message.text.includes("Value, with evidence"));
  }
});
