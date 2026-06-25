# Veredoc — Architettura e Stato Progetto

## Stack Tecnico
- **Framework**: Next.js 16 App Router + TypeScript
- **Styling**: Tailwind CSS 4
- **ORM**: Prisma 7 (Prisma Client JS, configurazione in `prisma.config.ts`)
- **Database**: Supabase (PostgreSQL) + Supabase Storage
- **Auth**: NextAuth v5 beta (JWT strategy, Credentials provider)
- **AI**: Anthropic Claude (claude-haiku-4-5 default, override via `ANTHROPIC_MODEL`)
- **Deployment**: Vercel
- **Package Manager**: pnpm

## Note Critiche
- **Prisma 7**: `url` e `directUrl` NON vanno in `schema.prisma` — sono in `prisma.config.ts`
- **Migrations**: non si usa `prisma migrate dev`. Lo schema viene applicato manualmente su Supabase SQL Editor
- **Source of truth SQL**: `supabase/migrations/001_schema.sql`
- **prisma generate**: gira automaticamente via `postinstall` su Vercel

## Struttura Directory

```
app/
  api/
    admin/set-plan/route.ts         <- POST (ADMIN_SECRET) per cambiare plan utente
    auth/
      [...nextauth]/route.ts        <- NextAuth handlers
      register/route.ts             <- POST registrazione utente
    documents/
      upload/route.ts               <- Upload PDF + avvio analisi AI
      [id]/route.ts                 <- GET stato documento
      [id]/confirm/route.ts         <- POST conferma analisi PRO (step AWAITING_CONFIRMATION)
    jobs/
      scrape-market-rates/route.ts  <- POST job scraping tariffe mercato (SCRAPERAPI_KEY)
    market-rates/route.ts           <- GET tariffe mercato (query param: ?category=)
  dashboard/                        <- UI dashboard utente
  analyze/                          <- Pagina analisi documento
  (auth)/login/ (auth)/register/    <- Pagine auth

lib/
  ai/
    analyze.ts                <- Factory provider AI
    types.ts                  <- AnalyzeDocumentParams (include textOverride per PRO)
    providers/
      anthropic.ts            <- Implementazione Claude (supporta textOverride)
      openai.ts / gemini.ts   <- Stub (non implementati)
  anonymizer/                 <- Modulo anonimizzazione PII (PRO users)
    types.ts                  <- EntityType, DetectedEntity, AnonymizationResult
    patterns.ts               <- Regex per CF, IBAN, P.IVA, POD, PDR, email, ecc.
    engine.ts                 <- anonymize() e deanonymize()
    index.ts                  <- Export pubblico del modulo
  parsers/
    bolletta.ts               <- Arricchimento con confronto mercato
    bustapaga.ts              <- Calcoli derivati (aliquota effettiva, TFR)
  config/
    constants.ts              <- Soglie, limiti, URL scraping
    texts.ts                  <- Stringhe UI in italiano
  auth.ts                     <- NextAuth config con plan nel JWT/session
  auth.config.ts              <- Route protette middleware
  prisma.ts                   <- PrismaClient singleton

types/
  next-auth.d.ts              <- Estensione tipi NextAuth (User.plan, Session.plan, JWT.plan)
  bolletta.ts                 <- Tipi analisi bollette
  bustapaga.ts                <- Tipi analisi buste paga

prisma/
  schema.prisma               <- Schema Prisma (UserPlan enum, User.plan field)

supabase/migrations/
  001_schema.sql              <- Schema SQL + migration UserPlan (appendere al DB esistente)

scripts/                      <- Script scraping tariffe mercato
```

## Schema DB (Prisma)

### Enums
- `DocumentType`: BOLLETTA_LUCE | BOLLETTA_GAS | BOLLETTA_INTERNET | BUSTA_PAGA
- `AnalysisStatus`: PENDING | PROCESSING | **AWAITING_CONFIRMATION** | DONE | ERROR | DELETED
- `UserPlan`: FREE | PRO

### Modelli
- **User**: id, email, password, plan (UserPlan, default FREE), documents[], createdAt
- **Document**: id, userId, type, filePath, fileName, status, rawExtracted (JSON), analysis (JSON), **anonymizedText (String?)**, **anonymizedMap (JSON?)**, createdAt, updatedAt, **deletedAt (DateTime?)**
- **MarketRate**: id, category, provider, planName, priceValue, priceUnit, url, scrapedAt — unique su `(provider, planName)`

