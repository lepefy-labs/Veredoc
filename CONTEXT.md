# CONTEXT.md — Veredoc

> Aggiornato: 2026-06-28

---

## Cos'è Veredoc

SaaS italiano per l'analisi automatica di bollette (luce, gas, internet) e buste paga tramite AI (Claude). L'utente carica un PDF/immagine, riceve una lettura dettagliata di ogni voce con spiegazioni in italiano semplice, e — per le bollette — un confronto con le offerte di mercato correnti.

---

## Stack Tecnico

| Layer | Tecnologia | Versione |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.9 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS 4 | @tailwindcss/postcss ^4 |
| ORM | Prisma | ^7.8.0 |
| Database | Supabase PostgreSQL | — |
| Auth | NextAuth v5 (beta) | 5.0.0-beta.31 |
| AI | Anthropic Claude | @anthropic-ai/sdk ^0.105.0 |
| PDF render | pdfjs-dist | ^4.4.168 |
| PDF compose | pdf-lib | ^1.17.1 |
| Scraping | cheerio | ^1.2.0 |
| Runtime | Node.js / Vercel | — |

---

## Struttura Progetto

```
/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/            NextAuth handler
│   │   ├── auth/register/                 Registrazione utente
│   │   ├── documents/upload/              Upload file + trigger analisi
│   │   ├── documents/[id]/                GET (fetch doc) + DELETE (soft delete)
│   │   ├── documents/[id]/refresh-market/ Ricalcola confronto mercato
│   │   ├── market-rates/                  Lettura tariffe di mercato
│   │   ├── admin/set-plan/                Admin: aggiorna piano utente
│   │   └── jobs/scrape-market-rates/      Scraping offerte da Sorgenia/Illumia/Sostariffe
│   ├── (auth)/login/                      Pagina login
│   ├── (auth)/register/                   Pagina registrazione
│   ├── (pages)/termini/                   Termini di servizio
│   ├── (pages)/privacy/                   Privacy policy
│   ├── analyze/                           Pagina principale upload/analisi
│   ├── dashboard/                         Lista documenti utente
│   ├── layout.tsx                         Root layout (font, Navbar, Providers)
│   ├── page.tsx                           Homepage (landing)
│   └── providers.tsx                      NextAuth SessionProvider
├── components/
│   ├── ui/                                Button, Card, Badge, VeredocLogo
│   ├── layout/Navbar.tsx                  Barra di navigazione
│   ├── FileUploader.tsx                   Drag-drop + selezione tipo documento
│   ├── DocumentRedactor.tsx               Redattore PDF visuale (canvas)
│   ├── AnalysisResult.tsx                 Polling + display risultato analisi
│   ├── BollettaReport.tsx                 Report bolletta con confronto mercato
│   ├── BustaPagaReport.tsx                Report busta paga con breakdown voci
│   └── DocumentList.tsx                   Lista dashboard con soft-delete
├── lib/
│   ├── ai/
│   │   ├── analyze.ts                     Orchestratore analisi (chiamata AI + salvataggio)
│   │   ├── types.ts                       Interfaccia AIProvider
│   │   └── providers/anthropic.ts         Provider Anthropic (prompt bolletta/busta paga)
│   ├── parsers/
│   │   ├── bolletta.ts                    Logica confronto mercato e calcolo risparmi
│   │   └── bustapaga.ts                   Calcoli busta paga (aliquota effettiva, ecc.)
│   ├── config/
│   │   ├── constants.ts                   Limiti, soglie, URL scraping
│   │   └── texts.ts                       Tutti i testi UI in italiano
│   ├── auth.ts                            Config NextAuth + callbacks
│   ├── auth.config.ts                     Validazione credenziali
│   └── prisma.ts                          Prisma singleton
├── prisma/
│   └── schema.prisma                      Schema DB (User, Document, MarketRate)
├── supabase/
│   ├── migrations/                        Migrazioni SQL
│   ├── seeds/                             Seed tariffe di mercato
│   └── rls.sql                            Row-Level Security policies
├── types/
│   ├── bolletta.ts                        Tipi TypeScript per bollette
│   ├── bustapaga.ts                       Tipi TypeScript per buste paga
│   └── next-auth.d.ts                     Estensione session NextAuth
├── middleware.ts                          Protezione route (auth redirect)
├── next.config.ts                         Config Next.js
└── prisma.config.ts                       Config Prisma (DIRECT_URL)
```

