# CONTEXT.md — Veredoc

> Aggiornato: 2026-10-11 — dashboard leggera, avvisi operativi, test end-to-end; ciclo di vita account (verifica e cambio email, esportazione, eliminazione, sessioni), spazio account e sicurezza credenziali, notifiche email transazionali dell'analisi (outbox), lifecycle analisi affidabile (lease con token, checkpoint estrazione, recovery), PWA, profili, trend e payroll intelligence v2

---

## Cos'è Veredoc

Veredoc è un SaaS italiano che analizza bollette (luce, gas, internet) e buste paga tramite AI. L'utente carica PDF/JPG/PNG senza scegliere manualmente il tipo: Veredoc riconosce il documento, applica il flusso corretto e restituisce un risultato orientato all'azione.

- **Bollette:** lettura strutturata, confronto mercato, verdetto sintetico e azione consigliata.
- **Buste paga:** lettura strutturata, controlli deterministici di coerenza/anomalia, ferie/permessi/ROL, TFR e voci variabili quando esplicitamente presenti.
- **Profili di analisi:** uno stesso account può separare i documenti di persone, case/nuclei e attività diverse.
- **Storico intelligente:** i confronti longitudinali vengono calcolati esclusivamente tra documenti dello stesso profilo e dello stesso tipo.
- **Trend multi-periodo:** da 3 documenti comparabili in poi Veredoc aggiunge una lettura del periodo usando fino alle 4 analisi più recenti.
- **PWA:** il frontend è installabile su dispositivi compatibili con manifest, icone dedicate, service worker e una UX mobile dedicata.

I controlli payroll e longitudinali sono segnali di coerenza e variazione. Non costituiscono certificazione fiscale, consulenza del lavoro o verifica legale.

## Stack tecnico

| Layer | Tecnologia |
|---|---|
| Framework | Next.js 16.2.9 App Router |
| UI | React 19.2.4 + Tailwind CSS 4 |
| Language | TypeScript 5 |
| ORM | Prisma 7.8.0 |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Auth | NextAuth 5 beta + bcryptjs |
| AI | Anthropic Claude |
| Hosting | Vercel |
| CI | GitHub Actions |
| Scheduler | n8n |

---

## Modello profili

```text
User
  └── AnalysisProfile
        ├── label
        ├── kind: PERSON | HOUSEHOLD | BUSINESS
        ├── isDefault
        └── Document[]
```

Ogni `Document` conserva sia `userId` sia `profileId`.

Regole:
- ogni account ha un profilo default `Io`;
- la migrazione `002_analysis_profiles.sql` ha creato `Io` per gli account esistenti e assegnato i documenti preesistenti;
- un account può creare ulteriori profili senza raccogliere dati personali non necessari;
- un documento può essere spostato tra profili dello stesso account;
- una route di spostamento rifiuta profili appartenenti ad altri account;
- il profilo default viene usato per upload generici senza `profileId`;
- `/analyze` carica i profili dell'account, pre-seleziona il default e consente di scegliere esplicitamente per chi è il documento prima dell'upload;
- dalla dashboard ogni profilo espone una CTA `Carica per <profilo>`;
- da `/account` un profilo si rinomina; si elimina solo se non è il default e non ha documenti attivi (i documenti già eliminati, righe anonime, passano al profilo default).

La relazione `Document.profile` usa `RESTRICT` in cancellazione: eliminare un profilo non deve cancellare implicitamente documenti.

---

## Architettura principale

```text
app/
  manifest.ts                       manifest PWA
  account/                          spazio account: email, password, piano, profili, notifiche, privacy
  verify-email/                     conferma email da link (verifica o cambio)
  arrivederci/                      conferma dopo l'eliminazione dell'account
  analyze/                          upload auto-detect, selezione profilo esplicita
  dashboard/                        profili, quota, filtro profilo, storico e documenti
  api/
    account/password/               cambio password (richiede la password attuale, chiude le sessioni)
    account/email/                  richiesta cambio email (conferma dal nuovo indirizzo)
    account/verify-email/           conferma token (verifica/cambio) e reinvio verifica
    account/export/                 esportazione dati JSON
    account/delete/                 eliminazione account
    profiles/                       lista/creazione profili
    profiles/[id]/                  rinomina/eliminazione profilo
    documents/upload/               upload associato a profilo
    documents/[id]/profile/         spostamento documento tra profili
    documents/[id]/                 lettura/recovery/cancellazione
    documents/[id]/retry/           riprova manuale di un documento in ERROR
    documents/[id]/refresh-market/  refresh confronto mercato
    jobs/process-analysis/           recovery batch + recupero notifiche email
components/
  layout/MobileBottomNav.tsx        navigazione mobile autenticata
  pwa/PwaRegistration.tsx           registrazione service worker client-side
  pwa/PwaInstallCard.tsx            install prompt Android + istruzioni iOS
  FileUploader.tsx                  desktop drag/drop + mobile fotocamera/file picker
  ProfileManager.tsx
  ProfileSelector.tsx               selezione profilo prima dell'upload
  ProfileDashboard.tsx
  DocumentList.tsx
  HistoricalInsights.tsx
  BustaPagaReport.tsx               report anomaly-first + dati operativi payroll
lib/
  profiles/selection.ts
  insights/history.ts
  insights/trends.ts                trend bollette + payroll intelligence v2
  parsers/bustapaga.ts              payroll-coherence-v2
  ai/
  jobs/
  notifications/                    outbox, dispatcher, template email, config
  email.ts                          servizio Brevo centralizzato
  security/                         job secret, ownership, redirect post-login
public/
  sw.js                             service worker PWA
  offline.html                      fallback offline statico e senza dati account
  pwa/                              icone installazione
prisma/schema.prisma
supabase/migrations/002_analysis_profiles.sql
supabase/migrations/003_notification_outbox.sql
supabase/rls.sql
```

