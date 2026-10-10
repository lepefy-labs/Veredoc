import { prisma } from "@/lib/prisma";
import { BollettaRaw, BollettaAnalysis, ConfrontoMercato, OffertaMercato } from "@/types/bolletta";
import { isOfferCurrentlyValid, validOfferWhere } from "@/lib/parsers/market-offers";

async function getOfferteBilanciate(category: string, limit = 20, now = new Date()) {
  const latest = await prisma.marketRate.aggregate({
    where: { category },
    _max: { scrapedAt: true },
  });
  const aggiornatoAl = latest._max.scrapedAt;
  if (!aggiornatoAl) return { offerte: [] as MarketRateRow[], aggiornatoAl: null };

  const valid = validOfferWhere(category, aggiornatoAl, now);
  const half = Math.ceil(limit / 2);

  const [fisse, variabili] = await Promise.all([
    prisma.marketRate.findMany({
      where: { ...valid, tipoOfferta: "fisso" },
      orderBy: { priceValue: "asc" },
      take: half,
    }),
    prisma.marketRate.findMany({
      where: { ...valid, tipoOfferta: "variabile" },
      orderBy: { priceValue: "asc" },
      take: half,
    }),
  ]);

  const combined = [...fisse, ...variabili];
  const mancanti = limit - combined.length;

  if (mancanti > 0) {
    const usedIds = combined.map((o) => o.id);
    const extra = await prisma.marketRate.findMany({
      where: { ...valid, id: { notIn: usedIds } },
      orderBy: { priceValue: "asc" },
      take: mancanti,
    });
    combined.push(...extra);
  }

  const offerte = combined
    .filter((offerta) => isOfferCurrentlyValid(offerta, aggiornatoAl, now))
    .sort((a, b) => a.priceValue - b.priceValue)
    .slice(0, limit);

  return { offerte, aggiornatoAl };
}

interface MarketRateRow {
  id: string;
  category: string;
  provider: string;
  planName: string;
  priceValue: number;
  priceUnit: string;
  monthlyFee: number | null;
  url: string | null;
  scrapedAt: Date;
  tipoOfferta: string | null;
  durataEsclusive: number | null;
  offertaFine: Date | null;
}

