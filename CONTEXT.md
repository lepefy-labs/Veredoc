# CONTEXT.md — Veredoc

> Aggiornato: 2026-08-30 — production hardening analisi/upload/CI

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
2. lint dei file introdotti/modificati dal production hardening;
3. typecheck globale;
4. unit test;
5. build produzione globale.

Il lint globale del repository presenta ancora debito preesistente in alcuni componenti/route precedenti a questo hardening; per non mescolare refactoring non richiesti nello stesso intervento, la CI blocca sul lint dei file hardenizzati mentre `typecheck`, test e build rimangono globali.

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
- Upload con magic-byte validation, quota anticipata e cleanup compensativo.
- Scraping tariffe e refresh mercato.
- CI, typecheck e unit test iniziali.

## Prossimi passi consigliati

1. Collegare `/api/jobs/process-analysis` a uno scheduler/queue durevole per recovery indipendente dal traffico utente.
2. Eliminare il debito ESLint preesistente e riportare il lint CI all'intero repository.
3. Aggiungere integration test con DB/Storage fittizi per concorrenza worker, retry e ownership.
4. Implementare billing reale e subscription lifecycle per PRO.
5. Aggiungere observability: error tracking, metriche durata AI, tentativi, documenti stale e costi provider.
6. Espandere test dei parser e del confronto mercato con fixture reali anonimizzate.

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