---

## Flusso upload

1. Utente autenticato.
2. `/analyze` carica i profili e risolve il profilo richiesto; un id assente o non valido ricade sul profilo default lato UI.
3. L'utente vede `Per chi è questo documento?` e può cambiare profilo prima dell'upload.
4. Su mobile l'utente può scegliere `Scatta foto` (fotocamera posteriore quando supportata) oppure `Scegli file`; su desktop resta disponibile drag & drop/file picker.
5. Piano e quota sono verificati prima dello Storage.
6. File validato tramite magic bytes/MIME e limite 10 MB.
7. Il backend accetta `profileId` solo se appartiene allo stesso `userId`; senza id usa il profilo default.
8. Il documento nasce `PENDING` con `userId + profileId`.
9. Claude esegue auto-detection one-pass di luce/gas/internet/busta paga.
10. Il worker parte in `after()`; lifecycle, retry e recovery sono descritti in "Lifecycle analisi".
11. La pagina mostra `Documento ricevuto!` e continua il polling. Se le notifiche sono attive (vedi "Notifiche email transazionali") l'utente può lasciare la pagina e riceve un'email a risultato pronto; l'upload non invia email.

La cattura da fotocamera usa il normale input file del browser con `capture="environment"`: non richiede permessi persistenti, API native o nuova business logic. La validazione server-side esistente resta la fonte di verità.

---

## Lifecycle analisi

Codice: `lib/jobs/process-document-core.ts` (logica, testabile), `lib/jobs/process-document.ts` (adapter Prisma/Storage/AI), `lib/jobs/analysis-sql.ts` (SQL condizionato).

```text
PENDING ──claim──▶ PROCESSING ──▶ DONE                       estrazione valida (+ confronto mercato o "non_disponibile")
                      │      ├──▶ ERROR documento_non_supportato
                      │      ├──▶ PENDING (retry)             errore transitorio, tentativi < 3
                      │      └──▶ ERROR <codice>              errore definitivo o 3° tentativo fallito
                      └─ lease scaduto (6 min) ──▶ recovery: nuovo claim, oppure ERROR attempts_exhausted
ERROR ──POST /api/documents/[id]/retry──▶ PENDING             solo proprietario, max 2, non per documenti non supportati
```

`DONE` è terminale per il worker: nessuna transizione verso `PENDING`/`PROCESSING`. Il confronto mercato dei documenti `DONE` viene aggiornato solo da `refresh-market(-rates)`.

### Lease

- Stato del job in `analysis._job`: `attempts`, `leaseId`, `phase`, `extracted`, `manualRetries`, `lastError`, `lastErrorCode`. Nessuna migrazione.
- Il claim è un singolo `UPDATE` atomico condizionato su stato, `attempts` attesi e scadenza del lease calcolata con `now()` del DB.
- Ogni scrittura del worker è condizionata su `status = PROCESSING`, `deletedAt IS NULL` e `analysis._job.leaseId` = token del worker.
- **Non usare `updatedAt` come compare-and-swap**: il trigger `Document_updatedAt_trigger` (`001_schema.sql`) lo riscrive a `NOW()` con microsecondi a ogni UPDATE. Fino al 2026-10-10 il lease usava `updatedAt`: ogni `complete`/`markFailure` aggiornava zero righe in silenzio e nessun documento poteva arrivare a `DONE` (ultimo DONE creato il 2026-07-03).
- Un aggiornamento a zero righe non è mai un successo: il worker rilegge il documento e registra `analysis.lease_lost` (`document_deleted`, `already_final`, `lease_taken`) oppure `analysis.persistence_unconfirmed` (caso inatteso, livello error).

### Fasi e retry

1. Download Storage → validazione magic bytes → Claude (timeout 110 s, 1 retry SDK).
2. Validazione runtime dell'output AI.
3. **Checkpoint**: estrazione validata salvata in `rawExtracted` con `_job.extracted = true`. I tentativi successivi la riutilizzano senza richiamare Claude.
4. Arricchimento: confronto mercato (bollette) o verifica deterministica (buste paga).
5. Persistenza finale `DONE`.

Massimo 3 tentativi automatici. Retry: errori Storage, provider AI, output AI non valido, verifica payroll, persistenza. Definitivi subito: file non valido, documento non supportato. Un errore del confronto mercato non invalida l'estrazione: il documento va in `DONE` con `confronto_mercato: null` e `confronto_mercato_stato: "non_disponibile"`; il job notturno lo ricalcola.

### Serverless e recovery

- `after()` vive al massimo `maxDuration` della route (300 s, Vercel Hobby + Fluid Compute, regione lhr1 Londra, la stessa del database Supabase eu-west-2). Può essere interrotto: per questo il lease (6 min) supera la durata massima e il recovery è indipendente dalla richiesta originale.
- Trigger del worker: upload (`after()`), `GET /api/documents/[id]` quando il documento è `PENDING` o con lease scaduto, retry manuale, job `POST /api/jobs/process-analysis`.
- Il job di recovery esegue anche, prima delle analisi, il recupero delle notifiche email (vedi "Notifiche email transazionali").
- Job di recovery: max 20 candidati, max 10 elaborazioni, nessuna nuova elaborazione dopo 60 s; chiude in `ERROR` i documenti con tentativi esauriti. Protetto da `JOBS_SECRET`.
- Scheduler: workflow n8n `scripts/n8n/analysis-recovery.workflow.json` ogni 5 minuti (istruzioni in `scripts/README-n8n.md`). Vercel Cron su Hobby è limitato a un'esecuzione giornaliera e non è usato.

