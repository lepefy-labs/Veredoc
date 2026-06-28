# Veredoc — Architettura e Stato Progetto

## Stack Tecnico
- **Framework**: Next.js 16.2.9 (App Router) + TypeScript
- **Styling**: Tailwind CSS 4
- **ORM**: Prisma 7 (config in `prisma.config.ts`)
- **Database**: Supabase PostgreSQL
- **Auth**: NextAuth v5 beta (JWT strategy, Credentials provider)
- **AI**: Anthropic Claude (claude-haiku-4-5 default)
- **PDF rendering (client)**: pdfjs-dist 4.x
- **PDF compositing (client)**: pdf-lib 1.x
- **Deployment**: Vercel

## Struttura Directory

```
app/
  api/
    admin/set-plan/route.ts
    auth/[...nextauth]/route.ts
    auth/register/route.ts
    documents/
      upload/route.ts       <- POST JSON {fileBase64, mimeType, fileName, tipo}
      [id]/route.ts         <- GET stato documento (polling)
    jobs/scrape-market-rates/route.ts
    market-rates/route.ts
  analyze/page.tsx          <- Flusso: idle → redacting → uploading → done
  dashboard/
  (auth)/login/ (auth)/register/

components/
  DocumentRedactor.tsx      <- Redactor visivo client-side (pdfjs-dist + pdf-lib)
  FileUploader.tsx
  AnalysisResult.tsx

lib/
  ai/
    analyze.ts
    types.ts
    providers/anthropic.ts  <- AnthropicProvider (PDF base64 → Claude → JSON)
  anonymizer/               <- engine.ts, patterns.ts, types.ts (NON usato nel flusso UI)
  parsers/bolletta.ts
  config/constants.ts
  config/texts.ts
  auth.ts
  prisma.ts
```

## Flusso Upload (dopo client-pdf-redactor)

1. Utente seleziona file in `FileUploader` → `flowState = 'redacting'`
2. `DocumentRedactor` renderizza il PDF su canvas con pdfjs-dist (scala 1.5×)
3. Utente disegna rettangoli neri sulle aree sensibili
4. Al click "Invia →": pdf-lib compone un nuovo PDF con i rettangoli applicati → base64
5. `POST /api/documents/upload` con `{fileBase64, mimeType: 'application/pdf', fileName, tipo}`
6. Route crea Document (PENDING), lancia `runAnalysis()` in background → 202
7. `runAnalysis()`: `analyzeDocument()` → Claude → DONE
8. `AnalysisResult` fa polling → mostra risultato

**Il file originale non lascia mai il browser.**

## Schema DB (rilevante)

- `Document.status`: PENDING | PROCESSING | DONE | ERROR | DELETED (AWAITING_CONFIRMATION è nel schema ma non viene più usato)
- `Document.anonymizedText`, `Document.anonymizedMap`: presenti ma non più popolati
- `Document.filePath`: impostato a `""` (upload su Supabase rimosso dal flusso principale)

## Variabili d'Ambiente

| Variabile                  | Descrizione                              |
|----------------------------|------------------------------------------|
| DATABASE_URL               | Supabase connection string (pooler)      |
| DIRECT_URL                 | Supabase direct URL                      |
| NEXT_PUBLIC_SUPABASE_URL   | URL pubblico Supabase                    |
| SUPABASE_SERVICE_ROLE_KEY  | Service role key Supabase                |
| NEXTAUTH_SECRET            | Secret JWT NextAuth                      |
| ANTHROPIC_API_KEY          | API key Anthropic                        |
| ANTHROPIC_MODEL            | Modello Claude (default: claude-haiku-4-5) |
| ADMIN_SECRET               | Bearer token admin endpoint              |
| SCRAPERAPI_KEY             | API key scraping tariffe mercato         |

## Stato Feature

| Feature                            | Stato   |
|------------------------------------|---------|
| Upload + analisi PDF               | Fatto   |
| Redactor visivo client-side        | Fatto   |
| Confronto mercato bollette         | Fatto   |
| Analisi buste paga                 | Fatto   |
| Auth (register/login/session)      | Fatto   |
| UserPlan FREE/PRO                  | Fatto   |
| Admin set-plan endpoint            | Fatto   |
| Soft delete documenti              | Fatto   |
| Scraping tariffe mercato           | Fatto   |
| Anonymizer PRO (AnonymizationPreview, confirm endpoint) | Rimosso |
| API pubblica anonymizer (B2B)      | Futuro  |
| Billing / Stripe                   | Futuro  |
| Rate limiting                      | Futuro  |
