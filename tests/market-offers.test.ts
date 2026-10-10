import assert from "node:assert/strict";
import test from "node:test";
import {
  MARKET_SNAPSHOT_WINDOW_MS,
  isMarketDataStale,
  isOfferCurrentlyValid,
  validOfferWhere,
} from "../lib/parsers/market-offers.ts";

const NOW = new Date("2026-10-10T20:00:00.000Z");
const LATEST = new Date("2026-09-23T00:01:17.000Z");

function offer(overrides: Partial<{ scrapedAt: Date; offertaInizio: Date | null; offertaFine: Date | null }> = {}) {
  return {
    scrapedAt: LATEST,
    offertaInizio: new Date("2026-09-01T00:00:00.000Z"),
    offertaFine: new Date("2026-12-31T23:59:59.000Z"),
    ...overrides,
  };
}

test("offerta valida e presente nell'ultimo snapshot entra nel confronto", () => {
  assert.equal(isOfferCurrentlyValid(offer(), LATEST, NOW), true);
  assert.equal(isOfferCurrentlyValid(offer({ offertaInizio: null, offertaFine: null }), LATEST, NOW), true);
});

test("offerta scaduta dopo lo scraping viene esclusa", () => {
  assert.equal(isOfferCurrentlyValid(offer({ offertaFine: new Date("2026-09-30T23:59:59.000Z") }), LATEST, NOW), false);
  assert.equal(isOfferCurrentlyValid(offer({ offertaFine: NOW }), LATEST, NOW), false);
});

test("offerta non ancora attiva viene esclusa", () => {
  assert.equal(isOfferCurrentlyValid(offer({ offertaInizio: new Date("2026-11-01T00:00:00.000Z") }), LATEST, NOW), false);
});

test("offerta assente dall'ultimo snapshot ARERA (ritirata) viene esclusa", () => {
  const ritirata = offer({ scrapedAt: new Date("2026-06-30T00:01:03.000Z") });
  assert.equal(isOfferCurrentlyValid(ritirata, LATEST, NOW), false);

  const stessaEsecuzione = offer({ scrapedAt: new Date(LATEST.getTime() - 5 * 60 * 1000) });
  assert.equal(isOfferCurrentlyValid(stessaEsecuzione, LATEST, NOW), true);
  assert.equal(
    isOfferCurrentlyValid(offer({ scrapedAt: new Date(LATEST.getTime() - MARKET_SNAPSHOT_WINDOW_MS - 1) }), LATEST, NOW),
    false
  );
});

test("il filtro Prisma applica le stesse regole del predicato", () => {
  const where = validOfferWhere("luce", LATEST, NOW);
  assert.equal(where.category, "luce");
  assert.deepEqual(where.scrapedAt, { gte: new Date(LATEST.getTime() - MARKET_SNAPSHOT_WINDOW_MS) });
  assert.deepEqual(where.AND, [
    { OR: [{ offertaInizio: null }, { offertaInizio: { lte: NOW } }] },
    { OR: [{ offertaFine: null }, { offertaFine: { gt: NOW } }] },
  ]);
});

test("dati di mercato più vecchi di 7 giorni sono segnalati", () => {
  assert.equal(isMarketDataStale(LATEST, NOW), true);
  assert.equal(isMarketDataStale(new Date("2026-10-09T00:00:00.000Z"), NOW), false);
  assert.equal(isMarketDataStale(null, NOW), true);
});