### Ciclo di analisi

Un ciclo comprende l'upload (ciclo `0`) e ogni riprova manuale (ciclo = `_job.manualRetries`); i retry automatici restano nello stesso ciclo. La riprova manuale salva `_job.cycleStartedAt`; per il ciclo `0` l'inizio è `createdAt`. Il ciclo identifica le notifiche (`eventKey`).

### UX stati

Dashboard: `In coda`, `Analisi in corso`, `Completato`, `Errore analisi`. Dettaglio: coda, analisi in corso, nuovo tentativo automatico (n di 3), messaggio dopo 90 s, polling 3 s per 2 minuti poi 10 s, stop dopo 10 minuti con `Controlla di nuovo`. In `ERROR` il proprietario può usare `Riprova l'analisi` (nessun nuovo documento, nessun consumo di quota). I documenti legacy `AWAITING_CONFIRMATION` non mostrano più uno spinner infinito.

### Eventi di log

`analysis.queued`, `analysis.claimed`, `analysis.recovered`, `storage.document_download_completed`, `ai.analysis_completed`, `analysis.validation_completed`, `analysis.extraction_reused`, `analysis.enrichment_completed`, `analysis.enrichment_failed`, `analysis.completed`, `analysis.unsupported`, `analysis.retry_scheduled`, `analysis.failed`, `analysis.attempts_exhausted`, `analysis.lease_lost`, `analysis.persistence_unconfirmed`, `analysis.worker_crashed`, `analysis.manual_retry`, `job.process_analysis.completed`.

Notifiche: `notification.sent`, `notification.retry_scheduled`, `notification.cancelled`, `notification.failed`, `notification.lease_recovered`, `notification.lease_lost`, `notification.dispatch_crashed`, `notification.inline_dispatch`, `notification.inline_dispatch_failed`, `job.process_notifications.completed|failed` (passo notifiche del job di recovery). Contengono `notificationId`, `documentId`, `eventType`, `attempt`, `errorCode`: mai indirizzi email o testo delle email.

Ogni evento del worker contiene `documentId` e `attempt`; gli errori `phase`, `errorCode`, `retryable`. Non vengono registrati contenuti del documento, testo AI o segreti (anche i `SyntaxError` di parsing JSON sono sostituiti da un messaggio generico).

### Diagnosi di un documento bloccato

1. Vercel Logs (Hobby: retention 1 ora) → cerca il `documentId`: l'ultimo evento indica la fase.
2. Supabase SQL editor (sola lettura):
   ```sql
   select id, status, "updatedAt", analysis->'_job' as job, "rawExtracted" is not null as has_extraction
   from "Document" where id = '<id>';
   ```
3. Interpretazione: `PROCESSING` con `updatedAt` recente = in lavorazione; `PROCESSING` oltre 6 minuti = worker interrotto, recuperabile; `PENDING` con `attempts > 0` = retry in attesa; `ERROR` con `error = attempts_exhausted` o altro codice = definitivo; `_job.extracted = true` = estrazione già salvata, il recovery non richiama Claude.

### Recupero manuale sicuro

Non modificare righe a mano. Chiamare il job (idempotente, claim atomico):

```bash
curl -X POST https://www.veredoc.it/api/jobs/process-analysis -H "Authorization: Bearer $JOBS_SECRET"
```

In alternativa il proprietario apre il documento: la `GET` avvia il recovery. Per un documento in `ERROR`: `Riprova l'analisi` dalla UI.

---

## Notifiche email transazionali

Obiettivo: l'utente può lasciare la pagina dopo l'upload e viene avvisato via email. Le notifiche sono solo di servizio (nessun tracking o marketing) e non influiscono mai sull'analisi.

### Eventi

| Evento | Quando | Oggetto | CTA |
|---|---|---|---|
| `ANALYSIS_DELAYED` | documento ancora `PENDING`/`PROCESSING` ≥ soglia (default 60 s) dall'inizio del ciclo; max 1 per ciclo; solo cicli iniziati da < 30 min | Stiamo ancora analizzando il tuo documento | Segui lo stato dell'analisi |
| `ANALYSIS_COMPLETED` | transizione a `DONE` | La tua analisi è pronta! | Visualizza la tua analisi |
| `ANALYSIS_FAILED` | transizione definitiva a `ERROR` (errore definitivo, tentativi esauriti, documento non supportato); mai sui retry transitori | Non siamo riusciti a completare la tua analisi | Torna al documento |

Nessuna email all'upload. CTA → `<APP_BASE_URL>/analyze?id=<documentId>`: senza sessione il middleware reindirizza a `/login?callbackUrl=…` e dopo il login l'utente torna al report (`lib/security/redirect.ts` accetta solo percorsi interni `/analyze` e `/dashboard`). Nessun token nei link: valgono i normali controlli di ownership.

### Transactional outbox

