# CONTEXT.md — Veredoc

> Aggiornato: 2026-08-30 — production hardening, scheduler n8n, CI globale, worker integration test, authorization hardening e observability operativa

---

## Cos'è Veredoc

Veredoc è un SaaS italiano che analizza bollette (luce, gas, internet) e buste paga tramite AI. L'utente carica un PDF/JPG/PNG, riceve una lettura strutturata e spiegazioni in italiano semplice; per le bollette il risultato viene arricchito con un confronto delle tariffe di mercato.

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
| AI | Anthropic Claude tramite provider abstraction |
| PDF | pdfjs-dist + pdf-lib |
| Email | Brevo REST API |
| Hosting | Vercel |
| CI | GitHub Actions |
| Scheduler esterno | n8n |

---

## Architettura principale

```text
app/
  api/
    auth/                           autenticazione, registrazione, reset password
    documents/upload/              validazione, quota, upload e creazione job
    documents/[id]/                lettura, recovery analisi e cancellazione
    documents/[id]/refresh-market  refresh confronto senza nuova analisi AI
    jobs/process-analysis/          recovery batch protetto da JOBS_SECRET
    jobs/refresh-market-rates/      refresh confronto sui documenti DONE
    jobs/scrape-market-rates/       scraping tariffe
    market-rates/                   lettura tariffe
    admin/set-plan/                 gestione piano amministrativa
  analyze/                          upload + polling risultato
  dashboard/                        storico documenti
components/
  FileUploader.tsx
  AnalysisResult.tsx
  DocumentRedactor.tsx
  BollettaReport.tsx
  BustaPagaReport.tsx
lib/
  ai/
    analyze.ts
    validate.ts
    providers/anthropic.ts
  documents/upload-validation.ts
  jobs/process-document-core.ts
  jobs/process-document.ts
  observability/operations.ts       logging strutturato e timing operativi
  security/access.ts                guardie centralizzate job/ownership
  parsers/
  config/
  auth.ts
  email.ts
  prisma.ts
prisma/schema.prisma
supabase/
  migrations/
  seeds/
  rls.sql
tests/
  validation.test.ts
  worker-integration.test.ts
  authorization.test.ts
  observability.test.ts
.github/workflows/ci.yml
```

---

## Flusso upload hardenizzato

1. L'utente deve essere autenticato.
2. Il server legge il piano reale dal DB e verifica la quota mensile prima di salvare il file.
3. Il flusso JSON/base64 del redattore è consentito esclusivamente agli utenti PRO.
4. Il contenuto viene validato server-side tramite magic bytes; PDF/JPEG/PNG devono corrispondere al MIME dichiarato quando presente.
5. Limite server-side: 10 MB.
6. Il file viene salvato in Supabase Storage usando un'estensione derivata dal MIME realmente rilevato.
7. Viene creato il record `Document` in stato `PENDING`.
8. Se la creazione DB fallisce dopo l'upload, il file appena creato viene rimosso dallo Storage.
9. L'analisi viene avviata con `after()` di Next.js; stato e retry restano persistenti sul record `Document`.

La policy di retention dei file non è stata modificata in questo hardening: il documento resta nello Storage finché l'utente non lo elimina tramite il flusso esistente.

---

## Worker analisi, lease e retry

La state machine del worker vive in `lib/jobs/process-document-core.ts`; `lib/jobs/process-document.ts` collega la logica a Prisma, Supabase Storage, AI e parser reali.

- Accetta documenti `PENDING` o `PROCESSING` con lease scaduta.
- Usa `status + updatedAt` come lock ottimistico.
- Scrive in `analysis._job` numero tentativi e ultimo errore.
- Massimo tentativi: 3.
- Lease scaduta dopo 2 minuti.
- Ogni retry riscarica il file da Supabase Storage.
- Errore recuperabile: ritorno a `PENDING`.
- Terzo errore: passaggio a `ERROR`.
- Il polling di `GET /api/documents/[id]` può rianimare analisi recuperabili.
- `POST /api/jobs/process-analysis` consente recovery batch esterno.

---

## Scheduler n8n

I job operativi Veredoc sono schedulati esternamente tramite n8n.

### Market rates

Il workflow `Veredoc — Nightly Market Rates` aggiorna le tariffe e richiama gli endpoint protetti da `JOBS_SECRET`, incluso `POST /api/jobs/refresh-market-rates`.

### Analysis recovery

Workflow separato predisposto:

```text
Schedule Trigger (ogni 5 minuti)
  → POST /api/jobs/process-analysis
  → Authorization: Bearer JOBS_SECRET
```

Stato al 2026-08-30:
- workflow creato;
- endpoint e autenticazione configurati;
- test manuale riuscito;
- workflow lasciato intenzionalmente Unpublished;
- recovery tramite polling utente ancora operativo.

---

## Validazione output AI

`lib/ai/validate.ts` valida a runtime i payload Claude prima del salvataggio definitivo.

### Bollette
- tipo rilevato/supportato;
- fornitore, periodo e importi;
- consumi e unità;
- sezioni energia/rete/imposte;
- sezioni nullable internet;
- dettaglio voci e categorie ammesse.

### Buste paga
- tipo rilevato;
- datore e competenza;
- lordo/netto;
- contributi, IRPEF e TFR;
- voci `competenza | trattenuta`.

---

## Sicurezza e autorizzazione

`lib/security/access.ts` centralizza le guardie di accesso condivise.

