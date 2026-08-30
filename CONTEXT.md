# CONTEXT.md — Veredoc

> Aggiornato: 2026-08-30 — product intelligence longitudinale + delivery senza PR preview di default

---

## Cos'è Veredoc

Veredoc è un SaaS italiano che analizza bollette (luce, gas, internet) e buste paga tramite AI. L'utente carica un PDF/JPG/PNG senza scegliere manualmente il tipo: Veredoc riconosce il documento, applica il flusso corretto e restituisce un risultato orientato all'azione.

- **Bollette:** lettura strutturata, confronto mercato, verdetto sintetico e azione consigliata.
- **Buste paga:** lettura strutturata, controlli deterministici di coerenza/anomalia e spiegazione delle voci.
- **Storico intelligente:** dalla dashboard, quando esistono almeno due documenti `DONE` dello stesso tipo, Veredoc confronta automaticamente l'ultima analisi con la precedente e mette in evidenza variazioni rilevanti.

I controlli payroll e longitudinali sono segnali di coerenza e variazione. Non costituiscono certificazione fiscale, consulenza del lavoro, verifica legale o diagnosi definitiva della causa di una variazione.

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
  analyze/                          upload auto-detect + polling risultato
  dashboard/                        documenti + quota + storico intelligente
  api/
    documents/upload/               validazione, quota, upload e creazione job
    documents/[id]/                 lettura, recovery analisi e cancellazione
    documents/[id]/refresh-market/  refresh confronto mercato
    jobs/process-analysis/           recovery batch
    jobs/refresh-market-rates/       refresh mercato documenti DONE
    jobs/scrape-market-rates/        scraping tariffe
components/
  FileUploader.tsx                  upload senza selezione manuale tipo
  AnalysisResult.tsx                routing UI risultato
  BollettaDecisionSummary.tsx       verdetto/azione sintetica bolletta
  BollettaReport.tsx                dettaglio tecnico + offerte
  BustaPagaReport.tsx               verdetto anomalie + dettaglio cedolino
  HistoricalInsights.tsx            confronto ultima analisi vs precedente
  DocumentList.tsx
lib/
  ai/
    analyze.ts
    validate.ts
    providers/anthropic.ts          one-pass detection + extraction
  insights/history.ts               motore longitudinale deterministico
  jobs/process-document-core.ts     routing dal tipo rilevato AI
  jobs/process-document.ts
  parsers/
    bolletta.ts
    bustapaga.ts                    engine payroll-coherence-v1
  observability/operations.ts
  security/access.ts
  documents/upload-validation.ts
prisma/schema.prisma
supabase/
tests/
  validation.test.ts
  worker-integration.test.ts
  payroll-verification.test.ts
  history-insights.test.ts
  authorization.test.ts
  observability.test.ts
