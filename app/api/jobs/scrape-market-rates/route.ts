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

const ARERA_BASE =
  'https://www.ilportaleofferte.it/portaleOfferte/resources/opendata/csv/offerte';

// Module-level cache to avoid re-searching within the same process lifetime
const csvCache: Record<string, { content: string; foundAt: number }> = {};
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Returns CSV text content directly (avoids a second network call for download)
async function findLatestAreraFile(cat: 'E' | 'G'): Promise<string> {
  const cached = csvCache[cat];
  if (cached && Date.now() - cached.foundAt < CACHE_TTL_MS) {
    return cached.content;
  }

  const today = new Date();

  for (let daysBack = 0; daysBack <= 30; daysBack++) {
    const d = new Date(today);
    d.setDate(today.getDate() - daysBack);

    const year = d.getFullYear();
    const month = d.getMonth() + 1; // no padding: 2026_5 not 2026_05
    const dateStr =
      `${year}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const fileUrl = `${ARERA_BASE}/${year}_${month}/PO_Offerte_${cat}_PLACET_${dateStr}.csv`;

    try {
      // Try direct fetch first (faster); fall back to ScraperAPI on 403/block
      let res = await fetch(fileUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok && process.env.SCRAPERAPI_KEY) {
        const proxied = `http://api.scraperapi.com?api_key=${process.env.SCRAPERAPI_KEY}&url=${encodeURIComponent(fileUrl)}`;
        res = await fetch(proxied, { signal: AbortSignal.timeout(20000) });
      }
      if (res.ok) {
        const text = await res.text();
        if (text.includes('denominazione,')) {
          csvCache[cat] = { content: text, foundAt: Date.now() };
          return text;
        }
      }
    } catch {
      // try next date
    }
  }

  throw new Error(`Nessun file ARERA trovato per categoria ${cat} negli ultimi 30 giorni`);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
    else current += char;
  }
  result.push(current);
  return result;
}

function parseAreraCsv(csvText: string, category: 'luce' | 'gas'): ScrapedRate[] {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].split(',');
  const rates: ScrapedRate[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => { row[h.trim()] = (cols[idx] ?? '').trim(); });

    if (row.tipo_cliente !== 'domestico') continue;

    if (!row.data_fine) continue;
    const parts = row.data_fine.split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      if (new Date(`${yyyy}-${mm}-${dd}`) < today) continue;
    }

    // luce uses p_vol_mono; gas uses p_vol (different column schema)
    const priceRaw = category === 'luce' ? row.p_vol_mono : row.p_vol;
    if (!priceRaw) continue;
    const priceValue = parseFloat(priceRaw);
    if (isNaN(priceValue) || priceValue === 0) continue;

    const fixedFee = parseFloat(row.p_fix_f || row.p_fix_v || '0') || 0;

    rates.push({
      category,
      provider: row.denominazione ?? '',
      planName: row.nome_offerta ?? '',
      priceValue,
      priceUnit: category === 'gas' ? '€/Smc' : '€/kWh',
      monthlyFee: fixedFee / 12,
      url: row.url_offerta?.startsWith('http') ? row.url_offerta : (row.url_sito_venditore ?? ''),
    });
  }

  return rates;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.JOBS_SECRET}`) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  let inserted = 0;
  let updated = 0;
  const allErrors: string[] = [];

  // TODO: fonte internet da definire
  const jobs: Array<{ cat: 'E' | 'G'; label: 'luce' | 'gas' }> = [
    { cat: 'E', label: 'luce' },
    { cat: 'G', label: 'gas' },
  ];

  for (const { cat, label } of jobs) {
    let csvText: string;
    try {
      csvText = await findLatestAreraFile(cat);
    } catch (err) {
      allErrors.push(err instanceof Error ? err.message : `Errore ricerca file ${cat}`);
      continue;
    }

    const rates = parseAreraCsv(csvText, label);

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