### Endpoint job

Gli endpoint:
- `POST /api/jobs/process-analysis`
- `POST /api/jobs/refresh-market-rates`
- `POST /api/jobs/scrape-market-rates`

usano tutti la stessa validazione `Authorization: Bearer JOBS_SECRET`.

La validazione è fail-closed:
- `JOBS_SECRET` assente o vuoto → richiesta rifiutata;
- header assente/malformato → richiesta rifiutata;
- secret errato → richiesta rifiutata;
- confronto del token tramite `timingSafeEqual` a lunghezza compatibile.

Questo elimina il precedente edge case in cui una configurazione mancante poteva rendere confrontabile il valore letterale `Bearer undefined` in due route legacy.

### Ownership documenti

Le route di lettura, cancellazione e refresh mercato usano la stessa guardia `isDocumentOwner` dopo autenticazione e lookup del documento.

- sessione assente → 401;
- documento inesistente → 404;
- utente diverso dal proprietario → 403;
- proprietario autenticato → flusso autorizzato.

Altre misure attive:
- password bcryptjs;
- reset password con token monouso hashato e scadenza;
- Supabase Service Role solo server-side;
- endpoint admin protetto da `ADMIN_SECRET`;
- upload PRO verificato server-side;
- MIME sniffing server-side.

---

## Observability operativa

`lib/observability/operations.ts` produce eventi JSON strutturati nei log server/Vercel senza introdurre servizi esterni o nuove variabili d'ambiente.

Sono tracciati:
- claim worker, tentativo e stato precedente;
- completamento, documento non supportato e failure/retry fino all'esaurimento;
- durata download da Supabase Storage e relativi errori;
- durata chiamata AI, provider e tipo documento;
- summary del job `process-analysis`: candidati, `PENDING`, `PROCESSING` stale, recuperabili, tentati, claimed e durata;
- summary del refresh mercato: documenti considerati, aggiornati, senza `rawExtracted`, errori e durata;
- summary dello scraping ARERA: offerte estratte, inserite, aggiornate, errori e durata.

Gli endpoint job mantengono il comportamento esistente e aggiungono ai payload di risposta metriche operative additive (`durationMs` e conteggi) utili anche nei log n8n.

Non è ancora presente un backend esterno di error tracking/metriche. I costi monetari AI non sono calcolati: il passo successivo, se utile, è catturare token usage/provider model e collegare un sistema esterno come Sentry o un servizio metriche.

---

## Piani

| Piano | Analisi/mese | Redazione PDF client-side |
|---|---:|---|
| FREE | 10 | No |
| PRO | 30 | Sì |

La quota viene controllata prima dello Storage. I documenti creati nel mese contano verso la quota indipendentemente dall'esito finale.

---

## CI e qualità

Script:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

GitHub Actions esegue su PR e push a `main`:
1. install frozen lockfile;
2. lint globale;
3. typecheck globale;
4. unit/integration test;
5. build produzione globale.

Copertura test corrente:

### Validazione documenti/output AI
- magic bytes PDF/JPEG/PNG;
- MIME spoofing;
- payload bolletta/busta paga;
- sezioni nullable internet;
- output AI malformato.

### Worker integration
- concorrenza e singolo claim;
- retry fino a 3 tentativi;
- lease attiva/scaduta;
- documenti cancellati o senza file;
- failure Storage.

### Authorization
- `JOBS_SECRET` assente;
- header assente/malformato;
- secret errato/corretto;
- ownership documento proprietario/non proprietario/sessione assente.

### Observability
- formato stabile degli eventi strutturati;
- rimozione campi `undefined`;
- timing non negativo;
- normalizzazione e truncation sicura dei messaggi di errore.

---

## Funzionalità completate

- Autenticazione e reset password.
- Upload PDF/JPG/PNG.
- Quote FREE/PRO.
- Redattore PDF PRO lato browser.
- Analisi Claude di bollette e buste paga.
- Correzione tipo documento rilevato.
- Validazione runtime output AI.
- Confronto bollette con tariffe mercato.
- Dashboard e polling analisi.
- Soft delete con cancellazione file Storage e azzeramento dati sensibili.
- Retry/recovery analisi con lease persistente.
- Recovery batch protetto.
- Workflow n8n Analysis Recovery creato/testato e attualmente Unpublished.
- Upload con magic-byte validation, quota anticipata e cleanup compensativo.
- Scraping tariffe e refresh mercato.
- Scheduler n8n Nightly Market Rates.
- CI globale con lint, typecheck, test e build.
- Integration test worker.
- Guardie centralizzate fail-closed per job e ownership documenti con regression test.
- Observability operativa strutturata per worker, AI, Storage e job schedulati.

## Prossimi passi consigliati

1. Pubblicare il workflow n8n `Analysis Recovery` quando si decide di attivare il recovery automatico ogni 5 minuti.
2. Espandere test dei parser e del confronto mercato con fixture reali anonimizzate.
3. Valutare error tracking esterno e token/cost telemetry AI quando serve una dashboard operativa dedicata.
4. Implementare billing reale e subscription lifecycle per PRO, previa approvazione esplicita perché modulo pagamento/critico.

---

## Variabili d'ambiente principali

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` (opzionale)
- `AI_PROVIDER` (opzionale)
- `ADMIN_SECRET`
- `JOBS_SECRET`
- `SCRAPERAPI_KEY`
- `BREVO_API_KEY`
