import assert from "node:assert/strict";
import test from "node:test";
import { startDelayedNoticeTimer } from "../lib/notifications/delayed-notice.ts";

// Timer manuale: nessuna attesa reale nei test.
function fakeTimers() {
  const pending = new Map<number, () => void>();
  let next = 0;
  return {
    timers: {
      set: ((callback: () => void) => {
        const id = ++next;
        pending.set(id, callback);
        return id;
      }) as unknown as typeof setTimeout,
      clear: ((id: number) => {
        pending.delete(id);
      }) as unknown as typeof clearTimeout,
    },
    fireAll() {
      for (const [id, callback] of [...pending]) {
        pending.delete(id);
        callback();
      }
    },
    pending: () => pending.size,
  };
}

test("avviso di attesa: analisi conclusa prima della soglia → nessun invio", async () => {
  const clock = fakeTimers();
  let fired = 0;
  const timer = startDelayedNoticeTimer(61_000, async () => { fired++; }, clock.timers);

  await timer.cancel();
  clock.fireAll();

  assert.equal(fired, 0);
  assert.equal(clock.pending(), 0);
});

test("avviso di attesa: analisi lenta → un solo invio allo scadere della soglia", async () => {
  const clock = fakeTimers();
  let fired = 0;
  const timer = startDelayedNoticeTimer(61_000, async () => { fired++; }, clock.timers);

  clock.fireAll();
  await timer.wait();
  // L'esito finale arriva dopo: cancel attende l'invio già partito, non lo ripete.
  await timer.cancel();

  assert.equal(fired, 1);
});

test("avviso di attesa: worker senza esito finale attende la soglia; un errore di invio non propaga", async () => {
  const clock = fakeTimers();
  const timer = startDelayedNoticeTimer(61_000, async () => {
    throw new Error("Brevo non disponibile");
  }, clock.timers);

  const waiting = timer.wait();
  clock.fireAll();
  await waiting;
});