export async function arricchisciConFrontoMercato(
  rawExtracted: BollettaRaw
): Promise<BollettaAnalysis> {
  const categoria = rawExtracted.tipo;
  const kwh_mese = rawExtracted.consumi?.mensile_stimato ?? null;
  const prezzo_kwh_pagato = rawExtracted.materia_energia?.quota_variabile_prezzo_kwh ?? null;
  const quota_fissa_mensile_pagata = rawExtracted.materia_energia?.quota_fissa_mensile_eur ?? 0;

  const costo_materia_mensile_pagato =
    prezzo_kwh_pagato !== null && kwh_mese !== null
      ? (prezzo_kwh_pagato * kwh_mese) + quota_fissa_mensile_pagata
      : null;

  // Se non abbiamo il prezzo al kWh non possiamo fare confronto sensato
  if (prezzo_kwh_pagato === null) {
    return { ...rawExtracted, confronto_mercato: null };
  }

  const { offerte: tariffe, aggiornatoAl } = await getOfferteBilanciate(categoria, 20);

  if (tariffe.length === 0) {
    return { ...rawExtracted, confronto_mercato: null };
  }

  const offerteSenzaBreakEven = tariffe
    .filter((t: MarketRateRow) => t.provider !== "ARERA")
    .map((tariffa: MarketRateRow) => {
      const costo_mensile_offerta =
        costo_materia_mensile_pagato !== null && kwh_mese !== null
          ? (tariffa.priceValue * kwh_mese) + ((tariffa.monthlyFee ?? quota_fissa_mensile_pagata))
          : null;

      const risparmio_mensile =
        costo_materia_mensile_pagato !== null && costo_mensile_offerta !== null
          ? costo_materia_mensile_pagato - costo_mensile_offerta
          : null;

      const stima_completa = tariffa.monthlyFee !== null;

      return {
        provider: tariffa.provider,
        plan_name: tariffa.planName,
        prezzo_kwh: tariffa.priceValue,
        quota_fissa_mensile: tariffa.monthlyFee,
        costo_mensile_stimato: costo_mensile_offerta !== null ? Math.round(costo_mensile_offerta * 100) / 100 : null,
        risparmio_mensile: risparmio_mensile !== null ? Math.round(risparmio_mensile * 100) / 100 : null,
        risparmio_annuo: risparmio_mensile !== null ? Math.round(risparmio_mensile * 12 * 100) / 100 : null,
        break_even_kwh: null as number | null,
        stima_completa,
        url: tariffa.url ?? null,
        tipo_offerta: tariffa.tipoOfferta ?? null,
        durata_mesi: tariffa.durataEsclusive ?? null,
        offerta_fine: tariffa.offertaFine ? tariffa.offertaFine.toISOString() : null,
      };
    })
    .sort((a, b) => {
      if (a.costo_mensile_stimato !== null && b.costo_mensile_stimato !== null) {
        return a.costo_mensile_stimato - b.costo_mensile_stimato;
      }
      return a.prezzo_kwh - b.prezzo_kwh;
    });

  // break_even_kwh è una proprietà delle due offerte, NON del consumo dell'utente.
  // Per ogni offerta A con quota fissa > 0 e prezzo unitario più basso della migliore offerta B:
  //   break_even = (feeA - feeB) / (priceB - priceA)
  const bestOffer = offerteSenzaBreakEven[0] ?? null;
  const offerte: OffertaMercato[] = offerteSenzaBreakEven.map((offerta) => {
    if (!bestOffer || offerta.provider === bestOffer.provider) {
      return offerta;
    }
    const feeA = offerta.quota_fissa_mensile ?? 0;
    const feeB = bestOffer.quota_fissa_mensile ?? 0;
    const priceA = offerta.prezzo_kwh;
    const priceB = bestOffer.prezzo_kwh;
    // Break-even esiste solo se A ha quota fissa maggiore e prezzo unitario minore di B
    const break_even_kwh =
      feeA > feeB && priceA < priceB
        ? Math.round((feeA - feeB) / (priceB - priceA))
        : null;
    return { ...offerta, break_even_kwh };
  });

  const arera = tariffe.find((t: MarketRateRow) => t.provider === "ARERA");

  const offerte_con_dati = offerte.filter((o) => o.costo_mensile_stimato !== null);
  // Media calcolata sulle 10 offerte più economiche (per costo mensile stimato)
  const top10 = offerte_con_dati.slice(0, 10);
  const media_mercato_mensile =
    top10.length > 0
      ? top10.reduce((sum, o) => sum + o.costo_mensile_stimato!, 0) / top10.length
      : null;

  const minimo_mercato_mensile =
    offerte_con_dati.length > 0
      ? Math.min(...offerte_con_dati.map((o) => o.costo_mensile_stimato!))
      : null;

  const percentuale_sopra_media =
    costo_materia_mensile_pagato !== null && media_mercato_mensile !== null
      ? Math.round(((costo_materia_mensile_pagato - media_mercato_mensile) / media_mercato_mensile) * 100)
      : null;

  const confronto_mercato: ConfrontoMercato = {
    costo_materia_mensile_attuale: costo_materia_mensile_pagato !== null
      ? Math.round(costo_materia_mensile_pagato * 100) / 100
      : null,
    prezzo_kwh_attuale: prezzo_kwh_pagato,
    quota_fissa_mensile_attuale: quota_fissa_mensile_pagata,
    kwh_mese_stimati: kwh_mese,
    media_mercato_mensile: media_mercato_mensile !== null ? Math.round(media_mercato_mensile * 100) / 100 : null,
    minimo_mercato_mensile: minimo_mercato_mensile !== null ? Math.round(minimo_mercato_mensile * 100) / 100 : null,
    percentuale_sopra_media,
    miglior_risparmio_mensile: offerte[0]?.risparmio_mensile ?? null,
    miglior_risparmio_annuo: offerte[0]?.risparmio_annuo ?? null,
    arera_prezzo_kwh: arera?.priceValue ?? null,
    offerte: offerte.slice(0, 20),
    stima_affidabile: offerte.slice(0, 3).every((o) => o.stima_completa),
    offerte_aggiornate_al: aggiornatoAl ? aggiornatoAl.toISOString() : null,
  };

  return { ...rawExtracted, confronto_mercato };
}
