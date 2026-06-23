import { prisma } from "@/lib/prisma";
import { BollettaData, BollettaAnalysis, ConfrontoMercato, OffertaConsigliata } from "@/types/bolletta";
import {
  SOGLIA_PAGAMENTO_ECCESSIVO_PERCENTUALE,
  NUM_OFFERTE_CONSIGLIATE,
} from "@/lib/config/constants";

export async function arricchisciConFrontoMercato(
  bolletta: BollettaData
): Promise<BollettaAnalysis> {
  const categoria = bolletta.tipo;

  const tariffe = await prisma.marketRate.findMany({
    where: { category: categoria },
    orderBy: { priceValue: "asc" },
  });

  if (tariffe.length === 0) {
    return { ...bolletta, confronto_mercato: null };
  }

  const prezzoUtente = bolletta.importo_totale;
  const valori = tariffe.map((t) => t.priceValue);
  const prezzoMedio = valori.reduce((a, b) => a + b, 0) / valori.length;
  const prezzoMinimo = valori[0];

  const differenzaPercentuale = ((prezzoUtente - prezzoMedio) / prezzoMedio) * 100;
  const staPagandoTroppo = differenzaPercentuale > SOGLIA_PAGAMENTO_ECCESSIVO_PERCENTUALE;

  const offerte: OffertaConsigliata[] = tariffe
    .slice(0, NUM_OFFERTE_CONSIGLIATE)
    .map((t) => ({
      provider: t.provider,
      piano: t.planName,
      prezzo: t.priceValue,
      url: t.url ?? "",
      risparmio_stimato: Math.max(0, prezzoUtente - t.priceValue),
    }));

  const confronto_mercato: ConfrontoMercato = {
    prezzo_utente: prezzoUtente,
    prezzo_medio_mercato: Math.round(prezzoMedio * 100) / 100,
    prezzo_minimo_mercato: prezzoMinimo,
    differenza_percentuale: Math.round(differenzaPercentuale * 10) / 10,
    sta_pagando_troppo: staPagandoTroppo,
    offerte_consigliate: offerte,
  };

  return { ...bolletta, confronto_mercato };
}