## Flusso Upload Documento

```
POST /api/documents/upload
  -> auth check
  -> validazione file (tipo + dimensione)
  -> upload su Supabase Storage
  -> fetch userPlan da DB
  -> create Document (PENDING)
  -> 202 { id, status: "PENDING" }
  -> [async] runAnalysis()

runAnalysis() -- FREE:
  PDF -> Claude (analisi diretta) -> salva DONE

runAnalysis() -- PRO:
  PDF -> Claude (estrai testo grezzo)
      -> anonymize()
      -> salva anonymizedText + anonymizedMap su Document
      -> status = AWAITING_CONFIRMATION
      -> l'utente può modificare la mappa via AnonymizationPreview
      -> POST /api/documents/[id]/confirm  (con mappa opzionale)
      -> Claude (analisi su testo anonimizzato)
      -> deanonymize()
      -> salva DONE, cancella anonymizedText/anonymizedMap
```

## Modulo Anonymizer (`lib/anonymizer/`)

Anonimizza PII italiani dal testo prima di inviarlo all'AI (solo utenti PRO):

| EntityType      | Pattern                                        |
|-----------------|------------------------------------------------|
| CODICE_FISCALE  | Formato standard codice fiscale IT             |
| IBAN            | IT + 2 cifre + 23 alfanumerici (con spazi)     |
| PARTITA_IVA     | 11 cifre                                       |
| POD             | IT###E########                                 |
| PDR             | 14 cifre                                       |
| TELEFONO        | Fissi e mobili IT, con/senza +39               |
| EMAIL           | RFC standard                                   |
| NUMERO_CONTO    | 10-12 cifre precedute da c/c, conto, n.        |
| NOME            | Token dopo keyword contestuale (Intestatario:) |
| INDIRIZZO       | Via/Viale/Corso/Piazza + testo + civico        |

**API**:
- `anonymize(text, options?)` -> `{ anonymized, map, entities }`
- `deanonymize(text, map)` -> testo ripristinato

## Variabili d'Ambiente

| Variabile                     | Descrizione                                    |
|-------------------------------|------------------------------------------------|
| `DATABASE_URL`                | Supabase connection string (pooler)            |
| `DIRECT_URL`                  | Supabase direct URL (per prisma config)        |
| `NEXT_PUBLIC_SUPABASE_URL`    | URL pubblico Supabase                          |
| `SUPABASE_SERVICE_ROLE_KEY`   | Service role key Supabase                      |
| `NEXTAUTH_SECRET`             | Secret per NextAuth JWT                        |
| `ANTHROPIC_API_KEY`           | API key Anthropic                              |
| `ANTHROPIC_MODEL`             | Modello Claude (default: claude-haiku-4-5)     |
| `AI_PROVIDER`                 | Provider AI (default: anthropic)               |
| `ADMIN_SECRET`                | Bearer token per POST /api/admin/set-plan      |
| `SCRAPERAPI_KEY`              | API key ScraperAPI per job scraping tariffe     |

## Admin: Promuovere Utente a PRO

```bash
curl -X POST https://veredoc.vercel.app/api/admin/set-plan \
  -H "Authorization: Bearer <ADMIN_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "plan": "PRO"}'
```

## Stato Feature

| Feature                              | Stato     |
|--------------------------------------|-----------|
| Upload + analisi PDF                 | Fatto     |
| Confronto mercato bollette           | Fatto     |
| Analisi buste paga                   | Fatto     |
| Auth (register/login/session)        | Fatto     |
| UserPlan (FREE/PRO) su User          | Fatto     |
| Anonymizer layer PRO                 | Fatto     |
| Flusso AWAITING_CONFIRMATION PRO     | Fatto     |
| AnonymizationPreview (revisione PII) | Fatto     |
| Admin set-plan endpoint              | Fatto     |
| Soft delete documenti (deletedAt)    | Fatto     |
| Scraping tariffe mercato (ScraperAPI)| Fatto     |
| GET /api/market-rates                | Fatto     |
| API pubblica anonymizer              | Futuro    |
| API key per developer esterni        | Futuro    |
| Billing / Stripe                     | Futuro    |
| UI upgrade PRO                       | Futuro    |
| Rate limiting                        | Futuro    |
