# CONTEXT.md — Veredoc

> Aggiornato: 2026-08-30 — production hardening, scheduler n8n, authorization/observability e product intelligence con auto-detection + controlli busta paga

---

## Cos'è Veredoc

Veredoc è un SaaS italiano che analizza bollette (luce, gas, internet) e buste paga tramite AI. L'utente carica un PDF/JPG/PNG senza dover scegliere manualmente il tipo di documento. Veredoc riconosce il contenuto, applica il flusso corretto e restituisce un risultato orientato all'azione:

- per le bollette: lettura strutturata, confronto mercato e indicazione sintetica su cosa conviene fare;
- per le buste paga: lettura strutturata e controlli automatici di coerenza/anomalia sulle informazioni presenti nel singolo cedolino.

I controlli busta paga non costituiscono certificazione fiscale, consulenza del lavoro o verifica legale completa: evidenziano incoerenze matematiche e valori che meritano approfondimento.

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
  analyze/                          upload auto-detect + polling risultato
  dashboard/                        storico documenti
components/
  FileUploader.tsx                  upload senza selezione manuale tipo
  AnalysisResult.tsx                routing UI risultato
  BollettaDecisionSummary.tsx       verdetto/azione sintetica bolletta
  BollettaReport.tsx                dettaglio tecnico + offerte
  BustaPagaReport.tsx               verdetto anomalie + dettaglio cedolino
  DocumentRedactor.tsx
lib/
  ai/
    analyze.ts
    validate.ts
    providers/anthropic.ts          one-pass detection + extraction
  documents/upload-validation.ts
  jobs/process-document-core.ts     routing dal tipo rilevato AI
  jobs/process-document.ts
  observability/operations.ts
  security/access.ts
  parsers/
    bolletta.ts
    bustapaga.ts                    engine payroll-coherence-v1
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
  payroll-verification.test.ts
  authorization.test.ts
  observability.test.ts