---

## Schema Database (Prisma / PostgreSQL)

### Enum

```prisma
enum UserPlan      { FREE  PRO }
enum DocumentType  { BOLLETTA_LUCE  BOLLETTA_GAS  BOLLETTA_INTERNET  BUSTA_PAGA }
enum AnalysisStatus { PENDING  PROCESSING  AWAITING_CONFIRMATION  DONE  ERROR  DELETED }
```

### Modelli

**User**
- `id` (cuid), `email` (unique), `password` (bcrypt), `plan` (default: FREE), `createdAt`

**Document**
- `id`, `userId` (FK), `type`, `fileName`, `filePath` (Supabase Storage)
- `status` (default: PENDING)
- `rawExtracted` (Json?) — Output grezzo AI, immutabile dopo prima analisi
- `analysis` (Json?) — Output arricchito con confronto mercato
- `typeCorrected` (Boolean) — AI ha rilevato tipo diverso da quello selezionato
- `typeSelectedByUser` (String?) — Tipo scelto dall'utente
- `deletedAt` (DateTime?) — Soft delete
- `anonymizedText`, `anonymizedMap` — Legacy, non usati

**MarketRate**
- `id`, `category` (luce/gas/internet), `provider`, `planName`
- `priceValue`, `priceUnit`, `monthlyFee?`, `url?`, `scrapedAt`
- Unique: (provider, planName)

---

## Flusso Upload & Analisi

### Piano FREE
1. Utente seleziona file in `FileUploader` (tipo + file)
2. Validazione client (tipo, dimensione ≤ 10 MB)
3. POST `/api/documents/upload` come FormData
4. Server: verifica quota mensile (10 doc/mese FREE), crea Document (PENDING), carica su Supabase Storage
5. Trigger `runAnalysis()` in background (fire-and-forget, senza await)
6. Risposta immediata 202 con `documentId`
7. Client: polling `/api/documents/[id]` ogni 3s (max 40 poll) tramite `AnalysisResult`
8. Quando status = DONE → mostra `BollettaReport` o `BustaPagaReport`

### Piano PRO
1. Dopo selezione file → stato `redacting`
2. `DocumentRedactor`: render PDF su canvas via pdfjs-dist (scala 1.5×)
3. Utente disegna rettangoli neri sulle aree sensibili; supporto multi-pagina, undo, touch
4. Click "Invia →": pdf-lib compone nuovo PDF con rettangoli → base64
5. POST `/api/documents/upload` come JSON (`fileBase64` + `tipo`)
6. Resto identico a FREE (quota: 30 doc/mese PRO)

> Il file originale non lascia mai il browser prima della redazione (PRO).

---

## Analisi AI

**Modello:** `claude-haiku-4-5` (configurabile via `ANTHROPIC_MODEL`)

**Invio contenuto:**
- PDF → blocco `document` (base64)
- JPEG/PNG → blocco `image` (base64)
- Max tokens output: 2048

### Prompt Bolletta
Estrae in JSON: `tipo_rilevato`, `tipo`, `fornitore`, `offerta_nome`, `periodo`, `consumi`, `materia_energia` (costi negoziabili), `rete_e_oneri` (regolati ARERA), `imposte`, `altro`, `importo_totale`, `voci_dettaglio`

### Prompt Busta Paga
Estrae in JSON: `tipo_rilevato`, `datore_lavoro`, `competenza`, `stipendio_lordo`, `netto`, `voci` (competenze/trattenute con spiegazioni), `contributi_inps`, `irpef`, `tfr_maturato`

---

## Confronto Mercato (`lib/parsers/bolletta.ts`)

- Recupera tutte le `MarketRate` per la categoria del documento
- Calcola costo attuale utente: prezzo/kWh × kWh_mensili + quota fissa
- Per ogni offerta di mercato: costo stimato mensile, risparmio mensile/annuale, breakeven kWh
- Calcola media e minimo di mercato, percentuale dell'utente sopra la media
- Restituisce le top 5 offerte per costo totale mensile
- Include tariffa ARERA di riferimento se disponibile
- Banner risparmio mostrato se saving ≥ €50/anno (configurabile in `constants.ts`)

