"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { BollettaAnalysis, OffertaMercato } from "@/types/bolletta";
import { RISPARMIO_MINIMO_BANNER_EURO } from "@/lib/config/constants";
import { TEXTS } from "@/lib/config/texts";

interface BollettaReportProps {
  data: BollettaAnalysis;
  documentId: string;
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
              <Stat label="Media mercato/mese" value={fmt(confronto.media_mercato_mensile)} mono />
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
                    Stai pagando circa il {Math.abs(pct)}% in più della media di mercato sulla materia energia
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
            <>
              <h4 className="text-sm font-semibold text-[#0F172A] mb-3">
                {(confronto.percentuale_sopra_media ?? 0) < -5
                  ? "Confronto con altre offerte"
                  : TEXTS.analysis.suggestedOffers}
              </h4>
              {!confronto.stima_affidabile && (
                <p className="text-xs text-[#94A3B8] mb-2">
                  * Stima basata solo sulla componente variabile — quota fissa non disponibile per alcune offerte
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="text-left text-xs text-[#64748B] font-medium pb-2 pr-3">Offerta</th>
                      <th className="text-right text-xs text-[#64748B] font-medium pb-2 pr-3">{unitaLabel}</th>
                      <th className="text-right text-xs text-[#64748B] font-medium pb-2 pr-3">Quota fissa</th>
                      <th className="text-right text-xs text-[#64748B] font-medium pb-2 pr-3">Energia/mese</th>
                      <th className="text-right text-xs text-[#64748B] font-medium pb-2 pr-3">Risparmio/mese</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {confronto.offerte.map((offerta: OffertaMercato, i: number) => (
                      <tr key={i} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F7F9FC]">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            {i === 0 && (
                              <span className="text-xs bg-[#10B981] text-white px-1.5 py-0.5 rounded font-medium whitespace-nowrap">★ Migliore</span>
                            )}
                            <div>
                              <p className="font-medium text-[#0F172A]">{offerta.provider}</p>
                              <p className="text-xs text-[#64748B]">{offerta.plan_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-right font-mono text-[#0F172A]">
                          {fmtKwh(offerta.prezzo_kwh)}
                        </td>
                        <td className="py-3 pr-3 text-right font-mono">
                          {offerta.quota_fissa_mensile === null
                            ? <span className="text-[#94A3B8]">N/D</span>
                            : offerta.quota_fissa_mensile === 0
                              ? <span className="text-[#10B981] font-semibold">0 €/mese</span>
                              : <span className="text-[#64748B]">{fmt(offerta.quota_fissa_mensile, 0)}/mese</span>
                          }
                        </td>
                        <td className="py-3 pr-3 text-right font-mono text-[#0F172A]">
                          {offerta.costo_mensile_stimato !== null
                            ? <>{fmt(offerta.costo_mensile_stimato)}{!offerta.stima_completa && <span className="text-[#94A3B8]">*</span>}</>
                            : <span className="text-[#94A3B8]">—</span>
                          }
                        </td>
                        <td className="py-3 pr-3 text-right font-mono">
                          {offerta.risparmio_mensile !== null
                            ? (() => {
                                const isMoreExpensive = offerta.risparmio_mensile < 0;
                                return (
                                  <span className={isMoreExpensive ? "text-[#EF4444]" : offerta.risparmio_mensile > 0 ? "text-[#10B981] font-semibold" : "text-[#64748B]"}>
                                    {isMoreExpensive
                                      ? `+${fmt(Math.abs(offerta.risparmio_mensile))}/mese`
                                      : `-${fmt(offerta.risparmio_mensile)}/mese`
                                    }
                                  </span>
                                );
                              })()
                            : <span className="text-[#94A3B8]">—</span>
                          }
                        </td>
                        <td className="py-3 text-right">
                          {offerta.url ? (
                            <a
                              href={offerta.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[#1B4FD8] font-medium whitespace-nowrap hover:underline"
                            >
                              Vedi offerta →
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#64748B] mt-2">
                * Solo componente materia energia. Esclude rete, oneri, accise e IVA.
              </p>

              {confronto.arera_prezzo_kwh && (
                <p className="text-xs text-[#94A3B8] mt-3">
                  Riferimento ARERA (tutela vulnerabili): {fmtKwh(confronto.arera_prezzo_kwh)} {unitaLabel}
                </p>
              )}
            </>
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

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[#64748B] uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-semibold text-[#0F172A] ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