.github/workflows/ci.yml
```

---

## Flusso upload e auto-detection

1. Utente autenticato.
2. Piano reale e quota mensile verificati prima dello Storage.
3. Redattore JSON/base64 consentito solo PRO.
4. Magic bytes/MIME e limite 10 MB validati server-side.
5. L'utente non seleziona luce/gas/internet/busta paga.
6. Il record `Document` nasce `PENDING`; lo schema non ha un tipo `AUTO`, quindi viene usato un hint iniziale compatibile con lo schema esistente.
7. Claude esegue **una sola chiamata** che riconosce `luce | gas | internet | busta_paga | sconosciuto` ed estrae il payload corrispondente.
8. Il worker sceglie il validator in base al tipo realmente rilevato e salva il tipo definitivo.
9. Retry e recovery restano persistenti sul record.

Nessuna migrazione DB è stata necessaria per l'auto-detection o per lo storico longitudinale.

---

## Worker, lease e recovery

- stati processabili: `PENDING` o `PROCESSING` stale;
- lock ottimistico tramite `status + updatedAt`;
- massimo 3 tentativi;
- lease stale dopo 2 minuti;
- retry con nuovo download da Supabase Storage;
- errore recuperabile → `PENDING`;
- terzo errore → `ERROR`;
- polling documento e `POST /api/jobs/process-analysis` possono recuperare job stale;
- n8n Analysis Recovery è configurato/testato ma al 2026-08-30 resta intenzionalmente **Unpublished**.

---

## Product intelligence bollette

### Risultato singolo documento

`BollettaDecisionSummary.tsx` porta in alto:
- tariffa competitiva / in linea / sopra mercato;
- risparmio potenziale mensile/annuale quando disponibile;
- parte negoziabile;
- CTA al confronto offerte quando economicamente sensata.

`BollettaReport.tsx` mantiene dettaglio fornitore, periodo, consumi, breakdown, voci, offerte e break-even.

### Storico longitudinale

`lib/insights/history.ts` confronta esclusivamente documenti `DONE` dello **stesso tipo** e usa le due analisi più recenti in ordine di caricamento.

Per luce/gas/internet confronta quando disponibili:
- importo totale;
- prezzo unitario della materia energia;
- consumi mensili stimati o consumi estratti.

Il motore distingue in modo prudente casi come:
- spesa salita insieme ai consumi;
- consumi simili ma prezzo unitario aumentato;
- spesa/prezzo in calo;
- situazione sostanzialmente stabile.

Non attribuisce una causa certa quando i dati disponibili non la supportano.

---

## Product intelligence buste paga

### Engine singolo cedolino `payroll-coherence-v1`

Controlli deterministici disponibili:
- quadratura competenze - trattenute vs netto;
- incidenza contributi su imponibile previdenziale;
- compatibilità matematica IRPEF/imponibile fiscale;
- rapporto netto/lordo;
- valori principali negativi/anomali;
- gestione esplicita dei dati insufficienti.

Verdetti: `coerente`, `da_verificare`, `dati_insufficienti`.

### Storico longitudinale payroll

Quando esistono almeno due buste paga `DONE`, Veredoc confronta:
- netto;
- lordo;
- contributi INPS + IRPEF estratti.

Esempi di segnali mostrati:
- netto aumentato/diminuito;
- variazione del lordo nella stessa direzione;
- lordo simile ma trattenute principali in aumento o in calo.

Il sistema non conclude automaticamente che una variazione sia corretta o errata: conguagli, detrazioni, giornate lavorate e altre voci possono spiegarla.

---

## Dashboard

La dashboard mostra:
1. piano e quota mensile coerente con la policy backend;
2. se disponibili, card **Cosa sta cambiando** per bollette e buste paga confrontabili;
3. link diretto all'ultima analisi e alla precedente;
4. storico documenti tradizionale.

Lo storico intelligente non richiede configurazione utente né nuove tabelle: deriva dai JSON di analisi già persistiti.

---

## Sicurezza e autorizzazione

- ownership documento centralizzata in `lib/security/access.ts`;
- job protetti da `JOBS_SECRET` fail-closed con `timingSafeEqual`;
- Supabase Service Role solo server-side;
- upload PRO verificato server-side;
- MIME sniffing server-side;
- reset password con token monouso hashato e scadenza.

---

## Observability

`lib/observability/operations.ts` produce eventi JSON strutturati per worker, Storage, AI e job schedulati. Sono disponibili durata chiamate, tentativi/retry, esiti e conteggi dei job. Non è ancora collegato un backend esterno tipo Sentry; i costi monetari AI non sono ancora calcolati.

---

## Piani

| Piano | Analisi/mese | Redazione PDF client-side |
|---|---:|---|
| FREE | 10 | No |
| PRO | 30 | Sì |

I documenti creati nel mese contano verso la quota indipendentemente dall'esito finale. Dashboard e upload usano la stessa regola.

---

## CI e delivery

Script:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

GitHub Actions esegue lint, typecheck, test e build su push a `main` e su PR.

### Policy deploy dal 2026-08-30

Per lavoro ordinario destinato a `main` **non si apre una PR di staging per default**, per evitare preview deploy Vercel inutili.

Pattern preferito:

```text
INSPECT
→ PREPARE FULL CHANGE
→ ONE ATOMIC COMMIT ON CURRENT MAIN
→ ONE MAIN UPDATE
→ GITHUB ACTIONS
→ ONE PRODUCTION DEPLOY
```

Una PR/preview è usata solo se richiesta esplicitamente, imposta da branch protection, oppure realmente necessaria per validare in sicurezza un cambiamento ad alto rischio. Gli errori introdotti dal delivery vengono corretti con un singolo commit atomico aggiuntivo, senza aprire automaticamente una PR.

---

## Test principali

- magic bytes/MIME spoofing;
- validazione output AI bolletta/busta paga;
- worker concurrency/lease/retry/recovery;
- auto-detection cross-type;
- payroll coherence;
- storico longitudinale bollette/payroll e isolamento tra tipi;
- authorization job/ownership;
- formato observability.

---

## Funzionalità completate

- autenticazione e reset password;
- upload PDF/JPG/PNG;
- auto-detection one-pass;
- quote FREE/PRO;
- redattore PRO;
- analisi Claude bollette/buste paga;
- validazione runtime output;
- decision summary bollette + confronto mercato;
- payroll-coherence-v1;
- dashboard con storico intelligente longitudinale;
- soft delete + cleanup Storage;
- retry/recovery persistente;
- scheduler n8n Market Rates;
- Analysis Recovery n8n configurato/testato, ancora Unpublished;
- CI globale;
- guardie authorization centralizzate;
- observability operativa.

## Prossimi passi consigliati

1. Validare auto-detection, payroll checks e storico longitudinale su documenti reali anonimizzati, misurando falsi positivi e casi non confrontabili.
2. Evolvere lo storico da confronto 1-vs-1 a trend multi-periodo quando esistono almeno 3-4 documenti dello stesso tipo.
3. Per payroll, aggiungere dati strutturati su ferie/permessi/TFR solo dopo aver verificato affidabilità di estrazione su cedolini reali eterogenei.
4. Valutare una knowledge layer normativa/contrattuale versionata per controlli payroll più profondi.
5. Billing reale e subscription lifecycle PRO solo previa approvazione esplicita perché modulo pagamento/critico.
6. Pubblicare n8n Analysis Recovery quando si decide di attivare il recovery automatico ogni 5 minuti.

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
