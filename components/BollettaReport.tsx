"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { BollettaAnalysis } from "@/types/bolletta";
import { RISPARMIO_MINIMO_BANNER_EURO } from "@/lib/config/constants";
import { TEXTS } from "@/lib/config/texts";

interface BollettaReportProps {
  data: BollettaAnalysis;
  documentId: string;
}

export default function BollettaReport({ data, documentId }: BollettaReportProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshMarket = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/refresh-market`, {
        method: "POST",
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      // non critico
    } finally {
      setRefreshing(false);
    }
  };
  const confronto = data.confronto_mercato;
  const risparmioBestOffer = confronto?.offerte_consigliate?.[0]?.risparmio_stimato ?? 0;
  const risparmiAnnuo = risparmioBestOffer * 12;
  const mostraBanner = confronto?.sta_pagando_troppo && risparmiAnnuo >= RISPARMIO_MINIMO_BANNER_EURO;

  return (
    <div className="space-y-6">
      {mostraBanner && (
        <div className="bg-[#10B981] rounded-xl p-6 text-white">
          <p className="text-sm font-medium uppercase tracking-wide opacity-80">{TEXTS.analysis.savingBanner}</p>
          <p className="font-mono text-4xl font-bold mt-1">
            {risparmiAnnuo.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm mt-1 opacity-80">{TEXTS.analysis.perYear}</p>
        </div>
      )}

      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Fornitore" value={data.fornitore} />
          <Stat label="Periodo" value={data.periodo} />
          <Stat label="Importo totale" value={data.importo_totale.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} mono />
          {data.scadenza && <Stat label="Scadenza" value={data.scadenza} />}
          {data.consumi && (
            <Stat label="Consumi" value={`${data.consumi.valore} ${data.consumi.unita}`} mono />
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-[#0F172A] mb-4">Voci in dettaglio</h3>
        <div className="space-y-3">
          {data.voci_dettaglio.map((voce, i) => (
            <div key={i} className="flex justify-between items-start gap-4 pb-3 border-b border-[#E2E8F0] last:border-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-[#0F172A]">{voce.nome}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{voce.spiegazione}</p>
              </div>
              <p className="font-mono text-sm font-semibold text-[#0F172A] whitespace-nowrap">
                {voce.importo.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {confronto && (
        <Card>
          <h3 className="font-semibold text-[#0F172A] mb-4">Confronto con il mercato</h3>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <Stat label="Paghi" value={confronto.prezzo_utente.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} mono />
            <Stat label="Media mercato" value={confronto.prezzo_medio_mercato.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} mono />
            <Stat label="Minimo mercato" value={confronto.prezzo_minimo_mercato.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} mono />
          </div>

          <div className={`rounded-lg px-4 py-3 mb-4 ${confronto.sta_pagando_troppo ? "bg-red-50" : "bg-green-50"}`}>
            <p className={`text-sm font-medium ${confronto.sta_pagando_troppo ? "text-red-700" : "text-green-700"}`}>
              {confronto.sta_pagando_troppo
                ? TEXTS.analysis.payingTooMuch.replace("{pct}", Math.abs(confronto.differenza_percentuale).toString())
                : TEXTS.analysis.goodDeal}
            </p>
          </div>

          {confronto.offerte_consigliate.length > 0 && (
            <>
              <h4 className="text-sm font-semibold text-[#0F172A] mb-3">{TEXTS.analysis.suggestedOffers}</h4>
              <div className="space-y-2">
                {confronto.offerte_consigliate.map((offerta, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-[#E2E8F0] hover:bg-[#F7F9FC]">
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{offerta.provider}</p>
                      <p className="text-xs text-[#64748B]">{offerta.piano}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-[#0F172A]">
                        {offerta.prezzo.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                      </p>
                      {offerta.risparmio_stimato > 0 && (
                        <p className="text-xs text-[#10B981] font-medium">
                          -{offerta.risparmio_stimato.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}/mese
                        </p>
                      )}
                    </div>
                    {offerta.url && (
                      <a
                        href={offerta.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#1B4FD8] font-medium whitespace-nowrap hover:underline"
                      >
                        {TEXTS.analysis.switchNow} →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {!confronto && (
        <Card>
          <p className="text-sm text-[#64748B]">{TEXTS.analysis.noMarketData}</p>
        </Card>
      )}

      <div className="text-center pt-2">
        <button
          onClick={handleRefreshMarket}
          disabled={refreshing}
          className="text-sm text-[#64748B] hover:text-[#1B4FD8] underline disabled:opacity-50"
        >
          {refreshing ? "Aggiornamento..." : "Aggiorna confronto mercato"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-semibold text-[#0F172A] ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
