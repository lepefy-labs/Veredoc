import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { preparationPdf } from "../lib/pratiche/preparation-pdf.ts";

test("il riepilogo usa pagine A4 e continua quando la checklist è lunga", async () => {
  const overview = {
    title: "Verifica residenza e dati",
    status: "In corso",
    version: 2,
    updatedAt: new Date("2026-11-23T10:00:00Z"),
    requiredDone: 1,
    requiredTotal: 2,
    steps: [{ title: "Raccogli le informazioni per la residenza", done: true }],
    authorities: ["ANPR"],
  };
  const short = await PDFDocument.load(await preparationPdf(overview));
  assert.equal(short.getPageCount(), 1);
  assert.ok(Math.abs(short.getPage(0).getWidth() - 595.28) < 0.01);
  const steps = Array.from({ length: 50 }, (_, i) => ({
    title: `Controlla il requisito ${i + 1} ${"lungo ".repeat(20)}${"a".repeat(300)}`,
    done: false,
  }));
  const long = await PDFDocument.load(await preparationPdf({ ...overview, steps }));
  assert.ok(long.getPageCount() > 1);
});
