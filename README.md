# Veredoc

Analizza bollette e buste paga con AI. Estrae i dati automaticamente, spiega ogni voce in italiano semplice e confronta i costi con il mercato.

## Setup locale

### Prerequisiti

- Node.js 20+
- pnpm
- Account Supabase (DB + Storage)
- Chiave API Anthropic
- Chiave API ScraperAPI

### 1. Clona e installa dipendenze

```bash
git clone https://github.com/lepefy-labs/veredoc.git
cd veredoc
pnpm install
```

### 2. Configura variabili d'ambiente

Copia `.env.local` e compila i valori:

```bash
cp .env.local .env.local.copy  # backup
```

Modifica `.env.local`:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
ANTHROPIC_API_KEY="sk-ant-..."
NEXTAUTH_SECRET="stringa-casuale-32-char"
NEXTAUTH_URL="http://localhost:3000"
SCRAPERAPI_KEY="..."
JOBS_SECRET="stringa-casuale-32-char"
```

### 3. Configura Supabase Storage

Crea un bucket `documents` su Supabase Storage (Public o con policy RLS appropriata).

### 4. Esegui migration database

```bash
pnpm dlx prisma migrate dev --name init
```

### 5. Avvia in sviluppo

```bash
pnpm dev
```

Apri [http://localhost:3000](http://localhost:3000).

---

## Struttura progetto

```
app/
  (auth)/login|register/   # Pagine autenticazione
  dashboard/               # Lista documenti utente
  analyze/                 # Upload e risultato analisi
  api/
    auth/                  # NextAuth + registrazione
    documents/upload|[id]/ # Upload e fetch documento
    market-rates/          # Tariffe mercato dal DB
    jobs/scrape-market-rates/ # Job notturno scraping
lib/
  anthropic.ts             # Client Claude + prompts
  auth.ts                  # Configurazione NextAuth
  prisma.ts                # Singleton Prisma
  config/
    constants.ts           # Soglie e costanti
    texts.ts               # Testi UI modificabili
  parsers/
    bolletta.ts            # Confronto mercato
    bustapaga.ts           # Calcoli busta paga
components/
  FileUploader.tsx
  AnalysisResult.tsx
  BollettaReport.tsx
  BustaPagaReport.tsx
  ui/                      # Button, Card, Badge
types/
  bolletta.ts
  bustapaga.ts
```

## Deploy su Vercel

1. Importa il repo su Vercel
2. Aggiungi tutte le variabili d'ambiente nelle Settings → Environment Variables
3. Imposta `NEXTAUTH_URL` = `https://veredoc.vercel.app`
4. Ogni push su `main` fa deploy automatico

## Automazione scraping (n8n)

Vedi `scripts/README-n8n.md` per configurare il workflow n8n che aggiorna le tariffe ogni notte.

## Configurazione

Tutto ciò che è modificabile senza toccare la logica applicativa è in `lib/config/`:

- `constants.ts` — soglie numeriche, limiti, costanti
- `texts.ts` — tutti i testi dell'interfaccia
