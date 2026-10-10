# CONTEXT.md — Veredoc

> Aggiornato: 2026-10-10 — lifecycle analisi affidabile (lease con token, checkpoint estrazione, recovery), PWA, profili, trend e payroll intelligence v2

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
- dalla dashboard ogni profilo espone una CTA `Carica per <profilo>`.

La relazione `Document.profile` usa `RESTRICT` in cancellazione: eliminare un profilo non deve cancellare implicitamente documenti. La UI non espone ancora la cancellazione dei profili.

---

## Architettura principale

```text
app/
  manifest.ts                       manifest PWA
  analyze/                          upload auto-detect, selezione profilo esplicita
  dashboard/                        profili, quota, filtro profilo, storico e documenti
  api/
    profiles/                       lista/creazione profili
    documents/upload/               upload associato a profilo
    documents/[id]/profile/         spostamento documento tra profili
    documents/[id]/                 lettura/recovery/cancellazione
    documents/[id]/retry/           riprova manuale di un documento in ERROR
    documents/[id]/refresh-market/  refresh confronto mercato
    jobs/process-analysis/           recovery batch
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
  security/
public/
  sw.js                             service worker PWA
  offline.html                      fallback offline statico e senza dati account
  pwa/                              icone installazione
prisma/schema.prisma
supabase/migrations/002_analysis_profiles.sql
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

- `after()` vive al massimo `maxDuration` della route (300 s, Vercel Hobby + Fluid Compute, regione iad1). Può essere interrotto: per questo il lease (6 min) supera la durata massima e il recovery è indipendente dalla richiesta originale.
- Trigger del worker: upload (`after()`), `GET /api/documents/[id]` quando il documento è `PENDING` o con lease scaduto, retry manuale, job `POST /api/jobs/process-analysis`.
- Job di recovery: max 20 candidati, max 10 elaborazioni, nessuna nuova elaborazione dopo 60 s; chiude in `ERROR` i documenti con tentativi esauriti. Protetto da `JOBS_SECRET`.
- Scheduler: workflow n8n `scripts/n8n/analysis-recovery.workflow.json` ogni 5 minuti (istruzioni in `scripts/README-n8n.md`). Vercel Cron su Hobby è limitato a un'esecuzione giornaliera e non è usato.

### UX stati

Dashboard: `In coda`, `Analisi in corso`, `Completato`, `Errore analisi`. Dettaglio: coda, analisi in corso, nuovo tentativo automatico (n di 3), messaggio dopo 90 s, polling 3 s per 2 minuti poi 10 s, stop dopo 10 minuti con `Controlla di nuovo`. In `ERROR` il proprietario può usare `Riprova l'analisi` (nessun nuovo documento, nessun consumo di quota). I documenti legacy `AWAITING_CONFIRMATION` non mostrano più uno spinner infinito.

### Eventi di log

`analysis.queued`, `analysis.claimed`, `analysis.recovered`, `storage.document_download_completed`, `ai.analysis_completed`, `analysis.validation_completed`, `analysis.extraction_reused`, `analysis.enrichment_completed`, `analysis.enrichment_failed`, `analysis.completed`, `analysis.unsupported`, `analysis.retry_scheduled`, `analysis.failed`, `analysis.attempts_exhausted`, `analysis.lease_lost`, `analysis.persistence_unconfirmed`, `analysis.worker_crashed`, `analysis.manual_retry`, `job.process_analysis.completed`.

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

## Sicurezza e autorizzazione

- ownership documento centralizzata;
- spostamento documento consentito solo se documento e profilo appartengono alla sessione corrente;
- RLS su `AnalysisProfile`, `User`, `Document` e `MarketRate`;
- job protetti da `JOBS_SECRET` fail-closed;
- Supabase Service Role solo server-side;
- upload PRO verificato server-side;
- MIME sniffing server-side.

---

## Database

La migrazione `supabase/migrations/002_analysis_profiles.sql` è stata applicata il 2026-08-30. Non sono richieste nuove migrazioni per payroll intelligence v2, PWA/mobile UX o lifecycle analisi (stato del job in `analysis._job`). Il trigger `Document_updatedAt_trigger` resta attivo: `updatedAt` non è affidabile per confronti di uguaglianza.

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
```

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
- observability.

---

## Prossimi passi consigliati

1. Validare l'estrazione payroll v2 su un corpus di cedolini reali eterogenei e anonimizzati prima di attribuire affidabilità ai nuovi campi.
2. Trasformare gli errori osservati sui cedolini reali in fixture/regressioni permanenti, mantenendo separata la validazione dell'AI dai test deterministici.
3. Evolvere le bollette da trend a monitoraggio tariffa/consumo con spiegazione della causa dominante.
4. Valutare rename/archive profilo mantenendo la cancellazione documenti separata.
5. Billing reale PRO solo previa approvazione esplicita.
6. Importare e attivare in n8n `scripts/n8n/analysis-recovery.workflow.json` (non ancora verificato come attivo).
7. Misurare installazione e ritorno della PWA prima di valutare wrapper o app native.
8. Valutare notifiche push solo quando esistono alert longitudinali realmente utili e con consenso esplicito.

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
