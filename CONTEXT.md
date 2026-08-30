# CONTEXT.md — Veredoc

> Aggiornato: 2026-08-30 — profili, trend longitudinali e payroll intelligence v2

---

## Cos'è Veredoc

Veredoc è un SaaS italiano che analizza bollette (luce, gas, internet) e buste paga tramite AI. L'utente carica PDF/JPG/PNG senza scegliere manualmente il tipo: Veredoc riconosce il documento, applica il flusso corretto e restituisce un risultato orientato all'azione.

- **Bollette:** lettura strutturata, confronto mercato, verdetto sintetico e azione consigliata.
- **Buste paga:** lettura strutturata, controlli deterministici di coerenza/anomalia, ferie/permessi/ROL, TFR e voci variabili quando esplicitamente presenti.
- **Profili di analisi:** uno stesso account può separare i documenti di persone, case/nuclei e attività diverse.
- **Storico intelligente:** i confronti longitudinali vengono calcolati esclusivamente tra documenti dello stesso profilo e dello stesso tipo.
- **Trend multi-periodo:** da 3 documenti comparabili in poi Veredoc aggiunge una lettura del periodo usando fino alle 4 analisi più recenti.

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
  analyze/                          upload auto-detect, selezione profilo esplicita
  dashboard/                        profili, quota, filtro profilo, storico e documenti
  api/
    profiles/                       lista/creazione profili
    documents/upload/               upload associato a profilo
    documents/[id]/profile/         spostamento documento tra profili
    documents/[id]/                 lettura/recovery/cancellazione
    documents/[id]/refresh-market/  refresh confronto mercato
    jobs/process-analysis/           recovery batch
components/
  ProfileManager.tsx
  ProfileSelector.tsx               selezione profilo prima dell'upload
  ProfileDashboard.tsx
  DocumentList.tsx
  HistoricalInsights.tsx
  BustaPagaReport.tsx               report anomaly-first + dati operativi payroll
lib/
  profiles/selection.ts
  insights/history.ts
  insights/trends.ts
  parsers/bustapaga.ts              payroll-coherence-v2
  ai/
  jobs/
  security/
prisma/schema.prisma
supabase/migrations/002_analysis_profiles.sql
supabase/rls.sql
```

---

## Flusso upload

1. Utente autenticato.
2. `/analyze` carica i profili e risolve il profilo richiesto; un id assente o non valido ricade sul profilo default lato UI.
3. L'utente vede `Per chi è questo documento?` e può cambiare profilo prima dell'upload.
4. Piano e quota sono verificati prima dello Storage.
5. File validato tramite magic bytes/MIME e limite 10 MB.
6. Il backend accetta `profileId` solo se appartiene allo stesso `userId`; senza id usa il profilo default.
7. Il documento nasce `PENDING` con `userId + profileId`.
8. Claude esegue auto-detection one-pass di luce/gas/internet/busta paga.
9. Worker, validazione runtime, retry e recovery restano invariati.

---

## Storico longitudinale

### Ultimo vs precedente

`lib/insights/history.ts` lavora sui documenti `DONE` con analisi valida e confronta l'ultima analisi con la precedente dello stesso tipo all'interno del profilo visualizzato.

### Trend multi-periodo

`lib/insights/trends.ts` entra in gioco quando esistono almeno 3 documenti comparabili dello stesso tipo. Usa fino alle 4 analisi più recenti e confronta il documento più recente con l'inizio della finestra osservata.

Per le bollette considera quando disponibili spesa totale, prezzo unitario e consumi. Per le buste paga considera netto e lordo. Il motore trend applica anche un filtro `profileId` interno.

La dashboard può essere filtrata con chip `Tutti` / singolo profilo. Il filtro nasconde insieme documenti e storico degli altri profili.

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
- acquisizione informativa di saldi ed eventi del periodo per spiegare variazioni mensili future.

`BustaPagaReport.tsx` mostra una sezione `Cosa è successo questo mese` solo quando questi dati sono realmente disponibili.

I test includono payload payroll sintetici ma realistici e anonimizzati per validare schema, categorie e motore deterministico. Questi test NON dimostrano ancora l'affidabilità di estrazione di Claude su cedolini reali eterogenei: quella validazione richiede un corpus reale/anomizzato e rimane un prossimo passo di prodotto.

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

La migrazione `supabase/migrations/002_analysis_profiles.sql` è stata applicata il 2026-08-30. Non sono richieste nuove migrazioni per payroll intelligence v2: i nuovi campi vivono nel JSON di analisi già esistente.

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
- worker concurrency/lease/retry;
- auto-detection cross-type;
- payroll coherence v2;
- payload payroll realistici sintetici per saldi/TFR/eventi variabili;
- storico ultimo-vs-precedente;
- trend multi-periodo bollette/payroll;
- isolamento trend tra profili differenti;
- authorization job/ownership;
- observability.

---

## Prossimi passi consigliati

1. Validare l'estrazione payroll v2 su un corpus di cedolini reali eterogenei e anonimizzati prima di attribuire affidabilità ai nuovi campi.
2. Dopo la validazione, estendere i trend payroll a ferie/permessi/TFR, straordinari, premi, assenze e nuove/scomparse voci.
3. Evolvere le bollette da trend a monitoraggio tariffa/consumo con spiegazione della causa dominante.
4. Valutare rename/archive profilo mantenendo la cancellazione documenti separata.
5. Billing reale PRO solo previa approvazione esplicita.
6. Pubblicare n8n Analysis Recovery quando si decide di attivare il recovery automatico.

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
