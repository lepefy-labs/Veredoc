import assert from "node:assert/strict";
import test from "node:test";
import { summarizeDocument } from "../lib/dashboard/summary.ts";
import { renderOpsAlert, shouldAlert } from "../lib/observability/alert-core.ts";
import { logOperationalEvent, setOperationalErrorHook } from "../lib/observability/operations.ts";

const BASE = {
  id: "doc-1",
  profileId: "p-1",
  type: "BOLLETTA_LUCE",
  fileName: "bolletta.pdf",
  createdAt: new Date("2026-10-01T10:00:00.000Z"),
};

test("riepilogo dashboard: solo i campi mostrati", () => {
  const summary = summarizeDocument({
    ...BASE,
    status: "DONE",
    analysis: { importo_totale: 84.2, fornitore: "  Fornitore Sintetico ", pod: "IT001E00000000", consumo_kwh: 210 },
  });
  assert.deepEqual(summary, {
    id: "doc-1",
    profileId: "p-1",
    type: "BOLLETTA_LUCE",
    fileName: "bolletta.pdf",
    status: "DONE",
    createdAt: "2026-10-01T10:00:00.000Z",
    amount: 84.2,
    counterparty: "Fornitore Sintetico",
  });
  assert.ok(!JSON.stringify(summary).includes("IT001E"));
});

test("riepilogo dashboard: busta paga, valori non numerici e documenti non completati", () => {
  const payroll = summarizeDocument({ ...BASE, type: "BUSTA_PAGA", status: "DONE", analysis: { stipendio_netto: "1850.5", datore_lavoro: "Azienda" } });
  assert.equal(payroll.amount, 1850.5);
  assert.equal(payroll.counterparty, "Azienda");

  const invalid = summarizeDocument({ ...BASE, status: "DONE", analysis: { importo_totale: "n/d", fornitore: "" } });
  assert.equal(invalid.amount, null);
  assert.equal(invalid.counterparty, null);

  // In ERROR l'analisi contiene messaggi tecnici: nessun campo esposto.
  const failed = summarizeDocument({ ...BASE, status: "ERROR", analysis: { importo_totale: 10, fornitore: "X" } });
  assert.equal(failed.amount, null);
  assert.equal(failed.counterparty, null);
});

test("avvisi operativi: eventi attesi esclusi, contenuto solo tecnico", () => {
  assert.equal(shouldAlert("analysis.failed"), false);
  assert.equal(shouldAlert("analysis.worker_crashed"), true);

  const email = renderOpsAlert({
    event: "analysis.worker_crashed",
    fields: { documentId: "doc-1", error: "x".repeat(1000), empty: "", missing: undefined },
    occurredAt: new Date("2026-10-11T08:00:00.000Z"),
    environment: "production",
  });
  assert.equal(email.subject, "[Veredoc] Errore: analysis.worker_crashed");
  assert.ok(email.textContent.includes("documentId: doc-1"));
  assert.ok(!email.textContent.includes("empty:"));
  assert.ok(!email.textContent.includes("x".repeat(301)));
});

test("log operativi: l'hook riceve solo gli errori e non può interrompere il chiamante", () => {
  const received: string[] = [];
  const originals = { error: console.error, warn: console.warn, info: console.info };
  console.error = console.warn = console.info = () => {};
  try {
    setOperationalErrorHook((event) => {
      received.push(event);
      throw new Error("hook rotto");
    });
    logOperationalEvent("evento.info", {});
    logOperationalEvent("evento.warn", {}, "warn");
    assert.doesNotThrow(() => logOperationalEvent("evento.error", { id: 1 }, "error"));
    assert.deepEqual(received, ["evento.error"]);
  } finally {
    setOperationalErrorHook(null);
    Object.assign(console, originals);
  }
});
