import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";
import { SCRAPING_TARGETS } from "@/lib/config/constants";

interface ScrapedRate {
  category: string;
  provider: string;
  planName: string;
  priceValue: number;
  priceUnit: string;
  url: string;
}

async function scrapeUrl(url: string): Promise<string> {
  const scraperUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPERAPI_KEY}&url=${encodeURIComponent(url)}`;
  const res = await fetch(scraperUrl, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} per ${url}`);
  return res.text();
}

function parseSorgenia(html: string, category: string): ScrapedRate[] {
  const $ = cheerio.load(html);
  const rates: ScrapedRate[] = [];

  $("[class*='offer'], [class*='piano'], [class*='offerta']").each((_, el) => {
    const nome = $(el).find("[class*='name'], [class*='title'], h2, h3").first().text().trim();
    const prezzoText = $(el).find("[class*='price'], [class*='prezzo']").first().text().trim();
    const priceMatch = prezzoText.match(/(\d+[.,]\d+)/);
    if (nome && priceMatch) {
      rates.push({
        category,
        provider: "Sorgenia",
        planName: nome,
        priceValue: parseFloat(priceMatch[1].replace(",", ".")),
        priceUnit: category === "gas" ? "€/Smc" : "€/kWh",
        url: "https://www.sorgenia.it/offerte",
      });
    }
  });

  return rates;
}

function parseIllumia(html: string, category: string): ScrapedRate[] {
  const $ = cheerio.load(html);
  const rates: ScrapedRate[] = [];

  $("[class*='offer'], [class*='card'], article").each((_, el) => {
    const nome = $(el).find("h2, h3, [class*='title']").first().text().trim();
    const prezzoText = $(el).find("[class*='price'], [class*='prezzo'], strong").first().text().trim();
    const priceMatch = prezzoText.match(/(\d+[.,]\d+)/);
    if (nome && priceMatch) {
      rates.push({
        category,
        provider: "Illumia",
        planName: nome,
        priceValue: parseFloat(priceMatch[1].replace(",", ".")),
        priceUnit: category === "gas" ? "€/Smc" : "€/kWh",
        url: "https://www.illumia.it/luce-e-gas",
      });
    }
  });

  return rates;
}

function parseSostariffe(html: string): ScrapedRate[] {
  const $ = cheerio.load(html);
  const rates: ScrapedRate[] = [];

  $("[class*='offer'], [class*='result'], [class*='piano']").each((_, el) => {
    const provider = $(el).find("[class*='operator'], [class*='provider'], img").attr("alt") ??
      $(el).find("[class*='name']").first().text().trim();
    const nome = $(el).find("[class*='plan'], h3, h4").first().text().trim();
    const prezzoText = $(el).find("[class*='price'], strong").first().text().trim();
    const priceMatch = prezzoText.match(/(\d+[.,]\d+)/);
    if (provider && nome && priceMatch) {
      rates.push({
        category: "internet",
        provider,
        planName: nome,
        priceValue: parseFloat(priceMatch[1].replace(",", ".")),
        priceUnit: "€/mese",
        url: "https://www.sostariffe.it/adsl-fibra/",
      });
    }
  });

  return rates;
}

async function scrapeCategory(category: string, urls: string[]): Promise<{ rates: ScrapedRate[]; errors: string[] }> {
  const rates: ScrapedRate[] = [];
  const errors: string[] = [];

  for (const url of urls) {
    try {
      const html = await scrapeUrl(url);
      let parsed: ScrapedRate[] = [];

      if (url.includes("sorgenia")) parsed = parseSorgenia(html, category);
      else if (url.includes("illumia")) parsed = parseIllumia(html, category);
      else if (url.includes("sostariffe")) parsed = parseSostariffe(html);

      rates.push(...parsed);
    } catch (err) {
      errors.push(`${url}: ${err instanceof Error ? err.message : "Errore"}`);
    }
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

  for (const [category, urls] of Object.entries(SCRAPING_TARGETS)) {
    const { rates, errors } = await scrapeCategory(category, urls);
    allErrors.push(...errors);

    for (const rate of rates) {
      try {
        const result = await prisma.marketRate.upsert({
          where: { provider_planName: { provider: rate.provider, planName: rate.planName } },
          update: {
            priceValue: rate.priceValue,
            priceUnit: rate.priceUnit,
            url: rate.url,
            scrapedAt: new Date(),
          },
          create: rate,
        });
        // Distingue insert da update basandosi sul scrapedAt
        if (result.scrapedAt.getTime() > Date.now() - 5000) inserted++;
        else updated++;
      } catch {
        allErrors.push(`Upsert fallito per ${rate.provider} / ${rate.planName}`);
      }
    }
  }

  return NextResponse.json({ updated, inserted, errors: allErrors });
}
