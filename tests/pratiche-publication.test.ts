import assert from "node:assert/strict";
import test from "node:test";
import { hasVerifiedCoverage } from "../lib/pratiche/publication.ts";

const base = {
  definition: { questions: [{ id: "who", title: "Per chi?", type: "boolean", required: true }], steps: [{ id: "prepare", title: "Prepara", description: "Prepara", kind: "task", required: true }, { id: "portal", title: "Portale", description: "Apri", kind: "portal", required: false, url: "https://www.inps.it/" }] },
  citations: [{ sourceId: "s1", revisionId: "r2", instructionIds: ["who", "prepare", "portal"], source: { status: "VERIFIED", verifiedAt: new Date(), url: "https://www.inps.it/", revisions: [{ id: "r2" }] }, revision: { status: "VERIFIED", sourceId: "s1" } }],
};

test("pubblica solo conoscenza verificata e copertura completa", () => {
  assert.equal(hasVerifiedCoverage(base), true);
  assert.equal(hasVerifiedCoverage({ ...base, citations: [{ ...base.citations[0], source: { ...base.citations[0].source, url: "https://sc.anpr.interno.it/serviziCittadino/dist/docs/guida_compilazione_cambio_residenza.pdf" } }] }), true);
  assert.equal(hasVerifiedCoverage({ ...base, citations: [] }), false);
  assert.equal(hasVerifiedCoverage({ ...base, citations: [{ ...base.citations[0], instructionIds: ["who"] }] }), false);
});

test("blocca fonte mancante, ritirata o obsoleta", () => {
  assert.equal(hasVerifiedCoverage({ ...base, citations: [{ ...base.citations[0], source: { ...base.citations[0].source, status: "RETIRED" } }] }), false);
  assert.equal(hasVerifiedCoverage({ ...base, citations: [{ ...base.citations[0], source: { ...base.citations[0].source, status: "STALE" } }] }), false);
  assert.equal(hasVerifiedCoverage({ ...base, citations: [{ ...base.citations[0], source: { ...base.citations[0].source, revisions: [{ id: "r3" }] } }] }), false);
  assert.equal(hasVerifiedCoverage({ ...base, citations: [{ ...base.citations[0], source: { ...base.citations[0].source, verifiedAt: null } }] }), false);
});

test("una revisione acquisita non diventa verificata automaticamente", () => {
  assert.equal(hasVerifiedCoverage({ ...base, citations: [{ ...base.citations[0], revision: { status: "PENDING_REVIEW", sourceId: "s1" } }] }), false);
});