Tabella `NotificationOutbox` (`003_notification_outbox.sql`): `id` (UUID v4, usato come idempotencyKey Brevo), `userId`, `documentId`, `eventType`, `eventKey` UNIQUE (`<evento>:<documentId>:<ciclo>`), `analysisCycle`, `status` (`PENDING`, `SENDING`, `SENT`, `FAILED`, `CANCELLED`), `attempts`, `nextAttemptAt`, `leaseId`, `leaseExpiresAt`, `lastSendStartedAt`, `ambiguousSince`, `sentAt`, `lastErrorCode`, `providerMessageId`. L'indirizzo email non viene copiato: è letto da `User` al momento dell'invio. Cascade su utente/documento; RLS attiva senza policy (solo server).

- `ANALYSIS_COMPLETED`/`ANALYSIS_FAILED` sono inseriti nella **stessa istruzione SQL** della transizione del documento (`withOutboxEventSql`: CTE `UPDATE … RETURNING` + `INSERT … ON CONFLICT DO NOTHING`). Lease perso → nessuna transizione e nessun evento. Documenti caricati da oltre 48 ore (ciclo 0) chiusi dal recovery non generano email: nessuna notifica retroattiva.
- `ANALYSIS_DELAYED` è accodato dal job con un unico `INSERT … SELECT` idempotente.

### Dispatcher

Codice: `lib/notifications/dispatcher-core.ts` (logica), `dispatcher.ts` (adapter Prisma/Brevo), `notification-sql.ts`.

1. Claim atomico a batch (20 righe, `FOR UPDATE SKIP LOCKED`), lease 3 min con token, concorrenza 4.
2. Ricontrollo immediatamente prima dell'invio: documento esistente e non eliminato, stato coerente con l'evento (`DELAYED` solo se ancora in elaborazione, `COMPLETED` solo `DONE`, `FAILED` solo `ERROR`), stesso ciclo, email valida. Altrimenti `CANCELLED` con motivo.
3. Invio con `idempotencyKey = id riga`; esito registrato con scritture condizionate al lease.
4. Errori: `429`/`401`/`403` → retry con backoff (1, 2, 5, 10, 30, 60, 120 min; un 429 rimanda il resto del batch); altri `4xx` → `FAILED`; timeout, rete, `5xx` → **ambigui**: retry dopo 60 s con la stessa chiave; max 8 tentativi.
5. Lease scaduto → la riga torna reclamabile; se l'invio era già partito (`lastSendStartedAt`) l'esito è trattato come ambiguo.

Nessuno scheduler dedicato: le email partono chiamando Brevo direttamente dal server.

- **Completamento / errore definitivo:** subito dopo il worker, in `processDocumentAnalysisAndNotify` (upload, GET documento, retry manuale e job di recovery), solo per il documento appena chiuso.
- **Avviso di attesa:** all'upload e alla riprova manuale un timer (`lib/notifications/delayed-notice.ts`) parte nello stesso `after()` del worker (`maxDuration` 300 s). Allo scadere della soglia (+1 s) accoda l'avviso per quel documento, solo se ancora `PENDING`/`PROCESSING` (verifica SQL), e lo invia. Analisi conclusa prima della soglia → timer annullato. Worker terminato con retry in coda → si attende comunque la soglia.
- **Recupero:** `POST /api/jobs/process-analysis` (n8n ogni 5 minuti, `JOBS_SECRET`), prima delle analisi, accoda gli avvisi di attesa persi (funzione interrotta, cicli iniziati da < 30 min), ritenta gli invii dovuti (batch 10) ed elimina le righe chiuse da oltre 90 giorni. Il risultato è nel campo `notifications` della risposta (solo contatori). Senza questo workflow attivo i retry dopo un errore Brevo o un'interruzione restano in coda.

### Idempotenza Brevo e limiti

Brevo accetta `headers.idempotencyKey` (UUID) su `/v3/smtp/email` e rifiuta una seconda richiesta con la stessa chiave (`duplicate_parameter`, trattato come `SENT` deduplicato). La validità della chiave è documentata tra 15 e 30 minuti. Strategia: i retry ambigui avvengono solo entro **10 minuti** dal primo esito ambiguo; oltre, la riga va in `FAILED` con `delivery_unconfirmed` senza reinviare. Garanzia risultante: nessun duplicato logico (vincolo UNIQUE) e nessun doppio invio fisico entro la finestra; nel raro caso di esito ambiguo non risolto si preferisce una email mancata a un duplicato.

### Servizio email

`lib/email.ts`: `sendTransactionalEmail` (unico punto HTTP verso Brevo; timeout 10 s; `textContent`; classificazione esiti; `messageId`). Mittente `Veredoc <noreply@veredoc.it>`. Il reset password usa lo stesso servizio con contenuto invariato. I log non contengono indirizzi, contenuti o corpi di risposta del provider.

### Template

`lib/notifications/templates.ts`: HTML a tabelle con CSS inline, max 600 px, wordmark testuale, riquadro tipo documento + stato, CTA, nota sicurezza, footer di servizio; variante testo. Solo categorie generiche (`Bolletta luce/gas/internet`, `Busta paga`, `Documento`; prima del completamento sempre `Documento`). Nessun dato estratto, importo, nominativo, codice fiscale, POD, indirizzo o nome file.

### UX

