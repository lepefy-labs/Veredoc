# CONTEXT.md — Veredoc

> Aggiornato: 2026-08-30 — profili di analisi, selezione esplicita in upload, dashboard filtrabile e trend longitudinali multi-periodo

---

## Cos'è Veredoc

Veredoc è un SaaS italiano che analizza bollette (luce, gas, internet) e buste paga tramite AI. L'utente carica PDF/JPG/PNG senza scegliere manualmente il tipo: Veredoc riconosce il documento, applica il flusso corretto e restituisce un risultato orientato all'azione.

- **Bollette:** lettura strutturata, confronto mercato, verdetto sintetico e azione consigliata.
- **Buste paga:** lettura strutturata, controlli deterministici di coerenza/anomalia e spiegazione delle voci.
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
- il profilo default viene usato come fallback backend se un upload non specifica `profileId`;
- il flusso `/analyze` carica i profili dell'account e richiede una scelta esplicita prima dell'upload, pre-selezionando il profilo richiesto dalla dashboard o, in assenza, il default `Io`;
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
  ProfileManager.tsx                creazione e riepilogo profili
  ProfileSelector.tsx               selezione profilo prima dell'upload
  ProfileDashboard.tsx              filtro dashboard per profilo
  DocumentList.tsx                  documenti + cambio profilo
  HistoricalInsights.tsx            ultimo-vs-precedente + trend periodo
  FileUploader.tsx
  AnalysisResult.tsx
  BollettaDecisionSummary.tsx
  BollettaReport.tsx
  BustaPagaReport.tsx
lib/
  profiles/selection.ts             risoluzione profilo richiesto/default
  insights/history.ts               confronto ultimo-vs-precedente
  insights/trends.ts                trend deterministico su 3-4 analisi, profile-scoped
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
2. `/analyze` carica `GET /api/profiles` e mostra `Per chi è questo documento?` prima del file uploader.
3. Se l'URL contiene `?profile=<id>` e il profilo appartiene all'account, viene mantenuto; altrimenti viene selezionato il profilo default, oppure il primo disponibile come fallback UI.
4. La scelta profilo viene mantenuta anche nel flusso di redazione PRO e inviata esplicitamente al backend.
5. Piano e quota vengono verificati server-side prima dello Storage.
6. File validato tramite magic bytes/MIME e limite 10 MB.
7. Il backend accetta `profileId` solo se appartiene allo stesso `userId`; senza `profileId` conserva il fallback al profilo default.
8. Il documento nasce `PENDING` con `userId + profileId`.
9. Claude esegue auto-detection one-pass di luce/gas/internet/busta paga.
10. Worker, validazione runtime, retry e recovery restano invariati.

Il CTA principale della dashboard punta al profilo default; le CTA dentro ogni sezione puntano esplicitamente al profilo selezionato. L'utente può comunque cambiare profilo direttamente in `/analyze` prima di scegliere il file.

---

## Storico longitudinale

### Ultimo vs precedente

`lib/insights/history.ts` lavora sui documenti `DONE` con analisi valida e confronta l'ultima analisi con la precedente dello stesso tipo all'interno del profilo visualizzato.

### Trend multi-periodo

`lib/insights/trends.ts` entra in gioco quando esistono almeno 3 documenti comparabili dello stesso tipo. Usa fino alle 4 analisi più recenti e confronta il documento più recente con l'inizio della finestra osservata.

Per le bollette considera quando disponibili:
- spesa totale;
- prezzo unitario della materia energia;
- consumi.

Per le buste paga considera:
- netto;
- lordo.

Il motore trend applica anche un filtro `profileId` interno: anche se un chiamante gli passasse per errore documenti misti, non costruirebbe un trend usando profili diversi.

La dashboard può essere filtrata con chip `Tutti` / singolo profilo. Il filtro nasconde insieme documenti e storico degli altri profili, mantenendo visibile il contesto corretto.

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
- selettore `/analyze` mostra solo profili restituiti dall'API autenticata dell'account;
- il backend continua a validare ownership del `profileId` indipendentemente dalla UI;
- RLS su `AnalysisProfile`, `User`, `Document` e `MarketRate`;
- job protetti da `JOBS_SECRET` fail-closed;
- Supabase Service Role solo server-side;
- upload PRO verificato server-side;
- MIME sniffing server-side.

---

## Database

La migrazione `supabase/migrations/002_analysis_profiles.sql` è stata applicata il 2026-08-30.

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
- payroll coherence;
- risoluzione profilo richiesto/default nel flusso upload;
- storico ultimo-vs-precedente;
- trend multi-periodo bollette/payroll;
- isolamento trend tra profili differenti;
- authorization job/ownership;
- observability.

---

## Prossimi passi consigliati

1. Validare profili, spostamento documenti, selezione upload e trend con dati reali di prova.
2. Per payroll, aggiungere dati strutturati su ferie/permessi/TFR solo dopo aver verificato affidabilità di estrazione su cedolini reali eterogenei.
3. Valutare rename/archive profilo mantenendo la cancellazione documenti separata.
4. Billing reale PRO solo previa approvazione esplicita.
5. Pubblicare n8n Analysis Recovery quando si decide di attivare il recovery automatico.

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
