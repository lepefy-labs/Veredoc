// ARERA Open Data Mercato Libero (XML) — aggiornato 2026-06-29
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ARERA_ML_BASE, INDICI_MERCATO, PROVIDER_WHITELIST_EXACT, PROVIDER_WHITELIST_CONTAINS } from "@/lib/config/constants";
import { elapsedMs, logOperationalEvent } from "@/lib/observability/operations";
import { MARKET_DATA_STALE_AFTER_MS, isMarketDataStale } from "@/lib/parsers/market-offers";
import { uniqueMarketRates, upsertMarketSnapshotSql, type AreraCategory, type ScrapedRate } from "@/lib/parsers/market-snapshot";
import { isJobRequestAuthorized } from "@/lib/security/access";

export const maxDuration = 300;

type AreraFile = { content: string; publishedAt: Date };
type CategoryResult = {
  category: AreraCategory;
  sourceDate: string | null;
  lastSuccessfulSnapshotAt: string | null;
  extracted: number;
  inserted: number;
  updated: number;
  conflicts: number;
  error: string | null;
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 86400000;
const MAX_SOURCE_AGE_DAYS = MARKET_DATA_STALE_AFTER_MS / DAY_MS;
const xmlCache = new Map<"E" | "G", { file: AreraFile; foundAt: number }>();

async function downloadXml(url: string, timeoutMs: number, budget: AbortSignal) {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.any([budget, AbortSignal.timeout(timeoutMs)]),
    });
    if (response.ok) {
      const content = await response.text();
      if (content.includes("<offerta>")) return content;
    }
  } catch {
    // Un errore di rete sul download diretto deve consentire il fallback.
  }
  return null;
}

async function findLatestAreraFile(cat: "E" | "G"): Promise<AreraFile | null> {
  const now = Date.now();
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  const cached = xmlCache.get(cat);
  if (cached && now - cached.foundAt < CACHE_TTL_MS && cached.file.publishedAt.getTime() === today) return cached.file;

  const budget = AbortSignal.timeout(100_000);
  for (let daysBack = 0; daysBack <= MAX_SOURCE_AGE_DAYS && !budget.aborted; daysBack++) {
    const publishedAt = new Date(today - daysBack * DAY_MS);
    const year = publishedAt.getUTCFullYear();
    const month = publishedAt.getUTCMonth() + 1;
    const dateStr = publishedAt.toISOString().slice(0, 10).replaceAll("-", "");
    const url = `${ARERA_ML_BASE}/${year}_${month}/PO_Offerte_${cat}_MLIBERO_${dateStr}.xml`;

    let content = await downloadXml(url, 10_000, budget);
    if (!content && !budget.aborted && process.env.SCRAPERAPI_KEY) {
      const scraperUrl = new URL("https://api.scraperapi.com/");
      scraperUrl.search = new URLSearchParams({ api_key: process.env.SCRAPERAPI_KEY, url }).toString();
      content = await downloadXml(scraperUrl.toString(), 20_000, budget);
    }
    if (content) {
      const file = { content, publishedAt };
      xmlCache.set(cat, { file, foundAt: Date.now() });
      return file;
    }
  }
  return null;
}

function parseAreraDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const [datePart, timePart] = raw.split("_");
  const [d, m, y] = datePart.split("/");
  const [h, mi, s] = (timePart || "00:00:00").split(":");
  const dt = new Date(`${y}-${m}-${d}T${h}:${mi}:${s}`);
  return isNaN(dt.getTime()) ? null : dt;
}

