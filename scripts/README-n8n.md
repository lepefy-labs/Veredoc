# Configurazione workflow n8n — Scraping tariffe mercato

## Obiettivo

Aggiornare ogni notte le tariffe di mercato nel DB, chiamando l'endpoint interno di Veredoc.

## Setup workflow n8n

1. Apri n8n e crea un nuovo workflow.
2. Aggiungi un nodo **Schedule Trigger**:
   - Mode: `Cron`
   - Cron Expression: `0 2 * * *` (ogni notte alle 02:00)

3. Aggiungi un nodo **HTTP Request**:
   - Method: `POST`
   - URL: `https://veredoc.vercel.app/api/jobs/scrape-market-rates`
   - Authentication: `Header Auth`
   - Header Name: `Authorization`
   - Header Value: `Bearer <JOBS_SECRET>` — usa il valore dalla variabile d'ambiente Vercel

4. Aggiungi un secondo nodo **HTTP Request** (collegato al primo, eseguito dopo):

## Step 2 — Aggiorna confronto mercato sui documenti esistenti

Dopo il nodo HTTP Request dello scraping tariffe, aggiungere un secondo nodo HTTP Request:

- Method: `POST`
- URL: `https://veredoc.vercel.app/api/jobs/refresh-market-rates`
- Authentication: `Header Auth`
- Header Name: `Authorization`
- Header Value: `Bearer <JOBS_SECRET>`

In questo modo ogni notte:
1. Le tariffe vengono aggiornate nella tabella MarketRate
2. Tutti i documenti bolletta già analizzati ricevono il confronto aggiornato
   senza rieseguire l'analisi AI

5. (Opzionale) Aggiungi un nodo **Send Email** o **Slack** per ricevere notifiche in caso di errori.

## Variabili da impostare

| Variabile      | Dove                        | Valore                              |
|----------------|-----------------------------|-------------------------------------|
| `JOBS_SECRET`  | Vercel Environment Variables | Stringa casuale sicura (min 32 char) |
| `SCRAPERAPI_KEY` | Vercel Environment Variables | Chiave API da scraperapi.com       |

## Risposta attesa

```json
{
  "updated": 5,
  "inserted": 12,
  "errors": []
}
```

Se `errors` non è vuoto, controllare i log Vercel per dettagli.

---

# Workflow n8n — Analysis Recovery

## Obiettivo

Riprendere automaticamente i documenti rimasti in coda (`PENDING`) o con lease scaduto (`PROCESSING` da oltre 6 minuti) e chiudere in `ERROR` quelli con tentativi esauriti. Senza questo workflow un documento viene recuperato solo quando il proprietario lo apre (`GET /api/documents/[id]`).

## Import

1. In n8n crea una credenziale **Header Auth** chiamata `Veredoc JOBS_SECRET`:
   - Name: `Authorization`
   - Value: `Bearer <JOBS_SECRET>` (valore della variabile d'ambiente Vercel; non salvarlo nel repository)
2. Importa `scripts/n8n/analysis-recovery.workflow.json` (*Workflows → Import from file*).
3. Apri il nodo **Recovery analisi** e seleziona la credenziale creata al punto 1.
4. Esegui manualmente una volta (*Execute workflow*) e verifica la risposta.
5. Attiva il workflow.

Frequenza: ogni 5 minuti. Il lease dura 6 minuti e ogni esecuzione non avvia nuove analisi dopo 60 s, quindi le esecuzioni non si sovrappongono in modo utile; anche se accadesse, il claim atomico impedisce doppie elaborazioni.

## Risposta attesa

```json
{
  "success": true,
  "candidates": 0,
  "pending": 0,
  "staleProcessing": 0,
  "attempted": 0,
  "deferred": 0,
  "completed": 0,
  "retryScheduled": 0,
  "failed": 0,
  "exhausted": 0,
  "leaseLost": 0,
  "skipped": 0,
  "unconfirmed": 0,
  "durationMs": 120,
  "notifications": { "skipped": true, "reason": "notifications_disabled" }
}
```

Lo stesso job recupera le notifiche email dell'analisi: accoda gli avvisi di attesa persi e ritenta gli invii falliti o interrotti. Con `NOTIFICATIONS_ENABLED=true` il campo `notifications` contiene solo contatori (`enqueuedDelayed`, `claimed`, `sent`, `cancelled`, `retryScheduled`, `failed`, `crashed`, `purged`). Non serve un workflow aggiuntivo: l'invio normale parte direttamente dal server.

`401` indica una credenziale errata. `unconfirmed > 0` richiede di controllare nei log Vercel gli eventi `analysis.persistence_unconfirmed` / `analysis.worker_crashed`.