.github/workflows/ci.yml
```

---

## Flusso upload e auto-detection

1. L'utente deve essere autenticato.
2. Il server legge il piano reale dal DB e verifica la quota mensile prima di salvare il file.
3. Il flusso JSON/base64 del redattore è consentito esclusivamente agli utenti PRO.
4. Il contenuto viene validato server-side tramite magic bytes; PDF/JPEG/PNG devono corrispondere al MIME dichiarato quando presente.
5. Limite server-side: 10 MB.
6. L'utente **non seleziona più** luce/gas/internet/busta paga.
7. Il file viene salvato in Supabase Storage usando un'estensione derivata dal MIME realmente rilevato.
8. Viene creato il record `Document` in stato `PENDING`.
9. Poiché lo schema Prisma esistente richiede `Document.type` e non dispone di un valore `AUTO`, alla creazione viene scritto un **hint operativo iniziale** inferito dal nome file. Questo valore non è considerato la classificazione definitiva e non richiede una migrazione DB.
10. Claude riceve il documento e, in **una singola chiamata**, riconosce il tipo reale (`luce | gas | internet | busta_paga | sconosciuto`) e restituisce il payload specifico del tipo rilevato.
11. Il worker sceglie il validator in base a `tipo_rilevato`, non in base all'hint iniziale, e sovrascrive `Document.type` con il tipo effettivo al completamento.
12. Se la creazione DB fallisce dopo l'upload, il file appena creato viene rimosso dallo Storage.
13. L'analisi viene avviata con `after()` di Next.js; stato e retry restano persistenti sul record `Document`.

L'auto-detection è one-pass per evitare una seconda chiamata AI dedicata alla sola classificazione, quindi non raddoppia intenzionalmente latenza e costo provider.

La policy di retention dei file non è stata modificata in questo intervento.

---

## Worker analisi, lease e retry

La state machine del worker vive in `lib/jobs/process-document-core.ts`; `lib/jobs/process-document.ts` collega la logica a Prisma, Supabase Storage, AI, validatori e parser reali.

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
- Il tipo effettivo viene determinato dall'output AI prima di scegliere il validator bolletta/busta paga.

---

## Product intelligence bollette

Il risultato bolletta è organizzato in due livelli:

1. **Decision summary** (`BollettaDecisionSummary.tsx`):
   - tariffa competitiva / in linea / sopra mercato;
   - risparmio potenziale mensile e annuale quando disponibile;
   - parte negoziabile della bolletta;
   - CTA al confronto mercato quando esiste un'azione economicamente sensata.
2. **Report tecnico** (`BollettaReport.tsx`):
   - fornitore, periodo, consumi;
   - breakdown materia energia/rete/oneri/imposte;
   - dettaglio voci;
   - confronto offerte e break-even.

La logica di confronto mercato esistente non è stata sostituita: è cambiata la gerarchia con cui il risultato viene presentato all'utente.

---

## Product intelligence buste paga

### Estrazione

Oltre ai campi storici, Claude prova a estrarre quando presenti:

- totale competenze;
- totale trattenute;
- imponibile previdenziale;
- imponibile fiscale;
- IRPEF lorda;
- detrazioni;
- addizionali.

I campi non leggibili devono restare `null`: il prompt vieta di inventare o ricostruire importi per supposizione.

### Engine `payroll-coherence-v1`

`lib/parsers/bustapaga.ts` esegue controlli deterministici dopo l'estrazione AI:

- quadratura `competenze_totali - trattenute_totali` rispetto al netto, con tolleranza tecnica;
- incidenza dei contributi sull'imponibile previdenziale, usando un intervallo ampio come segnale di plausibilità e non come regola contrattuale assoluta;
- compatibilità matematica di IRPEF e imponibile fiscale;
- rapporto netto/lordo come informazione;
- importi principali negativi/anomali;
- dati insufficienti senza generare falsi allarmi.

Verdetti:

- `coerente`: nessuna anomalia evidente nei controlli disponibili;
- `da_verificare`: almeno un'incoerenza o valore fuori dagli intervalli di controllo;
- `dati_insufficienti`: documento letto ma mancano dati per alcuni controlli.

Il motore **non certifica** che aliquote, contributi o trattamento fiscale siano legalmente corretti. Un singolo cedolino non contiene necessariamente contratto, situazione fiscale annuale, conguagli o altre informazioni indispensabili a una verifica completa.

### UI

`BustaPagaReport.tsx` è anomaly-first:

1. verdetto e controlli da verificare;
2. sintesi lordo/netto;
3. trattenute e imponibili;
4. voci dettagliate in sezione espandibile.

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
- voci `competenza | trattenuta`;
- totali/imponibili/detrazioni/addizionali opzionali e nullable.

---

## Sicurezza e autorizzazione

`lib/security/access.ts` centralizza le guardie di accesso condivise.

### Endpoint job

Gli endpoint:
- `POST /api/jobs/process-analysis`
- `POST /api/jobs/refresh-market-rates`
- `POST /api/jobs/scrape-market-rates`

usano tutti la stessa validazione `Authorization: Bearer JOBS_SECRET` fail-closed con confronto `timingSafeEqual`.

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
- completamento, documento non supportato e failure/retry;
- durata download Supabase Storage;
- durata chiamata AI, provider e hint documento iniziale;
- metriche dei job `process-analysis`, refresh mercato e scraping ARERA.

Non è ancora presente un backend esterno di error tracking/metriche. I costi monetari AI non sono calcolati.

---

## Piani

| Piano | Analisi/mese | Redazione PDF client-side |
|---|---:|---|
| FREE | 10 | No |
| PRO | 30 | Sì |

La quota viene controllata prima dello Storage. I documenti creati nel mese contano verso la quota indipendentemente dall'esito finale. Dashboard e upload usano la stessa regola di conteggio.

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
- failure Storage;
- auto-detection che instrada una busta paga anche quando il tipo iniziale DB è una bolletta.

### Payroll verification
- cedolino coerente;
- mismatch tra competenze/trattenute e netto;
- incidenza contributiva anomala con wording non-certificativo;
- dati mancanti senza falso allarme.

### Authorization
- `JOBS_SECRET` assente;
- header assente/malformato;
- secret errato/corretto;
- ownership documento.

### Observability
- formato eventi;
- rimozione campi undefined;
- timing non negativo;
- normalizzazione errori.

---

## Funzionalità completate

- Autenticazione e reset password.
- Upload PDF/JPG/PNG.
- Auto-detection one-pass di bollette luce/gas/internet e buste paga.
- Nessuna selezione manuale del tipo documento nell'upload.
- Quote FREE/PRO coerenti tra backend e dashboard.
- Redattore PDF PRO lato browser.
- Analisi Claude di bollette e buste paga.
- Validazione runtime output AI.
- Decision summary action-first per bollette.
- Confronto bollette con tariffe mercato.
- Engine deterministico `payroll-coherence-v1` per controlli di coerenza/anomalia del cedolino.
- Report busta paga anomaly-first.
- Dashboard e polling analisi.
- Soft delete con cancellazione file Storage e azzeramento dati sensibili.
- Retry/recovery analisi con lease persistente.
- Recovery batch protetto.
- Workflow n8n Analysis Recovery creato/testato e attualmente Unpublished.
- Upload con magic-byte validation, quota anticipata e cleanup compensativo.
- Scraping tariffe e refresh mercato.
- Scheduler n8n Nightly Market Rates.
- CI globale con lint, typecheck, test e build.
- Guardie centralizzate fail-closed per job e ownership documenti.
- Observability operativa strutturata per worker, AI, Storage e job schedulati.

## Prossimi passi consigliati

1. Validare l'auto-detection e i controlli busta paga su un set crescente di documenti reali anonimizzati, misurando falsi positivi/falsi negativi.
2. Evolvere la busta paga da controllo del singolo mese a **storico longitudinale**: variazioni netto/lordo, ferie/TFR, imponibili, trattenute ricorrenti e anomalie tra mesi.
3. Rendere la dashboard più orientata al valore: risparmi potenziali bollette, documenti con anomalie e azioni consigliate in evidenza.
4. Valutare una knowledge layer normativa/contrattuale versionata per controlli payroll più profondi, mantenendo separati dati estratti, regole deterministiche e spiegazioni AI.
5. Implementare billing reale e subscription lifecycle per PRO, previa approvazione esplicita perché modulo pagamento/critico.
6. Pubblicare il workflow n8n `Analysis Recovery` quando si decide di attivare il recovery automatico ogni 5 minuti.

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
