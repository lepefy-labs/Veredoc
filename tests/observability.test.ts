import assert from "node:assert/strict";
import test from "node:test";
import {
  createOperationalEvent,
  elapsedMs,
  toSafeErrorMessage,
} from "../lib/observability/operations.ts";

test("operational events hanno formato stabile e rimuovono undefined", () => {
  const event = createOperationalEvent(
    "job.test",
    { count: 3, ok: true, optional: undefined, value: null },
    new Date("2026-08-30T10:00:00.000Z")
  );

  assert.deepEqual(event, {
    service: "veredoc",
    event: "job.test",
    timestamp: "2026-08-30T10:00:00.000Z",
    count: 3,
    ok: true,
    value: null,
  });
});

test("elapsedMs non restituisce durate negative", () => {
  assert.equal(elapsedMs(100, 175), 75);
  assert.equal(elapsedMs(200, 150), 0);
});

test("toSafeErrorMessage normalizza e tronca gli errori", () => {
  assert.equal(toSafeErrorMessage(new Error("boom")), "boom");
  assert.equal(toSafeErrorMessage("errore"), "errore");
  assert.equal(toSafeErrorMessage({}), "Errore sconosciuto");
  assert.equal(toSafeErrorMessage(new Error("abcdefgh"), 4), "abcd");
});
