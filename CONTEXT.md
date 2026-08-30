# CONTEXT.md — Veredoc

> Aggiornato: 2026-08-30 — profili di analisi, storico isolato per soggetto e spostamento documenti tra profili

---

## Cos'è Veredoc

Veredoc è un SaaS italiano che analizza bollette (luce, gas, internet) e buste paga tramite AI. L'utente carica PDF/JPG/PNG senza scegliere manualmente il tipo: Veredoc riconosce il documento, applica il flusso corretto e restituisce un risultato orientato all'azione.

- **Bollette:** lettura strutturata, confronto mercato, verdetto sintetico e azione consigliata.
- **Buste paga:** lettura strutturata, controlli deterministici di coerenza/anomalia e spiegazione delle voci.
- **Profili di analisi:** uno stesso account può separare i documenti di persone, case/nuclei e attività diverse.
- **Storico intelligente:** i confronti longitudinali vengono calcolati esclusivamente tra documenti dello stesso profilo e dello stesso tipo.

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

Relazione principale:

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
- ogni nuovo account nasce con il profilo default `Io`;
- la migrazione `002_analysis_profiles.sql` crea `Io` per ogni account esistente e vi assegna tutti i documenti preesistenti;
- un account può creare ulteriori profili senza raccogliere dati personali non necessari;
- un documento può essere spostato tra profili dello stesso account;
- una route di spostamento rifiuta profili appartenenti ad altri account;
- il profilo default viene usato per gli upload generici senza `profileId`;
- dalla dashboard ogni profilo espone una CTA `Carica per <profilo>` che passa esplicitamente il profilo al flusso upload.

La relazione `Document.profile` è `RESTRICT` in cancellazione: eliminare un profilo non deve cancellare implicitamente documenti. La UI attuale non espone ancora la cancellazione dei profili.

---

## Architettura principale

```text
app/
  analyze/                          upload auto-detect, profile-aware
  dashboard/                        profili, quota, storico e documenti
  api/
    profiles/                       lista/creazione profili
    documents/upload/               upload associato a profilo
    documents/[id]/profile/         spostamento documento tra profili
    documents/[id]/                 lettura/recovery/cancellazione
    documents/[id]/refresh-market/  refresh confronto mercato
    jobs/process-analysis/           recovery batch
components/
  ProfileManager.tsx                creazione e riepilogo profili
  DocumentList.tsx                  documenti + cambio profilo
  HistoricalInsights.tsx            confronto longitudinale
  FileUploader.tsx
  AnalysisResult.tsx
  BollettaDecisionSummary.tsx
  BollettaReport.tsx
  BustaPagaReport.tsx
lib/
  insights/history.ts               confronto deterministico con isolamento profilo
  ai/
  jobs/
  parsers/
  security/
prisma/schema.prisma
supabase/migrations/002_analysis_profiles.sql
supabase/rls.sql
```

---

## Flusso upload

1. Utente autenticato.
2. Piano e quota verificati prima dello Storage.
3. File validato tramite magic bytes/MIME e limite 10 MB.
4. Se il chiamante passa `profileId`, il backend accetta solo un profilo appartenente allo stesso `userId`.
5. Senza `profileId` viene usato il profilo default `Io`.
6. Il documento nasce `PENDING` con `userId + profileId`.
7. Claude esegue auto-detection one-pass di luce/gas/internet/busta paga.
8. Worker, validazione runtime, retry e recovery restano invariati.

---

## Storico longitudinale

`lib/insights/history.ts` non confronta mai documenti appartenenti a profili differenti.

Per ogni profilo:
- bollette: confronta solo stesso tipo (luce con luce, gas con gas, internet con internet);
- buste paga: confronta solo cedolini dello stesso profilo;
- usa esclusivamente documenti `DONE` con analisi valida;
- l'ultima analisi viene confrontata con la precedente.

Questo evita confronti errati, per esempio tra la busta paga dell'utente e quella di un familiare o tra bollette di abitazioni diverse.

---

## Product intelligence

### Bollette

`BollettaDecisionSummary.tsx` porta in alto verdetto, risparmio potenziale e azione consigliata. `BollettaReport.tsx` mantiene il dettaglio tecnico e le offerte.

### Buste paga

`payroll-coherence-v1` controlla quadrature, imponibili, contributi, IRPEF e valori anomali con wording prudente. `BustaPagaReport.tsx` è anomaly-first.

---

## Sicurezza e autorizzazione

- ownership documento centralizzata;
- spostamento documento consentito solo se documento e profilo appartengono alla sessione corrente;
- RLS aggiunta a `AnalysisProfile` oltre a `User`, `Document` e `MarketRate`;
- job protetti da `JOBS_SECRET` fail-closed;
- Supabase Service Role solo server-side;
- upload PRO verificato server-side;
- MIME sniffing server-side.

---

## Migrazione database

File: `supabase/migrations/002_analysis_profiles.sql`.

La migrazione:
1. crea enum `ProfileKind`;
2. crea `AnalysisProfile` e indici;
3. garantisce al massimo un profilo default per user tramite indice parziale;
4. crea `Io` per tutti gli utenti esistenti;
5. aggiunge `Document.profileId`;
6. assegna i documenti esistenti al profilo default del proprietario;
7. rende `profileId` non nullable;
8. aggiunge FK e indice;
9. abilita RLS sulla nuova tabella.

È una migrazione strutturale approvata esplicitamente il 2026-08-30.

---

## CI e delivery

Script:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Per lavoro ordinario destinato a `main` non si apre una PR di staging per default, per evitare preview deploy Vercel inutili. Pattern preferito:

```text
INSPECT → PREPARE FULL CHANGE → ONE ATOMIC COMMIT → ONE MAIN UPDATE → CI → PRODUCTION DEPLOY
```

PR solo se richiesta, imposta da policy o realmente necessaria per validare in sicurezza un cambiamento ad alto rischio.

---

## Test principali

- validazione upload e output AI;
- worker concurrency/lease/retry;
- auto-detection cross-type;
- payroll coherence;
- storico longitudinale bollette/payroll;
- isolamento longitudinale tra profili differenti;
- authorization job/ownership;
- observability.

---

## Prossimi passi consigliati

1. Applicare la migrazione `002_analysis_profiles.sql` in Supabase prima del deploy applicativo corrispondente.
2. Validare profili/spostamento documenti con dati reali di prova.
3. Evolvere lo storico da 1-vs-1 a trend multi-periodo all'interno dello stesso profilo.
4. Aggiungere rename/archive profilo solo quando emerge il bisogno reale, mantenendo la cancellazione documenti separata.
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
