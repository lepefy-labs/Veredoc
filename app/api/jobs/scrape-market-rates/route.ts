// ARERA Open Data PLACET — aggiornato 2026-06-29
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ScrapedRate {
  category: string;
  provider: string;
  planName: string;
  priceValue: number;
  priceUnit: string;
  monthlyFee: number;
  url: string;
}

const ARERA_BASE = 'https://www.ilportaleofferte.it/portaleOfferte/resources/opendata/csv/offerte';

// Module-level cache: avoid re-searching within same process lifetime
const csvCache: Record<string, { content: string; foundAt: number }> = {};
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function scraperUrl(targetUrl: string): string {
  return `http://api.scraperapi.com?api_key=${process.env.SCRAPERAPI_KEY}&url=${encodeURIComponent(targetUrl)}`;
}

// Returns CSV content directly to avoid a second ScraperAPI call for download
async function findLatestAreraFile(cat: 'E' | 'G'): Promise<string> {
  const cached = csvCache[cat];
  if (cached && Date.now() - cached.foundAt < CACHE_TTL_MS) {
    return cached.content;
  }

  const today = new Date();

  for (let daysBack = 0; daysBack <= 90; daysBack++) {
    const d = new Date(today);
    d.setDate(today.getDate() - daysBack);

    const year = d.getFullYear();
    const trim = Math.ceil((d.getMonth() + 1) / 3);
    const dateStr = formatDate(d);
    const fileUrl = `${ARERA_BASE}/${year}_${trim}/PO_Offerte_${cat}_PLACET_${dateStr}.csv`;

    try {
      const res = await fetch(scraperUrl(fileUrl), { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const text = await res.text();
        if (text.startsWith('denominazione,')) {
          csvCache[cat] = { content: text, foundAt: Date.now() };
          return text;
        }
      }
    } catch {
      // try next date
    }
  }

  throw new Error(`Nessun file ARERA trovato per categoria ${cat} negli ultimi 90 giorni`);
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

function parseAreraCsv(
  csvText: string,
  cat: 'E' | 'G',
): { rates: ScrapedRate[]; errors: string[] } {
  const rates: ScrapedRate[] = [];
  const errors: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return { rates, errors };

  const headers = parseCsvLine(lines[0]);
  const idx = (name: string) => headers.indexOf(name);

  const iDenominazione = idx('denominazione');
  const iNomeOfferta = idx('nome_offerta');
  const iUrlOfferta = idx('url_offerta');
  const iUrlSito = idx('url_sito_venditore');
  const iTipoCliente = idx('tipo_cliente');
  const iPFixF = idx('p_fix_f');
  const iPVolMono = idx('p_vol_mono');
  const iDataFine = idx('data_fine');

  let debugCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);

    if ((cols[iTipoCliente] ?? '').toLowerCase() !== 'domestico') continue;

    const dataFineStr = cols[iDataFine] ?? '';
    if (dataFineStr) {
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
    if (!pVolMonoStr) continue;

    const rawPrice = parseFloat(pVolMonoStr.replace(',', '.'));
    if (isNaN(rawPrice) || rawPrice === 0) continue;

    // Log first 3 raw values to verify scale
    if (debugCount < 3) {
      errors.push(`[DEBUG] p_vol_mono raw="${pVolMonoStr}" parsed=${rawPrice} (${cat})`);
      debugCount++;
    }

    const priceValue = rawPrice;

    const pFixFStr = cols[iPFixF] ?? '';
    const pFixF = parseFloat(pFixFStr.replace(',', '.'));
    const monthlyFee = isNaN(pFixF) ? 0 : pFixF / 12;

    const urlOfferta = cols[iUrlOfferta] ?? '';
    const urlSito = cols[iUrlSito] ?? '';
    const offerUrl = urlOfferta.startsWith('http') ? urlOfferta : urlSito;

    rates.push({
      category: cat === 'E' ? 'luce' : 'gas',
      provider: cols[iDenominazione] ?? '',
      planName: cols[iNomeOfferta] ?? '',
      priceValue,
      priceUnit: cat === 'E' ? '€/kWh' : '€/Smc',
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

  const jobs: Array<{ cat: 'E' | 'G' }> = [{ cat: 'E' }, { cat: 'G' }];

  // TODO: fonte internet da definire

  for (const { cat } of jobs) {
    let csvText: string;
    try {
      csvText = await findLatestAreraFile(cat);
    } catch (err) {
      allErrors.push(err instanceof Error ? err.message : `Errore ricerca file ${cat}`);
      continue;
    }

    const { rates, errors } = parseAreraCsv(csvText, cat);
    allErrors.push(...errors);

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