---

## Autenticazione & Autorizzazione

- **Strategy:** JWT (Credentials provider, email + password)
- **Password:** bcryptjs, 12 round
- **Session:** JWT con `user.id` e `user.plan`
- **Middleware:** protegge `/analyze`, `/dashboard` (redirect a `/login`); redirect a `/dashboard` se già loggato

---

## API Endpoints

| Endpoint | Metodo | Auth | Scopo |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | — | NextAuth (sign-in/out/callback) |
| `/api/auth/register` | POST | — | Crea account utente |
| `/api/documents/upload` | POST | Session | Upload + trigger analisi |
| `/api/documents/[id]` | GET | Session (owner) | Fetch documento |
| `/api/documents/[id]` | DELETE | Session (owner) | Soft delete |
| `/api/documents/[id]/refresh-market` | POST | Session (owner) | Ricalcola confronto mercato |
| `/api/market-rates` | GET | — | Tariffe di mercato per categoria |
| `/api/admin/set-plan` | POST | Bearer `ADMIN_SECRET` | Upgrade/downgrade piano utente |
| `/api/jobs/scrape-market-rates` | POST | Bearer `JOBS_SECRET` | Scraping offerte mercato |

---

## Variabili d'Ambiente

| Variabile | Obbligatoria | Descrizione |
|---|---|---|
| `DATABASE_URL` | ✅ | Stringa connessione Supabase (pooler) |
| `DIRECT_URL` | ✅ | Stringa connessione diretta (migrazioni) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL pubblico Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Chiave service role Supabase |
| `NEXTAUTH_SECRET` | ✅ | Segreto JWT NextAuth (32+ char) |
| `ANTHROPIC_API_KEY` | ✅ | Chiave API Anthropic |
| `ADMIN_SECRET` | ✅ | Token Bearer per endpoint admin |
| `JOBS_SECRET` | ✅ | Token Bearer per endpoint job |
| `SCRAPERAPI_KEY` | ✅ | Chiave ScraperAPI per scraping |
| `ANTHROPIC_MODEL` | ❌ | Modello Claude (default: `claude-haiku-4-5`) |
| `AI_PROVIDER` | ❌ | Provider AI: `anthropic` (default), `openai`, `gemini` |
| `NEXTAUTH_URL` | ❌ | URL sessione (default: `http://localhost:3000`) |

---

## Piani & Limiti

| Piano | Documenti/mese | Redazione PDF |
|---|---|---|
| FREE | 10 | No |
| PRO | 30 | Sì (DocumentRedactor) |

Upgrade piano tramite `/api/admin/set-plan` (Bearer token).

---

## Stato Attuale

### Completato ✅
- Upload file (FormData e JSON base64)
- Analisi AI bollette (luce/gas/internet) e buste paga
- Confronto mercato con top 5 offerte e calcolo risparmi
- Redattore PDF visuale (PRO) con multi-pagina, undo, touch support
- Autenticazione (NextAuth v5 JWT + bcrypt)
- Sistema piani FREE/PRO con quote mensili
- Soft delete documenti (azzeramento dati sensibili + rimozione Storage)
- Dashboard lista documenti
- Scraping tariffe di mercato (Sorgenia, Illumia, Sostariffe)
- Endpoint admin per gestione piani
- Testi UI completamente in italiano
- Endpoint refresh confronto mercato (senza nuova chiamata AI)

### Non ancora implementato / Future features
- Anonimizzatore server-side (campo legacy presente in DB, rimosso dal flusso UI)
- Pagamenti / billing (Stripe o simili)
- Provider AI alternativi (OpenAI, Gemini — stub presenti in `lib/ai/providers/`)
- Background job `refresh-market-rates` (stub presente, logica da implementare)
- Email di benvenuto / notifiche
- Supporto multi-lingua

---

## Deployment

- **Hosting:** Vercel (auto-deploy da `main`)
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage (PDF/immagini)
- **Comandi:**
  - `pnpm dev` — sviluppo locale (porta 3000)
  - `pnpm build` — build produzione
  - `pnpm start` — server produzione
  - `pnpm lint` — linting ESLint