Durante l'attesa `AnalysisResult` mostra `Documento ricevuto! Stiamo elaborando la tua analisi.` e continua il polling. Il messaggio promette l'email solo se `emailNotification` (da `GET /api/documents/[id]` e dall'upload) è `true`: notifiche attive, `BREVO_API_KEY` presente e email dell'account valida; altrimenti rimanda alla dashboard.

### Configurazione e attivazione

| Variabile | Default | Note |
|---|---|---|
| `NOTIFICATIONS_ENABLED` | `false` | interruttore principale; con `false` nessuna lettura/scrittura della tabella |
| `NOTIFICATION_DELAYED_ENABLED` | `true` | avviso di attesa prolungata |
| `NOTIFICATION_DELAYED_THRESHOLD_SECONDS` | `60` | ammessi 15–900 |
| `APP_BASE_URL` | `NEXTAUTH_URL` se https, poi `https://www.veredoc.it` | base dei link email; mai dagli header |
| `BREVO_API_KEY` | — | richiesta per l'invio |

Attivazione: (1) eseguire `003_notification_outbox.sql` nel Supabase SQL Editor; (2) `NOTIFICATIONS_ENABLED=true` su Vercel e redeploy; (3) per i retry, assicurarsi che il workflow n8n di recovery `scripts/n8n/analysis-recovery.workflow.json` sia attivo. Rollback: `NOTIFICATIONS_ENABLED=false`, poi eventualmente i `DROP` indicati nella migrazione.

Diagnosi: `select status, "lastErrorCode", count(*) from "NotificationOutbox" group by 1, 2;`

---

## Storico longitudinale

### Ultimo vs precedente

`lib/insights/history.ts` lavora sui documenti `DONE` con analisi valida e confronta l'ultima analisi con la precedente dello stesso tipo all'interno del profilo visualizzato.

### Trend multi-periodo

`lib/insights/trends.ts` entra in gioco quando esistono almeno 3 documenti comparabili dello stesso tipo. Usa fino alle 4 analisi più recenti e confronta il documento più recente con l'inizio della finestra osservata.

Per le bollette considera quando disponibili spesa totale, prezzo unitario e consumi.

Per le buste paga considera ora, quando i campi sono realmente disponibili:
- netto e lordo;
- variazione assoluta del TFR progressivo;
- residui ferie, permessi, ROL ed ex festività;
- nuove voci variabili e voci non più presenti negli `eventi_periodo`.

I saldi assenza vengono confrontati solo se tipo e unità coincidono tra i documenti: Veredoc non converte ore in giorni né mescola unità eterogenee. La comparsa/scomparsa di una voce è trattata come informazione di contesto e non come prova della causa di una variazione retributiva.

Il motore trend applica anche un filtro `profileId` interno. La dashboard può essere filtrata con chip `Tutti` / singolo profilo e nasconde insieme documenti e storico degli altri profili.

---

## Product intelligence

### Bollette

`BollettaDecisionSummary.tsx` porta in alto verdetto, risparmio potenziale e azione consigliata. `BollettaReport.tsx` mantiene il dettaglio tecnico e le offerte.

Offerte nel confronto (`lib/parsers/market-offers.ts`): `MarketRate` conserva ogni offerta mai letta dal file ARERA e le righe non vengono rimosse. Il confronto usa solo offerte nel periodo di validità (`offertaInizio <= ora < offertaFine`) e presenti nell'ultimo snapshot della categoria (`scrapedAt` entro 12 ore dall'ultimo aggiornamento); le offerte ritirate dal file ARERA restano quindi escluse. Il confronto salva `offerte_aggiornate_al`; la UI segnala dati più vecchi di 7 giorni e offerte scadute in confronti salvati in precedenza, invitando ad aggiornare il confronto. I confronti dei documenti `DONE` sono istantanee: vengono ricalcolati dal job notturno `refresh-market-rates` o dal pulsante `Aggiorna confronto mercato`.

Scraping tariffe (`/api/jobs/scrape-market-rates`, workflow n8n `Veredoc — Nightly Market Rates`, ogni notte alle 02:00): il download diretto dei file XML ARERA (~20 MB) dalle funzioni Vercel non riesce né da iad1 né da lhr1 (verificato il 2026-10-10); i file arrivano solo tramite il fallback ScraperAPI (`SCRAPERAPI_KEY`, 1 credito per categoria a notte). La chiave è sul piano Free (1.000 crediti/mese) ed è condivisa con un altro progetto: dal 2026-09-23 al 2026-10-10 i crediti erano esauriti e lo scraping non ha aggiornato `MarketRate`. In quel caso la route risponde comunque `200` con gli errori nel corpo, quindi l'esecuzione n8n risulta riuscita: controllare `extracted` nella risposta.

### Buste paga — payroll intelligence v2

Il payload payroll resta backward-compatible e aggiunge campi opzionali/normalizzati:

```text
tfr_progressivo
saldi_assenze[]
  tipo: ferie | permessi | rol | ex_festivita | altro
  maturato | goduto | residuo | unita
eventi_periodo[]
  tipo: straordinario | premio | assenza | malattia | ferie | permesso | altro
  descrizione | quantita | unita | importo
```

Regole di estrazione:
- Claude deve usare solo valori esplicitamente visibili sul cedolino;
- non converte ore/giorni;
- non ricostruisce TFR, saldi o quantità mancanti;
- array vuoti e `null` sono preferiti a stime.

`payroll-coherence-v2` mantiene quadratura netto, imponibili, contributi, IRPEF e controlli sui valori negativi, e aggiunge:
- segnalazione prudente di saldi ferie/permessi negativi;
- segnalazione di TFR progressivo negativo o sospetto;
- acquisizione informativa di saldi ed eventi del periodo.

