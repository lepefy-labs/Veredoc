// Regole di validità delle offerte di mercato usate nel confronto bollette.
//
// MarketRate conserva ogni offerta mai vista: lo scraper scarta le offerte scadute
// solo nel momento in cui legge il file ARERA, e le righe non vengono mai rimosse.
// Un'offerta entra nel confronto solo se:
// - è nel periodo di validità (offertaInizio <= ora < offertaFine, estremi null ammessi);
// - è presente nell'ultimo snapshot ARERA della categoria (scrapedAt vicino all'ultimo
//   aggiornamento): un'offerta ritirata dal file non viene più aggiornata.

// Uno scraping completo dura pochi minuti; la finestra assorbe esecuzioni lente o ripetute.
export const MARKET_SNAPSHOT_WINDOW_MS = 12 * 60 * 60 * 1000;
// Oltre questa età i dati di mercato vengono segnalati come non aggiornati.
export const MARKET_DATA_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export interface MarketOfferValidity {
  scrapedAt: Date;
  offertaInizio: Date | null;
  offertaFine: Date | null;
}

export function snapshotStart(latestScrapedAt: Date): Date {
  return new Date(latestScrapedAt.getTime() - MARKET_SNAPSHOT_WINDOW_MS);
}

export function isOfferCurrentlyValid(offer: MarketOfferValidity, latestScrapedAt: Date, now: Date): boolean {
  if (offer.scrapedAt < snapshotStart(latestScrapedAt)) return false;
  if (offer.offertaInizio && offer.offertaInizio > now) return false;
  if (offer.offertaFine && offer.offertaFine <= now) return false;
  return true;
}

// Filtro Prisma equivalente a isOfferCurrentlyValid, applicato direttamente nella query.
export function validOfferWhere(category: string, latestScrapedAt: Date, now: Date) {
  return {
    category,
    scrapedAt: { gte: snapshotStart(latestScrapedAt) },
    AND: [
      { OR: [{ offertaInizio: null }, { offertaInizio: { lte: now } }] },
      { OR: [{ offertaFine: null }, { offertaFine: { gt: now } }] },
    ],
  };
}

export function isMarketDataStale(latestScrapedAt: Date | null, now: Date): boolean {
  return !latestScrapedAt || now.getTime() - latestScrapedAt.getTime() > MARKET_DATA_STALE_AFTER_MS;
}
