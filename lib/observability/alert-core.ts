// Avvisi operativi via email (logica pura, testabile).
//
// Attivi solo con OPS_ALERT_EMAIL. Ogni tipo di evento invia al massimo un'email all'ora
// (rate limit su Postgres, quindi valido tra istanze serverless). I campi inclusi sono quelli
// già presenti nei log operativi: identificativi, codici e conteggi, mai contenuti dei documenti.

import { renderEmailLayout, type RenderedEmail } from "../notifications/templates.ts";

export const ALERT_WINDOW_SECONDS = 60 * 60;

// Errori attesi o già coperti da un evento più significativo.
const IGNORED_EVENTS = new Set([
  // Un file illeggibile o un tentativo fallito sono normali; i tentativi esauriti hanno il loro evento.
  "analysis.failed",
]);

export function shouldAlert(event: string): boolean {
  return !IGNORED_EVENTS.has(event);
}

export type AlertFields = Record<string, string | number | boolean | null | undefined>;

export function renderOpsAlert(input: { event: string; fields: AlertFields; occurredAt: Date; environment: string }): RenderedEmail {
  const details = Object.entries(input.fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 20)
    .map(([key, value]) => `${key}: ${String(value).slice(0, 300)}`);
  return renderEmailLayout({
    subject: `[Veredoc] Errore: ${input.event}`,
    preheader: `Evento ${input.event} registrato in ${input.environment}.`,
    title: `Errore operativo: ${input.event}`,
    paragraphs: [
      `Ambiente: ${input.environment} · ${input.occurredAt.toISOString()}`,
      ...(details.length ? details : ["Nessun dettaglio aggiuntivo."]),
      "Altri eventi dello stesso tipo nella prossima ora non generano nuove email: controlla i log Vercel per il quadro completo.",
    ],
    securityNote: "Avviso tecnico automatico: contiene solo identificativi e codici di errore.",
    footerNote: "Inviato perché OPS_ALERT_EMAIL è configurata per questo progetto.",
  });
}
