import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

export type AreraCategory = "luce" | "gas";

export interface ScrapedRate {
  provider: string;
  planName: string;
  priceValue: number;
  priceUnit: string;
  monthlyFee: number;
  url: string;
  offertaInizio: Date | null;
  offertaFine: Date | null;
  tipoOfferta: string | null;
  durataEsclusive: number | null;
}

export function uniqueMarketRates(rates: ScrapedRate[]): ScrapedRate[] {
  const byKey = new Map<string, ScrapedRate>();
  for (const rate of rates) {
    byKey.set(JSON.stringify([rate.provider, rate.planName]), rate);
  }
  return [...byKey.values()];
}

export function upsertMarketSnapshotSql(category: AreraCategory, snapshotAt: Date, rates: ScrapedRate[]) {
  const payload = JSON.stringify(rates.map((rate) => ({ ...rate, id: randomUUID() })));
  return Prisma.sql`
    WITH incoming AS (
      SELECT *
      FROM jsonb_to_recordset(${payload}::jsonb) AS offer(
        id text, provider text, "planName" text, "priceValue" double precision, "priceUnit" text,
        "monthlyFee" double precision, url text, "offertaInizio" timestamptz, "offertaFine" timestamptz,
        "tipoOfferta" text, "durataEsclusive" integer
      )
    ), written AS (
      INSERT INTO "MarketRate" AS existing (
        id, category, provider, "planName", "priceValue", "priceUnit", "monthlyFee", url,
        "offertaInizio", "offertaFine", "tipoOfferta", "durataEsclusive", "scrapedAt"
      )
      SELECT id, ${category}, provider, "planName", "priceValue", "priceUnit", "monthlyFee", url,
        "offertaInizio", "offertaFine", "tipoOfferta", "durataEsclusive", ${snapshotAt}::timestamptz
      FROM incoming
      ORDER BY provider, "planName"
      ON CONFLICT (provider, "planName") DO UPDATE SET
        "priceValue" = EXCLUDED."priceValue", "priceUnit" = EXCLUDED."priceUnit",
        "monthlyFee" = EXCLUDED."monthlyFee", url = EXCLUDED.url,
        "offertaInizio" = EXCLUDED."offertaInizio", "offertaFine" = EXCLUDED."offertaFine",
        "tipoOfferta" = EXCLUDED."tipoOfferta", "durataEsclusive" = EXCLUDED."durataEsclusive",
        "scrapedAt" = EXCLUDED."scrapedAt"
      WHERE existing.category = EXCLUDED.category
      RETURNING id, provider, "planName"
    )
    SELECT count(*) FILTER (WHERE written.id = incoming.id)::int AS inserted,
      count(*) FILTER (WHERE written.id <> incoming.id)::int AS updated
    FROM written
    JOIN incoming USING (provider, "planName")
  `;
}
