# CONTEXT.md — Veredoc

> Aggiornato: 2026-08-30 — production hardening + scheduler n8n + CI/lint globale

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
    auth/                         autenticazione, registrazione, reset password
    documents/upload/             validazione, quota, upload e creazione job
    documents/[id]/               lettura, recovery analisi e cancellazione
    documents/[id]/refresh-market refresh confronto senza nuova analisi AI
    jobs/process-analysis/         recovery batch protetto da JOBS_SECRET
    jobs/refresh-market-rates/     refresh confronto sui documenti DONE
    jobs/scrape-market-rates/      scraping tariffe
    market-rates/                  lettura tariffe
    admin/set-plan/                gestione piano amministrativa
  analyze/                         upload + polling risultato
  dashboard/                       storico documenti
  (auth)/                          login/register/reset
  (pages)/                         privacy/termini
components/
  FileUploader.tsx
  AnalysisResult.tsx
  DocumentRedactor.tsx
  BollettaReport.tsx
  BustaPagaReport.tsx
lib/
  ai/
    analyze.ts                     selezione provider
    validate.ts                    validazione runtime output AI
    providers/anthropic.ts
  documents/upload-validation.ts   magic bytes, MIME e limiti file
  jobs/process-document.ts         worker, lease, retry e recovery
  parsers/                         arricchimento bollette/buste paga
  config/                          costanti e testi
  auth.ts
  email.ts
  prisma.ts
prisma/schema.prisma
supabase/
  migrations/
  seeds/
  rls.sql
tests/validation.test.ts
.github/workflows/ci.yml
```

---

## Flusso upload hardenizzato

1. L'utente deve essere autenticato.
2. Il server legge il piano reale dal DB e verifica la quota mensile **prima** di salvare il file.
3. Il flusso JSON/base64 del redattore è consentito esclusivamente agli utenti PRO.
4. Il contenuto viene validato server-side tramite magic bytes; PDF/JPEG/PNG devono corrispondere al MIME dichiarato quando presente.
5. Limite server-side: 10 MB.
6. Il file viene salvato in Supabase Storage usando un'estensione derivata dal MIME realmente rilevato.
7. Viene creato il record `Document` in stato `PENDING`.
8. Se la creazione DB fallisce dopo l'upload, il file appena creato viene rimosso dallo Storage per evitare oggetti orfani.
9. L'analisi viene avviata con `after()` di Next.js, ma il lavoro non dipende più da una singola esecuzione: stato e retry sono persistenti sul record `Document`.

La policy di retention dei file **non è stata modificata in questo hardening**: il documento resta nello Storage finché l'utente non lo elimina tramite il flusso esistente.

---

## Worker analisi, lease e retry

`lib/jobs/process-document.ts` è il punto unico di elaborazione.

- Accetta documenti `PENDING` o `PROCESSING` con lease scaduta.
- Usa `status + updatedAt` come lock ottimistico per impedire doppie elaborazioni concorrenti.
- Scrive temporaneamente in `analysis._job`:
  - numero tentativi;
  - ultimo errore.
- Massimo tentativi: **3**.
- Lease considerata scaduta dopo **2 minuti**.
- Il worker riscarica il file da Supabase Storage: il retry non dipende quindi dai byte rimasti in memoria nella request originale.
- A errore recuperabile il documento torna `PENDING`; dopo il terzo tentativo passa a `ERROR`.
- `GET /api/documents/[id]`, già usato dal polling UI, prova a rianimare automaticamente documenti `PENDING` o `PROCESSING` stale.
- `POST /api/jobs/process-analysis` consente anche un recupero batch esterno ed è protetto con `Authorization: Bearer JOBS_SECRET`.

Questo approccio non richiede una nuova migrazione DB e mantiene compatibilità con lo schema attuale.

---

## Scheduler n8n

I job operativi Veredoc sono schedulati esternamente tramite n8n, mantenendo Vercel come hosting applicativo e Supabase come persistenza dello stato.

### Market rates

Il workflow n8n esistente `Veredoc — Nightly Market Rates` esegue ogni notte il flusso di aggiornamento tariffe e richiama gli endpoint Veredoc protetti da `JOBS_SECRET`, incluso `POST /api/jobs/refresh-market-rates` per ricalcolare il confronto mercato sui documenti `DONE` di tipo bolletta.

### Analysis recovery

È stato creato un workflow n8n separato per il recovery delle analisi:

```text
Schedule Trigger (ogni 5 minuti)
  → POST /api/jobs/process-analysis
  → Authorization: Bearer JOBS_SECRET
