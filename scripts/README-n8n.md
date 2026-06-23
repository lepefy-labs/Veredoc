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

4. (Opzionale) Aggiungi un nodo **Send Email** o **Slack** per ricevere notifiche in caso di errori.

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