`BustaPagaReport.tsx` mostra una sezione `Cosa è successo questo mese` solo quando questi dati sono realmente disponibili.

Lo storico multi-periodo utilizza gli stessi campi opzionali senza inventare dati: TFR, saldi ed eventi entrano nel trend solo quando sono confrontabili. Le nuove/scomparse voci servono come contesto e non vengono presentate come causalità certa.

I test includono payload payroll sintetici ma realistici e anonimizzati per validare schema, categorie, motore deterministico e trend su TFR/saldi/eventi. Questi test NON dimostrano ancora l'affidabilità di estrazione di Claude su cedolini reali eterogenei: quella validazione richiede un corpus reale/anomizzato. Al 2026-08-30 non è stato fornito in questa sessione un corpus payroll reale da usare come evidenza.

---

## Account

`/account` (protetta come `/analyze` e `/dashboard`, con ritorno dopo il login): email con stato di conferma, cambio email, cambio password, uscita, piano e analisi del mese (`components/account/PlanUsage.tsx`, condiviso con la dashboard in versione compatta), gestione profili, stato delle notifiche email, esportazione dati ed eliminazione account. Navigazione: link con l'email nella barra desktop, voce `Account` nella barra in basso su mobile.

### Ciclo di vita (migrazione 005)

Tabelle separate da `User` per non toccarne le colonne: `AccountState` (`emailVerifiedAt`, `sessionVersion`) ed `EmailToken` (token monouso, solo hash SHA-256, 24 h, uno valido per scopo). Senza riga in `AccountState` l'account è **legacy** (creato prima della verifica email): continua a ricevere le notifiche come prima.

- **Registrazione**: stessa risposta `201 { ok: true }` (e stesso costo bcrypt) che l'email sia nuova o già registrata; al titolare esistente arriva "Hai già un account" (max 2/h per indirizzo). I nuovi account nascono con email **da confermare** e ricevono il link `/verify-email?token=…`. La login non è bloccata dalla mancata conferma.
- **Notifiche analisi**: inviate solo a indirizzi confermati o legacy (`email_unverified` → `CANCELLED`); la UI promette l'email solo in quel caso (`session.user.emailStatus`).
- **Cambio email**: richiede la password; link al nuovo indirizzo (`type=change`), avviso al vecchio senza indicare il nuovo; applicato solo se nessun altro account usa l'indirizzo (`lower()`); la risposta non rivela se il nuovo indirizzo è già usato.
- **Sessioni**: il JWT contiene `sv`; il callback `jwt` (`lib/auth.ts`) rilegge a ogni richiesta piano, email, stato email e versione. Cambio o reset password incrementano `sessionVersion` → tutte le sessioni, compresa quella corrente, vengono chiuse (login con `?passwordChanged=1`). Utente eliminato → sessione nulla. Il middleware non conosce queste invalidazioni: per evitare loop `/login` e `/register` non reindirizzano più lato middleware, lo fanno lato client con `useSession` (che passa dal server).
- **Esportazione** (`GET /api/account/export`, 5/h): JSON con account, consensi, profili, documenti non eliminati (dati estratti e analisi senza `_job`), notifiche e link firmati 24 h ai file originali. Esclusi hash password e token.
- **Eliminazione** (`POST /api/account/delete`, password + parola `ELIMINA`, 5/15 min): prima i file in Storage (riferiti dai documenti e residui in `uploads/<userId>/`; se fallisce non si cancella nulla dal DB), poi in transazione documenti e utente (profili, token, consensi, stato, notifiche in cascata), email di conferma e pagina `/arrivederci`. Le copie nei backup Supabase decadono secondo la loro retention (informativa: entro 30 giorni).

Prima della migrazione 005 tutto degrada senza errori (`lib/account/state.ts`, assenza della tabella ricordata per 5 minuti): nessuna verifica né cambio email (la UI li nasconde), nessuna invalidazione delle sessioni, esportazione ed eliminazione funzionanti.

Il pagamento PRO non esiste: i testi dicono di scrivere a `ciao@veredoc.it` e il piano si imposta con `POST /api/admin/set-plan`.

## Sicurezza e autorizzazione

- **Email normalizzate** (`lib/account/credentials.ts`): salvate in minuscolo alla registrazione; login, reset e admin cercano con `lower(email) = …` (`lib/account/users.ts`, niente `ILIKE`), così funzionano anche gli account creati prima. Eventuali doppioni storici che differiscono solo per maiuscole: vince il più vecchio.
- **Regole password lato server**: minimo 8 caratteri, massimo 72 byte (limite bcrypt), in registrazione, reset e cambio password.
- **Rate limit persistente** (`lib/security/rate-limit.ts`, tabella `RateLimitBucket`): UPSERT atomico a finestra fissa, chiavi SHA-256 (nessuna email/IP in chiaro). Login 10/15 min per email e 50/15 min per IP; registrazione 5/h per IP; password dimenticata 3/h per email e 10/h per IP (risposta sempre generica); reset 10/h per IP; cambio password 5/15 min per utente. Fail-open se la tabella non esiste o il DB non risponde (evento `security.rate_limit_unavailable`). Il login bloccato restituisce `code = rate_limited` e la pagina mostra un messaggio dedicato. IP da `x-forwarded-for` (impostato da Vercel). Pulizia dei contatori > 24 h nel job di recovery.
- **Consenso registrato**: la registrazione richiede `acceptTerms: true` lato server e salva `UserConsent` (`TERMS_PRIVACY`, versione `LEGAL_DOCUMENTS_VERSION`). Se la tabella non esiste ancora la registrazione prosegue e registra `account.consent_not_recorded`.
- **Cambio password**: richiede la password attuale, invalida i link di reset attivi e (dopo la migrazione 005) chiude tutte le sessioni.
- `POST /api/admin/set-plan` confronta `ADMIN_SECRET` a tempo costante.

