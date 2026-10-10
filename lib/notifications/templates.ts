// Template delle email transazionali dell'analisi.
//
// Regole di privacy: le email contengono solo la categoria generica del documento,
// lo stato e un link all'area autenticata. Nessun dato estratto, importo, nominativo,
// codice fiscale, POD, indirizzo o nome file originale.

import type { NotificationEventType } from "./events.ts";

export type DocumentKind = "BOLLETTA_LUCE" | "BOLLETTA_GAS" | "BOLLETTA_INTERNET" | "BUSTA_PAGA";

const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  BOLLETTA_LUCE: "Bolletta luce",
  BOLLETTA_GAS: "Bolletta gas",
  BOLLETTA_INTERNET: "Bolletta internet",
  BUSTA_PAGA: "Busta paga",
};

// Prima del completamento il tipo è solo un'ipotesi dal nome file: si usa "Documento".
export function documentLabel(eventType: NotificationEventType, type: string | null | undefined): string {
  if (eventType !== "ANALYSIS_COMPLETED" || !type) return "Documento";
  return DOCUMENT_LABELS[type as DocumentKind] ?? "Documento";
}

export function buildDocumentUrl(baseUrl: string, documentId: string): string {
  const url = new URL("/analyze", baseUrl);
  url.searchParams.set("id", documentId);
  return url.toString();
}

interface EmailCopy {
  subject: string;
  preheader: string;
  title: string;
  paragraphs: string[];
  status: { label: string; color: string; background: string };
  cta: string;
}

const COPY: Record<NotificationEventType, EmailCopy> = {
  ANALYSIS_DELAYED: {
    subject: "Stiamo ancora analizzando il tuo documento",
    preheader: "Il tuo documento è stato ricevuto: ti avviseremo quando il risultato sarà disponibile.",
    title: "Stiamo ancora analizzando il tuo documento",
    paragraphs: [
      "Ciao,",
      "il tuo documento è stato ricevuto correttamente e stiamo completando l'analisi.",
      "Non devi fare nulla: puoi tornare alle tue attività.",
      "Ti avviseremo non appena il risultato sarà disponibile.",
    ],
    status: { label: "Analisi in corso", color: "#1640B0", background: "#EFF4FF" },
    cta: "Segui lo stato dell'analisi →",
  },
  ANALYSIS_COMPLETED: {
    subject: "La tua analisi è pronta!",
    preheader: "Abbiamo completato l'analisi del tuo documento.",
    title: "La tua analisi è pronta.",
    paragraphs: [
      "Abbiamo completato l'analisi del tuo documento.",
      "Accedi a Veredoc per consultare i risultati e scoprire le informazioni più importanti.",
    ],
    status: { label: "Analisi completata", color: "#047857", background: "#ECFDF5" },
    cta: "Visualizza la tua analisi →",
  },
  ANALYSIS_FAILED: {
    subject: "Non siamo riusciti a completare la tua analisi",
    preheader: "Puoi accedere a Veredoc per verificare lo stato del documento.",
    title: "Non siamo riusciti a completare la tua analisi",
    paragraphs: [
      "Non siamo riusciti a completare l'analisi del tuo documento.",
      "Puoi accedere a Veredoc per verificare lo stato e riprovare, quando disponibile.",
    ],
    status: { label: "Analisi non completata", color: "#B91C1C", background: "#FEF2F2" },
    cta: "Torna al documento →",
  },
};

const SECURITY_NOTE =
  "Per proteggere i tuoi dati, questa email non contiene informazioni tratte dal documento. Il risultato è visibile solo dopo l'accesso al tuo account Veredoc.";
const FOOTER_NOTE =
  "Ricevi questa comunicazione di servizio perché hai caricato un documento su Veredoc. Non è un messaggio promozionale.";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface AnalysisEmailInput {
  eventType: NotificationEventType;
  documentType: string | null | undefined;
  documentId: string;
  baseUrl: string;
}

