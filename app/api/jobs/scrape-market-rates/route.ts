// ARERA Open Data — aggiornato 2026-06-29
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ARERA_OPENDATA_BASE } from "@/lib/config/constants";

interface ScrapedRate {
  category: string;
  provider: string;
  planName: string;
  priceValue: number;
  priceUnit: string;
  monthlyFee: number;
  url: string;
}

// Module-level cache: avoid re-searching on every call within same process
const fileCache: Record<string, { url: string; foundAt: number }> = {};
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function getCurrentQuarter(): { anno: number; trim: number } {
  const now = new Date();
  const anno = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const trim = Math.ceil(month / 3);
  return { anno, trim };
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

async function findLatestAreraFile(category: 'E' | 'G'): Promise<string> {
  const cacheKey = category;
  const cached = fileCache[cacheKey];
  if (cached && Date.now() - cached.foundAt < CACHE_TTL_MS) {
    return cached.url;
  }

  const { anno, trim } = getCurrentQuarter();
  const folder = `${anno}_${trim}`;
  const today = new Date();

  for (let daysBack = 0; daysBack <= 90; daysBack++) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() - daysBack);
    const dateStr = formatDate(candidate);
    const url = `${ARERA_OPENDATA_BASE}/${folder}/PO_Offerte_${category}_MLIBERO_${dateStr}.xml`;

    try {
      const res = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        fileCache[cacheKey] = { url, foundAt: Date.now() };
        return url;
      }
    } catch {
      // not found, try next date
    }
  }

  throw new Error(`Nessun file ARERA trovato per categoria ${category} negli ultimi 90 giorni`);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}

async function parseAreraFile(url: string, category: 'luce' | 'gas'): Promise<{ rates: ScrapedRate[]; errors: string[] }> {
  const rates: ScrapedRate[] = [];
  const errors: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} per ${url}`);
  const text = await res.text();

  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return { rates, errors };

  const headers = parseCsvLine(lines[0]);
  const idx = (name: string) => headers.indexOf(name);

  const iDenominazione = idx('denominazione');
  const iNomeOfferta = idx('nome_offerta');
  const iUrlOfferta = idx('url_offerta');
  const iUrlSito = idx('url_sito_venditore');
  const iTipoCliente = idx('tipo_cliente');
  const iTipoOfferta = idx('tipo_offerta');
  const iPFixF = idx('p_fix_f');
  const iPVolMono = idx('p_vol_mono');
  const iDataFine = idx('data_fine');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);

    const tipoCliente = cols[iTipoCliente]?.toLowerCase() ?? '';
    if (tipoCliente !== 'domestico') continue;

    const dataFineStr = cols[iDataFine] ?? '';
    if (dataFineStr) {
      // format: DD/MM/YYYY or YYYY-MM-DD
      let dataFine: Date | null = null;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataFineStr)) {
        const [dd, mm, yyyy] = dataFineStr.split('/');
        dataFine = new Date(`${yyyy}-${mm}-${dd}`);
      } else if (/^\d{4}-\d{2}-\d{2}/.test(dataFineStr)) {
        dataFine = new Date(dataFineStr.substring(0, 10));
      }
      if (dataFine && dataFine < today) continue;
    }

    const pVolMonoStr = cols[iPVolMono] ?? '';
    if (!pVolMonoStr || pVolMonoStr === '0') continue;

    const rawPrice = parseFloat(pVolMonoStr.replace(',', '.'));
    if (isNaN(rawPrice) || rawPrice === 0) continue;

    // Values in CSV are multiplied by 1000 (millesimi)
    const priceValue = rawPrice / 1000;

    const pFixFStr = cols[iPFixF] ?? '';
    const pFixF = parseFloat(pFixFStr.replace(',', '.'));
    const monthlyFee = isNaN(pFixF) ? 0 : pFixF / 12;

    const urlOfferta = cols[iUrlOfferta] ?? '';
    const urlSito = cols[iUrlSito] ?? '';
    const offerUrl = urlOfferta || urlSito;

    rates.push({
      category,
      provider: cols[iDenominazione] ?? '',
      planName: cols[iNomeOfferta] ?? '',
      priceValue,
      priceUnit: category === 'gas' ? '€/Smc' : '€/kWh',
      monthlyFee,
      url: offerUrl,
    });
  }

  return { rates, errors };
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.JOBS_SECRET}`) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  let inserted = 0;
  let updated = 0;
  const allErrors: string[] = [];

  const jobs: Array<{ category: 'E' | 'G'; label: 'luce' | 'gas' }> = [
    { category: 'E', label: 'luce' },
    { category: 'G', label: 'gas' },
  ];

  // TODO: fonte internet da definire

  for (const { category, label } of jobs) {
    let url: string;
    try {
      url = await findLatestAreraFile(category);
    } catch (err) {
      allErrors.push(err instanceof Error ? err.message : `Errore ricerca file ${category}`);
      continue;
    }

    let rates: ScrapedRate[];
    try {
      const result = await parseAreraFile(url, label);
      rates = result.rates;
      allErrors.push(...result.errors);
    } catch (err) {
      allErrors.push(`Parse fallito per ${label}: ${err instanceof Error ? err.message : 'Errore'}`);
      continue;
    }

    for (const rate of rates) {
      if (!rate.provider || !rate.planName) continue;
      try {
        const existing = await prisma.marketRate.findUnique({
          where: { provider_planName: { provider: rate.provider, planName: rate.planName } },
          select: { id: true },
        });

        await prisma.marketRate.upsert({
          where: { provider_planName: { provider: rate.provider, planName: rate.planName } },
          update: {
            priceValue: rate.priceValue,
            priceUnit: rate.priceUnit,
            monthlyFee: rate.monthlyFee,
            url: rate.url,
            scrapedAt: new Date(),
          },
          create: {
            category: rate.category,
            provider: rate.provider,
            planName: rate.planName,
            priceValue: rate.priceValue,
            priceUnit: rate.priceUnit,
            monthlyFee: rate.monthlyFee,
            url: rate.url,
          },
        });

        if (existing) updated++;
        else inserted++;
      } catch {
        allErrors.push(`Upsert fallito per ${rate.provider} / ${rate.planName}`);
      }
    }
  }

  return NextResponse.json({ updated, inserted, errors: allErrors });
}
