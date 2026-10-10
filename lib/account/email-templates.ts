// Email di servizio dell'account. Nessun dato oltre all'indirizzo strettamente necessario.
import { renderEmailLayout, type RenderedEmail } from "../notifications/templates.ts";

const FOOTER = "Ricevi questa comunicazione di servizio perché è legata a un account Veredoc. Non è un messaggio promozionale.";
const IGNORE_NOTE = "Se non hai richiesto tu questa operazione, ignora questa email: il tuo account resta invariato.";

export function accountUrl(baseUrl: string, path: string, token?: string): string {
  const url = new URL(path, baseUrl);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

export function renderVerifyEmail(input: { baseUrl: string; token: string }): RenderedEmail {
  return renderEmailLayout({
    subject: "Conferma il tuo indirizzo email",
    preheader: "Un clic per confermare l'indirizzo del tuo account Veredoc.",
    title: "Conferma il tuo indirizzo email",
    paragraphs: [
      "Ciao,",
      "conferma che questo indirizzo appartiene a te: così potremo avvisarti quando le tue analisi sono pronte e aiutarti a recuperare l'accesso.",
      "Il link è valido per 24 ore.",
    ],
    cta: { label: "Conferma email →", url: accountUrl(input.baseUrl, "/verify-email", input.token) },
    securityNote: IGNORE_NOTE,
    footerNote: FOOTER,
  });
}

export function renderChangeEmailConfirm(input: { baseUrl: string; token: string; newEmail: string }): RenderedEmail {
  return renderEmailLayout({
    subject: "Conferma il nuovo indirizzo email",
    preheader: "Conferma per usare questo indirizzo con il tuo account Veredoc.",
    title: "Conferma il nuovo indirizzo",
    paragraphs: [
      "Ciao,",
      "è stato richiesto di usare questo indirizzo per accedere a Veredoc. Conferma per completare la modifica.",
      "Il link è valido per 24 ore.",
    ],
    infoBox: { label: "Nuovo indirizzo", value: input.newEmail },
    cta: { label: "Conferma nuovo indirizzo →", url: accountUrl(input.baseUrl, "/verify-email", input.token) + "&type=change" },
    securityNote: IGNORE_NOTE,
    footerNote: FOOTER,
  });
}

export function renderChangeEmailNotice(input: { baseUrl: string }): RenderedEmail {
  return renderEmailLayout({
    subject: "Richiesta di modifica dell'email del tuo account",
    preheader: "È stata richiesta la modifica dell'indirizzo email del tuo account Veredoc.",
    title: "Richiesta di modifica dell'email",
    paragraphs: [
      "Ciao,",
      "è stata richiesta la modifica dell'indirizzo email del tuo account Veredoc. La modifica diventa effettiva solo quando viene confermata dal nuovo indirizzo.",
      "Se non sei stato tu, cambia subito la password dalla pagina Account.",
    ],
    cta: { label: "Vai al tuo account →", url: accountUrl(input.baseUrl, "/account") },
    securityNote: "Per sicurezza non indichiamo in questa email il nuovo indirizzo richiesto.",
    footerNote: FOOTER,
  });
}

export function renderExistingAccountNotice(input: { baseUrl: string }): RenderedEmail {
  return renderEmailLayout({
    subject: "Hai già un account Veredoc",
    preheader: "È stata tentata una nuova registrazione con questo indirizzo.",
    title: "Hai già un account Veredoc",
    paragraphs: [
      "Ciao,",
      "qualcuno ha provato a registrarsi su Veredoc con questo indirizzo, che è già associato a un account.",
      "Se eri tu, puoi accedere oppure reimpostare la password.",
    ],
    cta: { label: "Accedi a Veredoc →", url: accountUrl(input.baseUrl, "/login") },
    securityNote: "Se non sei stato tu, ignora questa email: nessuna modifica è stata fatta al tuo account.",
    footerNote: FOOTER,
  });
}

export function renderAccountDeletedNotice(): RenderedEmail {
  return renderEmailLayout({
    subject: "Il tuo account Veredoc è stato eliminato",
    preheader: "Abbiamo eliminato il tuo account e i documenti associati.",
    title: "Account eliminato",
    paragraphs: [
      "Ciao,",
      "come richiesto, abbiamo eliminato il tuo account Veredoc insieme ai documenti caricati e alle analisi.",
      "Eventuali copie nei backup tecnici vengono eliminate entro 30 giorni.",
    ],
    securityNote: "Se non hai richiesto tu l'eliminazione, scrivi subito a privacy@veredoc.it.",
    footerNote: "Questa è l'ultima comunicazione di servizio relativa al tuo account.",
  });
}