export interface RenderedEmail {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface EmailLayoutInput {
  subject: string;
  preheader: string;
  title: string;
  paragraphs: string[];
  infoBox?: { label: string; value: string; status?: { label: string; color: string; background: string } };
  cta?: { label: string; url: string };
  securityNote: string;
  footerNote: string;
}

// Layout comune delle email di servizio: tabelle, CSS inline, max 600 px, variante testo.
export function renderEmailLayout(input: EmailLayoutInput): RenderedEmail {
  const year = new Date().getUTCFullYear();
  const font = "font-family:Inter,'Segoe UI',Helvetica,Arial,sans-serif;";

  const textContent = [
    input.title,
    "",
    ...input.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(input.infoBox
      ? [`${input.infoBox.label}: ${input.infoBox.value}`, ...(input.infoBox.status ? [`Stato: ${input.infoBox.status.label}`] : []), ""]
      : []),
    ...(input.cta ? [`${input.cta.label.replace(" →", "")}: ${input.cta.url}`, ""] : []),
    input.securityNote,
    "",
    "Il team Veredoc",
    "",
    "—",
    input.footerNote,
    `© ${year} Veredoc · veredoc.it`,
  ].join("\n");

  const paragraphsHtml = input.paragraphs
    .map((paragraph) => `<p style="margin:0 0 14px;${font}font-size:16px;line-height:24px;color:#334155;">${escapeHtml(paragraph)}</p>`)
    .join("\n");

  const infoBoxHtml = input.infoBox ? `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px;background-color:#F7F9FC;border:1px solid #E2E8F0;border-radius:10px;">
<tr>
<td style="padding:14px 16px;${font}">
<div style="font-size:12px;line-height:16px;color:#64748B;text-transform:uppercase;letter-spacing:0.6px;">${escapeHtml(input.infoBox.label)}</div>
<div style="font-size:16px;line-height:24px;font-weight:600;color:#0F172A;word-break:break-all;">${escapeHtml(input.infoBox.value)}</div>
</td>${input.infoBox.status ? `
<td align="right" style="padding:14px 16px;${font}">
<span style="display:inline-block;padding:6px 12px;border-radius:999px;background-color:${input.infoBox.status.background};color:${input.infoBox.status.color};font-size:13px;line-height:18px;font-weight:600;white-space:nowrap;">${escapeHtml(input.infoBox.status.label)}</span>
</td>` : ""}
</tr>
</table>` : "";

  const href = input.cta ? escapeHtml(input.cta.url) : "";
  const ctaHtml = input.cta ? `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
<tr><td align="center" bgcolor="#1B4FD8" style="border-radius:8px;">
<a href="${href}" target="_blank" style="display:inline-block;padding:14px 26px;${font}font-size:16px;line-height:20px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:#1B4FD8;">${escapeHtml(input.cta.label)}</a>
</td></tr>
</table>
<p style="margin:0 0 6px;${font}font-size:13px;line-height:20px;color:#64748B;">Se il pulsante non funziona, copia questo indirizzo nel browser:</p>
<p style="margin:0 0 20px;${font}font-size:13px;line-height:20px;word-break:break-all;"><a href="${href}" style="color:#1B4FD8;text-decoration:underline;">${href}</a></p>` : "";

  const htmlContent = `<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F9FC;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F7F9FC;">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F7F9FC;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
<tr><td style="padding:0 8px 16px;${font}font-size:26px;font-weight:800;letter-spacing:-0.5px;">
<span style="color:#1B4FD8;">vere</span><span style="color:#10B981;">doc</span>
</td></tr>
<tr><td style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:32px 28px;">
<h1 style="margin:0 0 18px;${font}font-size:24px;line-height:32px;font-weight:700;color:#0F172A;">${escapeHtml(input.title)}</h1>
${paragraphsHtml}${infoBoxHtml}${ctaHtml}
<p style="margin:0;padding-top:16px;border-top:1px solid #E2E8F0;${font}font-size:13px;line-height:20px;color:#64748B;">&#128274; ${escapeHtml(input.securityNote)}</p>
<p style="margin:16px 0 0;${font}font-size:15px;line-height:22px;color:#334155;">Il team Veredoc</p>
</td></tr>
<tr><td style="padding:20px 8px 0;${font}font-size:12px;line-height:18px;color:#94A3B8;text-align:center;">
${escapeHtml(input.footerNote)}<br>&copy; ${year} Veredoc &middot; <a href="https://www.veredoc.it" style="color:#94A3B8;">veredoc.it</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject: input.subject, htmlContent, textContent };
}

export function renderAnalysisEmail(input: AnalysisEmailInput): RenderedEmail {
  const copy = COPY[input.eventType];
  return renderEmailLayout({
    subject: copy.subject,
    preheader: copy.preheader,
    title: copy.title,
    paragraphs: copy.paragraphs,
    infoBox: { label: "Documento", value: documentLabel(input.eventType, input.documentType), status: copy.status },
    cta: { label: copy.cta, url: buildDocumentUrl(input.baseUrl, input.documentId) },
    securityNote: SECURITY_NOTE,
    footerNote: FOOTER_NOTE,
  });
}