- ownership documento centralizzata;
- spostamento documento consentito solo se documento e profilo appartengono alla sessione corrente;
- RLS su `AnalysisProfile`, `User`, `Document` e `MarketRate`;
- job protetti da `JOBS_SECRET` fail-closed;
- Supabase Service Role solo server-side;
- upload PRO verificato server-side;
- MIME sniffing server-side.
- la registrazione non rivela più se un'email ha già un account.

---

## Prestazioni e osservabilità

- **Dashboard** (`app/dashboard/page.tsx`): legge solo le colonne necessarie dei documenti, calcola sul server storico (`buildLongitudinalInsights`) e trend (`buildMultiPeriodTrends`) e invia al browser solo i risultati e un riepilogo per documento (`lib/dashboard/summary.ts`: tipo, stato, data, nome file, importo, fornitore/datore). Le analisi complete non lasciano più il server. La lista mostra 10 documenti per profilo con `Mostra altri`.
- **Stato sessione** (`lib/account/state.ts`): il callback `jwt` usa una cache per istanza di 15 s (massimo 5.000 utenti). Le scritture della stessa istanza la invalidano; tra istanze diverse un cambio di piano/email o la revoca delle sessioni dopo un cambio password si propagano entro 15 s. Login, pagina account, API email e dispatcher notifiche leggono senza cache.
- **Avvisi operativi** (`instrumentation.ts`, `lib/observability/alerts.ts`): con `OPS_ALERT_EMAIL` configurata, ogni evento di log di livello `error` (escluso `analysis.failed`, coperto da `analysis.attempts_exhausted`) e ogni errore server non gestito (`onRequestError`, solo percorso senza query string, tipo e digest) inviano un'email via Brevo. Massimo un'email all'ora per tipo di evento (rate limit su Postgres, condiviso tra istanze); senza rate limit verificabile l'avviso non parte. Nessun contenuto dei documenti.
- **Dominio canonico**: `https://www.veredoc.it` per metadati (`metadataBase`, canonical, Open Graph), link delle email (`getAppBaseUrl()`, incluso il reset password), workflow n8n e documentazione.
- **Home** (`app/page.tsx`): pagina statica senza sessione lato client; gli utenti con sessione vengono reindirizzati dal middleware.

---

## Database

La migrazione `supabase/migrations/002_analysis_profiles.sql` è stata applicata il 2026-08-30. Non sono richieste nuove migrazioni per payroll intelligence v2, PWA/mobile UX o lifecycle analisi (stato del job in `analysis._job`). Il trigger `Document_updatedAt_trigger` resta attivo: `updatedAt` non è affidabile per confronti di uguaglianza.

Migrazioni applicate in produzione il 2026-10-11 (dichiarato dal proprietario del progetto):
- `003_notification_outbox.sql`: enum `NotificationEventType`/`NotificationStatus`, tabella `NotificationOutbox`, indice parziale `Document_analysis_in_flight_idx`. Le notifiche restano comunque governate da `NOTIFICATIONS_ENABLED`;
- `004_account_security.sql`: tabelle `RateLimitBucket` e `UserConsent`, indice `User_email_lower_idx` su `lower(email)`;
- `005_account_lifecycle.sql`: tabelle `AccountState` ed `EmailToken`.

Le migrazioni si applicano manualmente dal Supabase SQL Editor (nessuna migrazione al deploy). Il codice tollera comunque l'assenza delle tabelle 004/005 (fail-open documentato nelle rispettive sezioni).

---

## PWA e comportamento mobile/offline

Veredoc espone un Web App Manifest tramite `app/manifest.ts`, usa icone 192/512 px e registra `public/sw.js` lato client. Il manifest usa un'identità stabile `id: /`, lingua italiana e shortcut installabili verso `Analizza documento` e `I miei documenti`.

Esperienza mobile autenticata:
- header semplificato con logo e piano;
- bottom navigation persistente `Documenti / Analizza` con safe-area, icone e touch target mobili;
- dashboard con CTA primaria `Analizza un documento`;
- install card mostrata solo quando l'app non è già standalone e quando il browser espone un percorso d'installazione;
- `Non ora` sospende il suggerimento per 14 giorni anziché nasconderlo permanentemente;
- Android/Chromium usa `beforeinstallprompt` quando disponibile;
- iOS mostra istruzioni tramite il menu Condividi del browser;
- `/analyze` privilegia fotocamera e file picker su mobile, mantenendo drag & drop su desktop;
- gestione documento mobile mantiene importo/data leggibili e rende cambio profilo/eliminazione touch-friendly.

Regole di sicurezza del service worker:
- non mette mai in cache API, documenti, analisi, dashboard HTML o altre risposte contenenti dati account;
- le navigazioni restano network-first;
- offline viene mostrato solo `public/offline.html`, pagina statica priva di dati utente;
- il precache contiene soltanto fallback offline, favicon e icone PWA;
- gli asset Next.js non vengono duplicati in Cache Storage: restano affidati alla normale cache HTTP del browser;
- l'installazione usa `start_url: /`; l'autenticazione e i redirect esistenti restano invariati.