```

Stato al 2026-08-30:
- workflow creato clonando il pattern del job Market Rates;
- endpoint e autenticazione configurati;
- esecuzione manuale di test completata con successo;
- workflow lasciato intenzionalmente **Unpublished** per il momento;
- il recovery tramite polling utente rimane comunque operativo anche con lo scheduler non pubblicato.

Quando il workflow verrà pubblicato, il recovery batch funzionerà indipendentemente dal fatto che l'utente mantenga aperta la pagina Veredoc.

---

## Validazione output AI

L'output Claude non viene più considerato valido solo perché è JSON parseabile.

`lib/ai/validate.ts` valida a runtime:

### Bollette
- `tipo_rilevato` e `tipo` supportati;
- fornitore e periodo;
- importi numerici finiti;
- consumi e unità;
- struttura `materia_energia`;
- rete/oneri, imposte e altro, incluse sezioni nullable per internet;
- dettaglio voci e categorie ammesse.

### Buste paga
- tipo rilevato;
- datore e competenza;
- lordo/netto;
- contributi, IRPEF, TFR;
- voci con tipo limitato a `competenza | trattenuta`.

Solo un payload validato può essere salvato come risultato definitivo o passato al parser di confronto mercato.

---

## Stato e recupero documento

```text
PENDING
  ↓ claim worker
PROCESSING
  ├─ successo → DONE
  ├─ documento non supportato → ERROR
  └─ errore tecnico
       ├─ tentativi < 3 → PENDING
       └─ tentativi = 3 → ERROR

PROCESSING stale (>2 min)
  → recuperabile da polling utente o endpoint job batch
```

Gli stati `AWAITING_CONFIRMATION` e `DELETED` rimangono nello schema per compatibilità con il prodotto esistente.

---

## Sicurezza e autorizzazione

- Accesso ai documenti verificato per ownership utente.
- Password con bcryptjs.
- Reset password con token monouso hashato e scadenza.
- Supabase Service Role utilizzata solo server-side.
- Endpoint admin protetto da `ADMIN_SECRET`.
- Endpoint job protetti da `JOBS_SECRET`.
- Upload PRO verificato server-side, non solo tramite UI.
- MIME sniffing server-side contro file con estensione/content-type falsificati.

---

## Piani

| Piano | Analisi/mese | Redazione PDF client-side |
|---|---:|---|
| FREE | 10 | No |
| PRO | 30 | Sì |

La quota viene controllata prima dello Storage. I documenti creati nel mese contano verso la quota indipendentemente dall'esito finale, impedendo di aggirare il limite generando continuamente job falliti o pendenti.

---

## CI e qualità

Script disponibili:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm test` usa il test runner nativo Node e copre inizialmente:
- magic bytes PDF/JPEG/PNG;
- rifiuto MIME spoofing;
- validazione payload bolletta;
- sezioni nullable internet;
- rifiuto output AI malformato;
- validazione busta paga.

GitHub Actions esegue su PR e push a `main`:
1. install frozen lockfile;
2. lint globale (`pnpm lint`);
3. typecheck globale;
4. unit test;
5. build produzione globale.

Il debito ESLint preesistente emerso durante il production hardening è stato eliminato. La CI blocca ora sul lint dell'intero repository, oltre a typecheck, test e build globali.

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
- Workflow n8n di recovery analisi creato e testato manualmente; attualmente Unpublished.
- Upload con magic-byte validation, quota anticipata e cleanup compensativo.
- Scraping tariffe e refresh mercato.
- Scheduler n8n Nightly Market Rates esistente.
- CI globale con lint, typecheck, unit test e build.

## Prossimi passi consigliati

1. Pubblicare il workflow n8n `Analysis Recovery` quando si decide di rendere attivo il recovery automatico ogni 5 minuti.
2. Aggiungere integration test con DB/Storage fittizi per concorrenza worker, retry e ownership.
3. Implementare billing reale e subscription lifecycle per PRO.
4. Aggiungere observability: error tracking, metriche durata AI, tentativi, documenti stale e costi provider.
5. Espandere test dei parser e del confronto mercato con fixture reali anonimizzate.

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
