import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { uniqueMarketRates, upsertMarketSnapshotSql, type ScrapedRate } from "../lib/parsers/market-snapshot.ts";

const rate: ScrapedRate = {
  provider: "fornitore",
  planName: "offerta",
  priceValue: 0.2,
  priceUnit: "€/kWh",
  monthlyFee: 8,
  url: "https://example.com/",
  offertaInizio: null,
  offertaFine: new Date("2026-12-01T00:00:00Z"),
  tipoOfferta: "fisso",
  durataEsclusive: 12,
};

test("l'upsert ARERA inserisce e aggiorna in blocco, preservando le offerte di un'altra categoria", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE "MarketRate" (
        id text PRIMARY KEY, category text NOT NULL, provider text NOT NULL, "planName" text NOT NULL,
        "priceValue" double precision NOT NULL CHECK ("priceValue" > 0), "priceUnit" text NOT NULL,
        "monthlyFee" double precision, url text, "offertaInizio" timestamptz, "offertaFine" timestamptz,
        "tipoOfferta" text, "durataEsclusive" integer, "scrapedAt" timestamptz NOT NULL,
        UNIQUE (provider, "planName")
      );
    `);
    const run = async (category: "luce" | "gas", day: string, input: ScrapedRate[]) => {
      const query = upsertMarketSnapshotSql(category, new Date(day), uniqueMarketRates(input));
      return (await db.query(query.text, query.values as unknown[])).rows;
    };
    assert.deepEqual(await run("luce", "2026-11-16", [rate]), [{ inserted: 1, updated: 0 }]);
    assert.deepEqual(await run("gas", "2026-11-17", [rate]), [{ inserted: 0, updated: 0 }]);
    assert.deepEqual(await run("luce", "2026-11-17", [
      rate, { ...rate, priceValue: 0.3 }, { ...rate, planName: "nuova" },
    ]), [{ inserted: 1, updated: 1 }]);

    const rows = () => db.query('SELECT category, "priceValue", "scrapedAt" FROM "MarketRate" ORDER BY "planName"');
    const before = (await rows()).rows;
    assert.deepEqual(before, [
      { category: "luce", priceValue: 0.2, scrapedAt: new Date("2026-11-17") },
      { category: "luce", priceValue: 0.3, scrapedAt: new Date("2026-11-17") },
    ]);
    await assert.rejects(run("luce", "2026-11-18", [
      { ...rate, priceValue: 0.4 }, { ...rate, planName: "non valida", priceValue: -1 },
    ]));
    assert.deepEqual((await rows()).rows, before);
  } finally {
    await db.close();
  }
});
