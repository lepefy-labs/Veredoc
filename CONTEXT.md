# Veredoc — Contesto Architetturale

## Panoramica

Veredoc analizza bollette (luce, gas, internet) e buste paga italiane tramite AI. Carica il documento, lo invia al provider AI, estrae dati strutturati in JSON, confronta i costi col mercato e li presenta in italiano semplice.

---

## Stack Tecnico

| Layer | Tecnologia |
|---|---|
| Framework | Next.js (App Router) |
| Linguaggio | TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Storage file | Supabase Storage |
| Auth | NextAuth.js |
| AI (default) | Anthropic Claude (`@anthropic-ai/sdk`) |
| Scraping tariffe | ScraperAPI |
| Deploy | Vercel |

---

## Architettura

```
app/
  (auth)/login|register/        # Pagine autenticazione
  dashboard/                    # Lista documenti utente
  analyze/                      # Upload + risultato analisi
  api/
    auth/                       # NextAuth + registrazione
    documents/
      upload/route.ts           # POST: upload + avvia analisi asincrona
      [id]/route.ts             # GET: stato e risultato documento
    market-rates/               # GET: tariffe mercato dal DB
    jobs/scrape-market-rates/   # Job notturno scraping tariffe

lib/
  ai/                           # Layer di astrazione AI provider
    index.ts                    # Unico export pubblico: analyzeDocument + types
    analyze.ts                  # Legge AI_PROVIDER env, istanzia provider
    types.ts                    # AIProvider, AnalyzeDocumentParams, AnalyzeDocumentResult
    providers/
      anthropic.ts              # AnthropicProvider: usa ANTHROPIC_MODEL env
      openai.ts                 # OpenAIProvider: stub (non implementato)
      gemini.ts                 # GeminiProvider: stub (non implementato)
  auth.ts                       # Config NextAuth
  prisma.ts                     # Singleton Prisma
  config/
    constants.ts                # Soglie numeriche, limiti, costanti
    texts.ts                    # Testi UI modificabili
  parsers/
    bolletta.ts                 # arricchisciConFrontoMercato()
    bustapaga.ts                # Calcoli busta paga

components/
  FileUploader.tsx
  AnalysisResult.tsx
  BollettaReport.tsx
  BustaPagaReport.tsx
  ui/                           # Button, Card, Badge

types/
  bolletta.ts                   # BollettaData
  bustapaga.ts                  # BustaPagaData
```

---

## Layer AI (`lib/ai/`)

### Interfacce (`types.ts`)

```ts
interface AIProvider {
  analyzeDocument(params: AnalyzeDocumentParams): Promise<AnalyzeDocumentResult>
}

interface AnalyzeDocumentParams {
  fileBase64: string
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png'
  documentType: 'BOLLETTA_LUCE' | 'BOLLETTA_GAS' | 'BOLLETTA_INTERNET' | 'BUSTA_PAGA'
}

interface AnalyzeDocumentResult {
  raw: unknown   // JSON estratto dall'AI
  provider: string
}
```

### Selezione provider (`analyze.ts`)

Legge `process.env.AI_PROVIDER` (default: `'anthropic'`). Usa `require()` lazy per non caricare SDK non usati.

### Provider Anthropic (`providers/anthropic.ts`)

- Modello: `process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5'`
- Supporta PDF (via `document` block) e immagini (via `image` block)
- Prompt differenziati per bollette vs busta paga
- Estrae il primo oggetto JSON dalla risposta

---

## Flusso di analisi documento

1. `POST /api/documents/upload` riceve il file via FormData
2. Valida tipo e dimensione
3. Carica il file su Supabase Storage
4. Crea record `Document` in DB con `status: PENDING`
5. Lancia `runAnalysis()` in background (`void`)
6. Ritorna `{ id, status: "PENDING" }` con HTTP 202
7. `runAnalysis()` chiama `analyzeDocument()` da `lib/ai`
8. Il provider AI restituisce `{ raw, provider }`
9. Per bollette: `arricchisciConFrontoMercato(raw)` aggiunge confronto mercato
10. Aggiorna DB con `status: DONE`, `rawExtracted`, `analysis`

---

## Variabili d'Ambiente

| Variabile | Default | Descrizione |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Chiave API Anthropic (obbligatoria se AI_PROVIDER=anthropic) |
| `AI_PROVIDER` | `anthropic` | Provider AI: `anthropic` \| `openai` \| `gemini` |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5` | Modello Claude da usare |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | — | URL progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | Chiave pubblica Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Chiave service role Supabase |
| `NEXTAUTH_SECRET` | — | Segreto NextAuth (32+ char) |
| `NEXTAUTH_URL` | — | URL base app |
| `SCRAPERAPI_KEY` | — | Chiave ScraperAPI per tariffe mercato |
| `JOBS_SECRET` | — | Token per proteggere endpoint job notturni |

---

## Tipi di documento supportati

| Tipo | `DocumentType` Prisma | Prompt |
|---|---|---|
| Bolletta luce | `BOLLETTA_LUCE` | Bolletta italiana |
| Bolletta gas | `BOLLETTA_GAS` | Bolletta italiana |
| Bolletta internet | `BOLLETTA_INTERNET` | Bolletta italiana |
| Busta paga | `BUSTA_PAGA` | Cedolino stipendio |

---

## Stato attuale

- Implementazione Anthropic: **completa e funzionante**
- Implementazione OpenAI: **stub** (lancia eccezione)
- Implementazione Gemini: **stub** (lancia eccezione)
- Analisi bollette con confronto mercato: **attiva**
- Analisi buste paga: **attiva**