La PWA non introduce notifiche push in questa fase. L'infrastruttura push richiederà una valutazione separata di consenso, UX e gestione subscription.

---

## CI e delivery

Script:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e   # dopo pnpm build, con DATABASE_URL/DIRECT_URL di un Postgres di test
```

GitHub Actions (`.github/workflows/ci.yml`) ha due job: `verify` (lint, typecheck, test unitari, build) ed `e2e` (Postgres 16 come service container, schema da `prisma db push`, build, Playwright con Chromium). I test end-to-end (`e2e/`, `@playwright/test` 1.56.1) coprono: ritorno alla pagina richiesta dopo il login, registrazione e login con maiuscole, registrazione con email già usata (risposta identica), consenso obbligatorio, cambio password con chiusura sessioni, esportazione JSON, profili (crea/rinomina/elimina), rate limit del login, account e logout dalla barra mobile, dashboard paginata senza campi dell'analisi nella pagina. Non chiamano Storage, AI né Brevo (`BREVO_API_KEY` vuota). Ogni test usa un `x-forwarded-for` diverso per non esaurire il rate limit per IP. In locale: `PW_CHROMIUM_PATH` per usare un Chromium già installato.

Per lavoro ordinario destinato a `main` non si apre una PR di staging per default, per evitare preview deploy Vercel inutili.

```text
INSPECT → PREPARE FULL CHANGE → ONE ATOMIC COMMIT → ONE MAIN UPDATE → CI → PRODUCTION DEPLOY
```

PR solo se richiesta, imposta da policy o realmente necessaria per validare in sicurezza un cambiamento ad alto rischio.

---

## Test principali

- validazione upload e output AI;
- worker lifecycle: lease, claim concorrenti, retry, tentativi esauriti, recovery, checkpoint estrazione, update a zero righe, confronto mercato non bloccante;
- SQL del lease su Postgres reale in-process (PGlite) con il trigger di produzione;
- auto-detection cross-type;
- payroll coherence v2;
- payload payroll realistici sintetici per saldi/TFR/eventi variabili;
- storico ultimo-vs-precedente;
- trend multi-periodo bollette/payroll;
- trend payroll v2 su TFR progressivo, saldi con unità compatibili e nuove/scomparse voci;
- isolamento trend tra profili differenti;
- authorization job/ownership;
- ciclo di vita account su PGlite con la migrazione reale: stato legacy/da confermare/confermato, versione sessione, token monouso (scadenza, scopo, revoca), cambio email con conflitto su `lower()`, cascade; template email account; notifiche bloccate per indirizzi non confermati;
- account e sicurezza: normalizzazione email e ricerca `lower()` senza jolly, regole password, rate limit su PGlite con la migrazione reale (finestra, chiavi hash, pulizia, fail-open), consenso con cascade, validazione nome profilo, ritorno a `/account` dopo il login;
- notifiche: outbox atomica con DONE/ERROR su PGlite con la migrazione reale, eventKey per ciclo, avviso di attesa (soglia, ciclo, documenti chiusi/eliminati/storici), claim concorrente, lease scaduto, retry/backoff, rate limit, esiti ambigui e deduplica Brevo, destinatario non valido, template senza dati sensibili, reset password invariato, redirect post-login sicuro;
- dashboard: riepilogo documenti senza campi dell'analisi; avvisi operativi; hook dei log di errore;
- observability.

---

## Prossimi passi consigliati

1. Validare l'estrazione payroll v2 su un corpus di cedolini reali eterogenei e anonimizzati prima di attribuire affidabilità ai nuovi campi.
2. Trasformare gli errori osservati sui cedolini reali in fixture/regressioni permanenti, mantenendo separata la validazione dell'AI dai test deterministici.
3. Evolvere le bollette da trend a monitoraggio tariffa/consumo con spiegazione della causa dominante.
4. Valutare l'archiviazione dei profili (rinomina ed eliminazione dei profili vuoti sono disponibili da `/account`).
5. Billing reale PRO solo previa approvazione esplicita.
6. Importare e attivare in n8n `scripts/n8n/analysis-recovery.workflow.json` (non ancora verificato come attivo).
7. Attivare le notifiche email (`NOTIFICATIONS_ENABLED=true`) e verificare un invio reale end-to-end; autenticare il dominio veredoc.it su Brevo (oggi il mittente viene riscritto su `brevosend.com`).
8. Configurare `OPS_ALERT_EMAIL` per ricevere gli avvisi operativi.
9. Verificare su Vercel che `veredoc.it` reindirizzi (308) a `www.veredoc.it` e che `NEXTAUTH_URL`/`APP_BASE_URL`, se impostate, usino `https://www.veredoc.it`.
10. Misurare installazione e ritorno della PWA prima di valutare wrapper o app native.
11. Valutare notifiche push solo quando esistono alert longitudinali realmente utili e con consenso esplicito.

---

## Variabili d'ambiente principali

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `AI_PROVIDER`
- `ADMIN_SECRET`
- `JOBS_SECRET`
- `SCRAPERAPI_KEY`
- `BREVO_API_KEY`
- `OPS_ALERT_EMAIL` (opzionale): destinatario degli avvisi operativi
- `APP_BASE_URL` (opzionale) è usato anche per i link delle email account
- `NOTIFICATIONS_ENABLED`, `NOTIFICATION_DELAYED_ENABLED`, `NOTIFICATION_DELAYED_THRESHOLD_SECONDS`, `APP_BASE_URL` (opzionali, vedi "Notifiche email transazionali")
