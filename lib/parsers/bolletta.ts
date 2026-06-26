import { prisma } from "@/lib/prisma";
import { BollettaRaw, BollettaAnalysis, ConfrontoMercato, OffertaMercato } from "@/types/bolletta";

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

  const tariffe = (await prisma.marketRate.findMany({
    where: { category: categoria },
    orderBy: { priceValue: "asc" },
  })) as MarketRateRow[];

  if (tariffe.length === 0) {
    return { ...rawExtracted, confronto_mercato: null };
  }

  const offerte: OffertaMercato[] = tariffe
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

      const diffPrezzoKwh = prezzo_kwh_pagato - tariffa.priceValue;
      const break_even_kwh =
        tariffa.monthlyFee !== null && tariffa.monthlyFee > 0 && diffPrezzoKwh > 0.001
          ? Math.round(tariffa.monthlyFee / diffPrezzoKwh)
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
        break_even_kwh,
        stima_completa,
        url: tariffa.url ?? null,
      };
    })
    .sort((a: OffertaMercato, b: OffertaMercato) => {
      if (a.costo_mensile_stimato !== null && b.costo_mensile_stimato !== null) {
        return a.costo_mensile_stimato - b.costo_mensile_stimato;
      }
      return a.prezzo_kwh - b.prezzo_kwh;
    });

  const arera = tariffe.find((t: MarketRateRow) => t.provider === "ARERA");

  const offerte_con_dati = offerte.filter((o) => o.costo_mensile_stimato !== null);
  const media_mercato_mensile =
    offerte_con_dati.length > 0
      ? offerte_con_dati.reduce((sum, o) => sum + o.costo_mensile_stimato!, 0) / offerte_con_dati.length
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
    offerte: offerte.slice(0, 5),
    stima_affidabile: offerte.slice(0, 3).every((o) => o.stima_completa),
  };

  return { ...rawExtracted, confronto_mercato };
}
