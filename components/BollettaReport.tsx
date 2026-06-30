"use client";

import { useState, useRef, useEffect } from "react";
import Card from "@/components/ui/Card";
import { BollettaAnalysis, OffertaMercato } from "@/types/bolletta";
import { RISPARMIO_MINIMO_BANNER_EURO } from "@/lib/config/constants";
import { TEXTS } from "@/lib/config/texts";
import { getProviderDisplay } from "@/lib/utils/provider";

interface BollettaReportProps {
  data: BollettaAnalysis;
  documentId: string;
}

function formatScadenza(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const mesi = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  const d = new Date(dateStr);
  return `${d.getDate()} ${mesi[d.getMonth()]}`;
}

function fmt(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "—";
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtKwh(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("it-IT", { minimumFractionDigits: 3, maximumFractionDigits: 5 });
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
  const risparmiAnnuo = confronto?.miglior_risparmio_annuo ?? 0;
  const mostraBanner = confronto?.miglior_risparmio_mensile !== null &&
    (confronto?.miglior_risparmio_mensile ?? 0) > 0 &&
    risparmiAnnuo > 0 &&
    risparmiAnnuo >= RISPARMIO_MINIMO_BANNER_EURO;

  const unitaConsumi = data.consumi?.unita?.toUpperCase() ?? 'KWH';
  const unitaLabel = unitaConsumi === 'SMC' ? '€/Smc' : '€/kWh';

  // Calcola percentuale negoziabile
  const materiaEur = data.materia_energia?.totale_eur ?? 0;
  const totale = data.importo_totale ?? 0;
  const canoRai = data.altro?.canone_rai_eur ?? 0;
  const baseConfronto = totale - canoRai;
  const pctNegoziabile = baseConfronto > 0 ? Math.round((materiaEur / baseConfronto) * 100) : null;

  const haBreakdown = materiaEur > 0 || (data.rete_e_oneri?.totale_eur ?? 0) > 0;

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

      {/* Riepilogo principale */}
      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Fornitore" value={data.fornitore} />
          <Stat label="Periodo" value={data.periodo} />
          <Stat label="Importo totale" value={fmt(data.importo_totale)} mono />
          {data.scadenza && <Stat label="Scadenza" value={data.scadenza} />}
          {data.consumi && (
            <Stat label="Consumi" value={`${data.consumi.valore} ${data.consumi.unita}`} mono />
          )}
          {data.consumi?.mensile_stimato && (
            <Stat label="Consumi/mese (stimati)" value={`${data.consumi.mensile_stimato} ${data.consumi.unita}`} mono />
          )}
          {data.offerta_nome && <Stat label="Offerta" value={data.offerta_nome} />}
          {data.potenza_impegnata_kw && (
            <Stat label="Potenza impegnata" value={`${data.potenza_impegnata_kw} kW`} mono />
          )}
        </div>
      </Card>

      {/* Breakdown cosa puoi negoziare */}
      {haBreakdown && (
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F7F9FC] p-5">
          <h3 className="font-semibold text-[#0F172A] mb-4">Cosa puoi negoziare cambiando fornitore</h3>

          {/* Materia energia */}
          {materiaEur > 0 && (
            <div className="mb-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-[#0F172A]">Materia energia</span>
                <span className="font-mono text-sm font-bold text-[#0F172A]">{fmt(materiaEur)}</span>
              </div>
              {data.materia_energia?.quota_variabile_eur !== null && data.materia_energia?.quota_variabile_eur !== undefined && (
                <div className="flex justify-between items-baseline mt-1 pl-4">
                  <span className="text-xs text-[#64748B]">
                    ├─ Quota variabile
                    {data.consumi?.valore && data.materia_energia?.quota_variabile_prezzo_kwh
                      ? ` (${data.consumi.valore} ${data.consumi.unita} × ${fmtKwh(data.materia_energia.quota_variabile_prezzo_kwh)} ${unitaLabel})`
                      : ""}
                  </span>
                  <span className="font-mono text-xs text-[#64748B]">{fmt(data.materia_energia.quota_variabile_eur)}</span>
                </div>
              )}
              {data.materia_energia?.quota_fissa_eur !== null && data.materia_energia?.quota_fissa_eur !== undefined && (
                <div className="flex justify-between items-baseline mt-1 pl-4">
                  <span className="text-xs text-[#64748B]">
                    └─ Quota fissa mensile
                    {data.materia_energia?.quota_fissa_mensile_eur
                      ? ` (${fmt(data.materia_energia.quota_fissa_mensile_eur)}/mese)`
                      : ""}
                  </span>
                  <span className="font-mono text-xs text-[#64748B]">{fmt(data.materia_energia.quota_fissa_eur)}</span>
                </div>
              )}
            </div>
          )}

          {/* Costi fissi di sistema */}
          {(data.rete_e_oneri?.totale_eur ?? 0) + (data.imposte?.totale_eur ?? 0) > 0 && (
            <div className="mb-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-[#64748B]">Costi fissi di sistema <span className="font-normal text-xs">(uguali per tutti)</span></span>
                <span className="font-mono text-sm font-semibold text-[#64748B]">
                  {fmt((data.rete_e_oneri?.totale_eur ?? 0) + (data.imposte?.totale_eur ?? 0))}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] pl-4 mt-0.5">rete, oneri, potenza, accise, IVA</p>
            </div>
          )}

          {/* Altro */}
          {canoRai > 0 && (
            <div className="mb-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-[#64748B]">Altro <span className="font-normal text-xs">(canone RAI, ecc.)</span></span>
                <span className="font-mono text-sm font-semibold text-[#64748B]">{fmt(canoRai + (data.altro?.altri_eur ?? 0))}</span>
              </div>
            </div>
          )}

          {pctNegoziabile !== null && (
            <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
              <p className="text-sm font-medium text-[#1B4FD8]">
                ▸ Il {pctNegoziabile}% della tua bolletta è negoziabile cambiando fornitore
              </p>
            </div>
          )}
        </div>
      )}

      {/* Voci in dettaglio */}
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
                {fmt(voce.importo)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Confronto mercato */}
      {confronto && confronto.prezzo_kwh_attuale !== null && (
        <Card>
          <h3 className="font-semibold text-[#0F172A] mb-4">Confronto con il mercato</h3>

          {/* Metriche sommario */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-4">
            {confronto.costo_materia_mensile_attuale !== null && (
              <Stat label="Materia energia/mese" value={fmt(confronto.costo_materia_mensile_attuale)} mono />
            )}
            {confronto.media_mercato_mensile !== null && (
              <Stat label="Media top 10 offerte/mese" value={fmt(confronto.media_mercato_mensile)} mono />
            )}
            {confronto.minimo_mercato_mensile !== null && (
              <Stat label="Minimo mercato/mese" value={fmt(confronto.minimo_mercato_mensile)} mono />
            )}
            {confronto.kwh_mese_stimati !== null && (
              <Stat label={`${unitaConsumi}/mese stimati`} value={`${confronto.kwh_mese_stimati}`} mono />
            )}
          </div>

          {/* Indicatore */}
          {confronto.percentuale_sopra_media !== null && (() => {
            const pct = confronto.percentuale_sopra_media;
            if (pct > 5) {
              return (
                <div className="rounded-lg px-4 py-3 mb-4 bg-red-50">
                  <p className="text-sm font-medium text-red-700">
                    Stai pagando circa il {Math.abs(pct)}% in più della media delle migliori offerte sulla materia energia
                  </p>
                </div>
              );
            }
            if (pct < -5) {
              return (
                <div className="rounded-lg px-4 py-3 mb-4" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                  <p className="text-sm font-medium" style={{ color: '#166534' }}>
                    Ottimo — la tua offerta attuale è già sotto la media di mercato del {Math.abs(pct)}%.
                  </p>
                </div>
              );
            }
            return (
              <div className="rounded-lg px-4 py-3 mb-4 bg-yellow-50">
                <p className="text-sm font-medium text-yellow-700">
                  {TEXTS.analysis.goodDeal}
                </p>
              </div>
            );
          })()}

          {/* Break-even insight */}
          {confronto.offerte.length >= 2 && (() => {
            const migliore = confronto.offerte[0];
            const minKwh = [...confronto.offerte].sort((a, b) => a.prezzo_kwh - b.prezzo_kwh)[0];
            if (minKwh && migliore && minKwh.provider !== migliore.provider && minKwh.break_even_kwh !== null) {
              return (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 mb-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>{minKwh.provider}</strong> ha il prezzo più basso ({fmtKwh(minKwh.prezzo_kwh)} {unitaLabel})
                    {minKwh.quota_fissa_mensile ? ` ma con quota fissa di ${fmt(minKwh.quota_fissa_mensile, 0)}/mese` : ""}.
                    {confronto.kwh_mese_stimati && (
                      <> Con i tuoi {confronto.kwh_mese_stimati} {unitaConsumi} mensili, <strong>{migliore.provider}</strong> ti conviene di più.
                      {minKwh.break_even_kwh !== null && (
                        <> {minKwh.provider} diventerebbe conveniente oltre {minKwh.break_even_kwh} {unitaConsumi}/mese.</>
                      )}</>
                    )}
                  </p>
                </div>
              );
            }
            return null;
          })()}

          {/* Tabella offerte */}
          {confronto.offerte.length > 0 && (
            <OfferteSection
              offerte={confronto.offerte}
              unitaLabel={unitaLabel}
              stimaAffidabile={confronto.stima_affidabile}
              percentualeSopraMedia={confronto.percentuale_sopra_media}
              areraPrezzo={confronto.arera_prezzo_kwh}
            />
          )}
        </Card>
      )}

      {/* Nessun confronto disponibile */}
      {(!confronto || confronto.prezzo_kwh_attuale === null) && (
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

type FiltroTipo = "tutte" | "fisso" | "variabile";

interface OfferteSectionProps {
  offerte: OffertaMercato[];
  unitaLabel: string;
  stimaAffidabile: boolean;
  percentualeSopraMedia: number | null;
  areraPrezzo: number | null;
}

function OfferteSection({ offerte, unitaLabel, stimaAffidabile, percentualeSopraMedia, areraPrezzo }: OfferteSectionProps) {
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("tutte");
  const [visibleCount, setVisibleCount] = useState(5);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const offerteFiltrate = filtroTipo === "tutte"
    ? offerte
    : offerte.filter((o) => o.tipo_offerta === filtroTipo);

  // Reset scroll quando cambia il filtro
  useEffect(() => {
    setVisibleCount(5);
  }, [filtroTipo]);

  // IntersectionObserver per infinite scroll mobile
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 5, offerteFiltrate.length));
        }
      },
      { threshold: 0.1 }
    );
    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [offerteFiltrate.length]);

  const offerteVisibili = offerteFiltrate.slice(0, visibleCount);
  const hasTutti = offerte.some((o) => o.tipo_offerta === "fisso") && offerte.some((o) => o.tipo_offerta === "variabile");

  return (
    <>
      <h4 className="text-sm font-semibold text-[#0F172A] mb-3">
        {(percentualeSopraMedia ?? 0) < -5
          ? "Confronto con altre offerte"
          : TEXTS.analysis.suggestedOffers}
      </h4>
      {!stimaAffidabile && (
        <p className="text-xs text-[#94A3B8] mb-2">
          * Stima basata solo sulla componente variabile — quota fissa non disponibile per alcune offerte
        </p>
      )}

      {/* Filtro tipo offerta */}
      {hasTutti && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {(["tutte", "fisso", "variabile"] as FiltroTipo[]).map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`text-xs px-3 py-1 rounded-full border font-medium capitalize transition-colors ${
                filtroTipo === tipo
                  ? "bg-[#1B4FD8] border-[#1B4FD8] text-white"
                  : "bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#1B4FD8] hover:text-[#1B4FD8]"
              }`}
            >
              {tipo === "tutte" ? "Tutte" : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
            </button>
          ))}
        </div>
      )}

      {offerteFiltrate.length === 0 && (
        <p className="text-sm text-[#94A3B8] mb-4">Nessuna offerta disponibile per questo filtro.</p>
      )}

      {/* Griglia card unica — mobile colonna singola, desktop 2 colonne */}
      {offerteFiltrate.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {offerteVisibili.map((offerta, i) => {
            const isMoreExpensive = (offerta.risparmio_mensile ?? 0) < 0;
            const hasRisparmio = offerta.risparmio_mensile !== null && offerta.risparmio_mensile > 0;
            const display = getProviderDisplay(offerta.provider);

            const inner = (
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  {i === 0 && (
                    <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-[#ECFDF5] text-[#10B981] mb-1.5">
                      ★ Migliore
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      style={{ width: 36, height: 36, borderRadius: 8, background: display.colore, flexShrink: 0 }}
                      className="flex items-center justify-center"
                    >
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{display.iniziali}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[#0F172A] text-[15px] m-0 leading-snug">{display.nome}</p>
                      <p className="text-[13px] text-[#64748B] m-0 leading-snug">{offerta.plan_name}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {offerta.tipo_offerta && (
                      <span className="text-[12px] text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full capitalize">
                        {offerta.tipo_offerta}{offerta.durata_mesi ? ` · ${offerta.durata_mesi} mesi` : ""}
                      </span>
                    )}
                    <span className="text-[12px] text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full font-mono">
                      {fmtKwh(offerta.prezzo_kwh)} {unitaLabel}
                    </span>
                    {offerta.quota_fissa_mensile !== null && (
                      <span className="text-[12px] text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full font-mono">
                        {offerta.quota_fissa_mensile === 0 ? "0 €/mese fissi" : `${fmt(offerta.quota_fissa_mensile, 0)}/mese fissi`}
                      </span>
                    )}
                    {offerta.offerta_fine && (
                      <span className="text-[12px] text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                        Scade {formatScadenza(offerta.offerta_fine)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[12px] text-[#64748B] m-0 mb-0.5">Energia/mese</p>
                  <p className="text-[15px] text-[#0F172A] m-0 mb-2 font-mono">
                    {offerta.costo_mensile_stimato !== null
                      ? <>{fmt(offerta.costo_mensile_stimato)}{!offerta.stima_completa && <span className="text-[#94A3B8]">*</span>}</>
                      : "—"
                    }
                  </p>
                  {offerta.risparmio_mensile !== null && (
                    <p className={`text-[15px] font-medium m-0 whitespace-nowrap ${
                      isMoreExpensive ? "text-[#EF4444]" : hasRisparmio ? "text-[#10B981]" : "text-[#64748B]"
                    }`}>
                      {isMoreExpensive
                        ? `+${fmt(Math.abs(offerta.risparmio_mensile))}/mese`
                        : hasRisparmio
                          ? `-${fmt(offerta.risparmio_mensile)}/mese`
                          : "uguale"
                      }
                    </p>
                  )}
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 mt-1 text-[#94A3B8]"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            );

            return offerta.url ? (
              <a
                key={i}
                href={offerta.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block no-underline text-inherit border border-[#E2E8F0] rounded-xl p-4 hover:border-[#CBD5E1] transition-colors"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {inner}
              </a>
            ) : (
              <div
                key={i}
                className="border border-[#E2E8F0] rounded-xl p-4"
              >
                {inner}
              </div>
            );
          })}
        </div>
      )}

      {/* Sentinella infinite scroll */}
      {offerteFiltrate.length > 0 && visibleCount < offerteFiltrate.length && (
        <div ref={sentinelRef} className="h-4 mt-1" />
      )}

      <p className="text-xs text-[#64748B] mt-2">
        * Solo componente materia energia. Esclude rete, oneri, accise e IVA.
      </p>
      {areraPrezzo && (
        <p className="text-xs text-[#94A3B8] mt-3">
          Riferimento ARERA (tutela vulnerabili): {fmtKwh(areraPrezzo)} {unitaLabel}
        </p>
      )}
    </>
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
