// ARERA Open Data Mercato Libero (XML) — aggiornato 2026-06-29
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ARERA_ML_BASE, INDICI_MERCATO } from "@/lib/config/constants";

interface ScrapedRate {
  category: string;
  provider: string;
  planName: string;
  priceValue: number;
  priceUnit: string;
  monthlyFee: number;
  url: string;
}

// Module-level cache to avoid re-searching within the same process lifetime
const xmlCache: Record<string, { content: string; foundAt: number }> = {};
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Returns XML text directly to avoid a second network call for download
async function findLatestAreraFile(cat: 'E' | 'G'): Promise<string> {
  const cached = xmlCache[cat];
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
    const url = `${ARERA_ML_BASE}/${year}_${month}/PO_Offerte_${cat}_MLIBERO_${dateStr}.xml`;

    try {
      let res = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (!res.ok && process.env.SCRAPERAPI_KEY) {
        const scraperUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPERAPI_KEY}&url=${encodeURIComponent(url)}`;
        res = await fetch(scraperUrl, { signal: AbortSignal.timeout(20000) });
      }

      if (res.ok) {
        const text = await res.text();
        if (text.includes('<offerta>')) {
          xmlCache[cat] = { content: text, foundAt: Date.now() };
          return text;
        }
      }
    } catch {
      // try next date
    }
  }

  throw new Error(`Nessun file ARERA ML trovato per categoria ${cat} negli ultimi 30 giorni`);
}

function parseAreraXml(xmlText: string, category: 'luce' | 'gas'): ScrapedRate[] {
  const { PUN, PSV } = INDICI_MERCATO;
  const indice = category === 'luce' ? PUN : PSV;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rates: ScrapedRate[] = [];

  const blocks = xmlText.split('</offerta>');

  for (const raw of blocks) {
    const start = raw.indexOf('<offerta>');
    if (start === -1) continue;
    const block = raw.slice(start);

    // Filter: only domestic customers
    const tipoCliente = block.match(/<TIPO_CLIENTE>(\d+)<\/TIPO_CLIENTE>/)?.[1];
    if (tipoCliente !== '01') continue;

    // Filter: skip expired offers (DATA_FINE format: "DD/MM/YYYY_HH:MM:SS")
    const dataFineStr = block.match(/<DATA_FINE>(.*?)<\/DATA_FINE>/)?.[1];
    if (dataFineStr) {
      const datePart = dataFineStr.split('_')[0];
      const [dd, mm, yyyy] = datePart.split('/');
      if (new Date(`${yyyy}-${mm}-${dd}`) < today) continue;
    }

    const tipoOfferta = block.match(/<TIPO_OFFERTA>(\d+)<\/TIPO_OFFERTA>/)?.[1] ?? '02';
    const nomeOfferta = block.match(/<NOME_OFFERTA>(.*?)<\/NOME_OFFERTA>/)?.[1]?.trim();
    if (!nomeOfferta) continue;

    const urlOfferta = block.match(/<URL_OFFERTA>(.*?)<\/URL_OFFERTA>/)?.[1]?.trim() ?? '';
    const urlSito = block.match(/<URL_SITO_VENDITORE>(.*?)<\/URL_SITO_VENDITORE>/)?.[1]?.trim() ?? '';
    const url = urlOfferta.startsWith('http') ? urlOfferta : urlSito;

    // Derive provider name from site URL domain
    const provider = urlSito
      .replace(/https?:\/\/(www\.)?/, '')
      .replace(/[\/.].*$/, '') ||
      block.match(/<PIVA_UTENTE>(.*?)<\/PIVA_UTENTE>/)?.[1] ||
      'sconosciuto';

    const compBlocks = [...block.matchAll(/<ComponenteImpresa>([\s\S]*?)<\/ComponenteImpresa>/g)];

    let priceValue: number | null = null;
    let monthlyFee = 0;

    for (const comp of compBlocks) {
      const cb = comp[1];
      const macroarea = cb.match(/<MACROAREA>(\d+)<\/MACROAREA>/)?.[1];
      const nome = cb.match(/<NOME>(.*?)<\/NOME>/)?.[1]?.toUpperCase().trim() ?? '';
      const prezzo = parseFloat(cb.match(/<PREZZO>([\d.]+)<\/PREZZO>/)?.[1] ?? '');
      if (isNaN(prezzo)) continue;

      if (macroarea === '01') {
        // Fixed annual fee → monthly
        monthlyFee = prezzo / 12;
      }

      if (tipoOfferta === '01' && macroarea === '04' && priceValue === null) {
        // Fixed offer: direct price in €/kWh or €/Smc
        priceValue = prezzo;
      }

      if (tipoOfferta === '02' && nome === 'SPREAD' && priceValue === null) {
        // Variable offer: current index + spread
        priceValue = indice + prezzo;
      }
    }

    if (priceValue === null || priceValue <= 0) continue;

    rates.push({
      category,
      provider,
      planName: nomeOfferta,
      priceValue,
      priceUnit: category === 'gas' ? '€/Smc' : '€/kWh',
      monthlyFee,
      url,
    });
  }

  return rates;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.JOBS_SECRET}`) {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  }

  let inserted = 0;
  let updated = 0;
  const allErrors: string[] = [];

  // TODO: fonte internet da definire
  const jobs = [['E', 'luce'], ['G', 'gas']] as const;

  for (const [cat, category] of jobs) {
    try {
      const xmlText = await findLatestAreraFile(cat);
      const rates = parseAreraXml(xmlText, category);

      if (rates.length === 0) {
        allErrors.push(`[WARN] Nessuna offerta domestica estratta per ${category}`);
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
          allErrors.push(`Upsert fallito: ${rate.provider} / ${rate.planName}`);
        }
      }
    } catch (err) {
      allErrors.push(err instanceof Error ? err.message : `Errore categoria ${category}`);
    }
  }

  return NextResponse.json({ updated, inserted, errors: allErrors });
}