function parseAreraXml(xmlText: string, category: "luce" | "gas"): ScrapedRate[] {
  const { PUN, PSV } = INDICI_MERCATO;
  const indice = category === "luce" ? PUN : PSV;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rates: ScrapedRate[] = [];

  const blocks = xmlText.split("</offerta>");

  for (const raw of blocks) {
    const start = raw.indexOf("<offerta>");
    if (start === -1) continue;
    const block = raw.slice(start);

    const tipoCliente = block.match(/<TIPO_CLIENTE>(\d+)<\/TIPO_CLIENTE>/)?.[1];
    if (tipoCliente !== "01") continue;

    const dataFineRaw = block.match(/<DATA_FINE>(.*?)<\/DATA_FINE>/)?.[1];
    if (dataFineRaw) {
      const datePart = dataFineRaw.split("_")[0];
      const [dd, mm, yyyy] = datePart.split("/");
      if (new Date(`${yyyy}-${mm}-${dd}`) < today) continue;
    }

    const tipoOfferta = block.match(/<TIPO_OFFERTA>(\d+)<\/TIPO_OFFERTA>/)?.[1] ?? "02";
    const nomeOfferta = block.match(/<NOME_OFFERTA>(.*?)<\/NOME_OFFERTA>/)?.[1]?.trim();
    if (!nomeOfferta) continue;

    const urlOfferta = block.match(/<URL_OFFERTA>(.*?)<\/URL_OFFERTA>/)?.[1]?.trim() ?? "";
    const urlSito = block.match(/<URL_SITO_VENDITORE>(.*?)<\/URL_SITO_VENDITORE>/)?.[1]?.trim() ?? "";
    const url = urlOfferta.startsWith("http") ? urlOfferta : urlSito;

    const piva = block.match(/<PIVA_UTENTE>(.*?)<\/PIVA_UTENTE>/)?.[1];
    const rawUrl = urlSito.replace(/https?:\/\//i, "").replace(/^www\./i, "");
    const provider = rawUrl.split(".")[0] || piva || "sconosciuto";

    const providerLower = provider.toLowerCase();
    const isWhitelisted =
      PROVIDER_WHITELIST_EXACT.some(name => providerLower === name) ||
      PROVIDER_WHITELIST_CONTAINS.some(name => providerLower.includes(name));
    if (!isWhitelisted) continue;

    const dataInizioStr = block.match(/<DATA_INIZIO>(.*?)<\/DATA_INIZIO>/)?.[1];
    const dataFineStr = block.match(/<DATA_FINE>(.*?)<\/DATA_FINE>/)?.[1];
    const offertaInizio = parseAreraDate(dataInizioStr);
    const offertaFine = parseAreraDate(dataFineStr);

    const durataStr = block.match(/<DURATA>(\d+)<\/DURATA>/)?.[1];
    const durataEsclusive = durataStr ? parseInt(durataStr) : null;
    const tipoOffertaLabel = tipoOfferta === "01" ? "fisso" : "variabile";

    const compBlocks = [...block.matchAll(/<ComponenteImpresa>([\s\S]*?)<\/ComponenteImpresa>/g)];
    let priceValue: number | null = null;
    let monthlyFee = 0;

    for (const comp of compBlocks) {
      const cb = comp[1];
      const macroarea = cb.match(/<MACROAREA>(\d+)<\/MACROAREA>/)?.[1];
      const nome = cb.match(/<NOME>(.*?)<\/NOME>/)?.[1]?.toUpperCase().trim() ?? "";
      const prezzo = parseFloat(cb.match(/<PREZZO>([\d.]+)<\/PREZZO>/)?.[1] ?? "");
      if (isNaN(prezzo)) continue;

      if (macroarea === "01") monthlyFee = prezzo / 12;
      if (tipoOfferta === "01" && macroarea === "04" && priceValue === null) priceValue = prezzo;
      if (tipoOfferta === "02" && nome === "SPREAD" && priceValue === null) priceValue = indice + prezzo;
    }

    if (priceValue === null || priceValue <= 0) continue;

    rates.push({
      provider,
      planName: nomeOfferta,
      priceValue,
      priceUnit: category === "gas" ? "€/Smc" : "€/kWh",
      monthlyFee,
      url,
      offertaInizio,
      offertaFine,
      tipoOfferta: tipoOffertaLabel,
      durataEsclusive,
    });
  }

  return rates;
}

async function latestSnapshot(category: AreraCategory) {
  const latest = await prisma.marketRate.aggregate({ where: { category }, _max: { scrapedAt: true } });
  return latest._max.scrapedAt;
}

async function saveSnapshot(category: AreraCategory, publishedAt: Date, rates: ScrapedRate[]) {
  return prisma.$transaction(async (tx) => {
    // Serializza le pubblicazioni della stessa categoria, senza tenere la connessione durante il fetch.
    const lockId = category === "luce" ? 1 : 2;
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(226492, ${lockId}::int)`;
    const current = await tx.marketRate.aggregate({ where: { category }, _max: { scrapedAt: true } });
    const latest = current._max.scrapedAt;
    if (latest && latest >= publishedAt) return { latest, inserted: 0, updated: 0, conflicts: 0 };

    const [written] = await tx.$queryRaw<Array<{ inserted: number; updated: number }>>(
      upsertMarketSnapshotSql(category, publishedAt, rates)
    );
    const conflicts = rates.length - written.inserted - written.updated;
    if (conflicts === rates.length) throw new Error("market_snapshot_no_writes");
    return { latest: publishedAt, ...written, conflicts };
  }, { timeout: 30_000 });
}

async function scrapeCategory(code: "E" | "G", category: AreraCategory): Promise<CategoryResult> {
  const result: CategoryResult = {
    category, sourceDate: null, lastSuccessfulSnapshotAt: null,
    extracted: 0, inserted: 0, updated: 0, conflicts: 0, error: null,
  };
  let latest: Date | null = null;
  try {
    const file = await findLatestAreraFile(code);
    if (!file) {
      result.error = "File ARERA recente non disponibile.";
      return result;
    }
    result.sourceDate = file.publishedAt.toISOString().slice(0, 10);
    if (isMarketDataStale(file.publishedAt, new Date())) {
      result.error = "Il file ARERA disponibile risale a più di una settimana fa.";
      return result;
    }
    const rates = uniqueMarketRates(parseAreraXml(file.content, category));
    result.extracted = rates.length;
    if (!rates.length) {
      result.error = "Nessuna offerta domestica utilizzabile nel file ARERA.";
      return result;
    }
    const saved = await saveSnapshot(category, file.publishedAt, rates);
    latest = saved.latest;
    result.inserted = saved.inserted;
    result.updated = saved.updated;
    result.conflicts = saved.conflicts;
  } catch {
    result.error = "Impossibile salvare lo snapshot delle offerte.";
  } finally {
    latest ??= await latestSnapshot(category).catch(() => null);
    result.lastSuccessfulSnapshotAt = latest?.toISOString() ?? null;
    if (!result.error && isMarketDataStale(latest, new Date())) {
      result.error = "Ultimo snapshot di mercato scaduto.";
    }
    logOperationalEvent(`job.scrape_market_rates.${category}`, { ...result },
      result.error ? "error" : result.conflicts ? "warn" : "info");
  }
  return result;
}

export async function POST(req: NextRequest) {
  if (!isJobRequestAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const startedAt = Date.now();
  const categories = await Promise.all([scrapeCategory("E", "luce"), scrapeCategory("G", "gas")]);
  const summary = {
    extracted: categories.reduce((total, item) => total + item.extracted, 0),
    inserted: categories.reduce((total, item) => total + item.inserted, 0),
    updated: categories.reduce((total, item) => total + item.updated, 0),
    errors: categories.flatMap((item) => item.error ? [`${item.category}: ${item.error}`] : []),
    durationMs: elapsedMs(startedAt),
  };
  logOperationalEvent("job.scrape_market_rates.completed", {
    ...summary, errors: summary.errors.length,
  }, summary.errors.length ? "warn" : "info");
  return NextResponse.json({ ...summary, categories }, { status: summary.errors.length ? 502 : 200 });
}
