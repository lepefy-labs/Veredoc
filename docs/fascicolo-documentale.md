# Fascicolo documentale

Il fascicolo riusa `UserCase`. Un collegamento individua una pratica, il requisito della sua versione e un documento dell’archivio. Il primo rilascio propone file originali presenti nello stesso profilo. Il collegamento esprime disponibilità dichiarata dall’utente. Le risposte e i passaggi del motore continuano a determinare l’avanzamento.

## Accesso e dati

Il backend controlla sessione, proprietà di caso e documento, profilo e applicabilità del requisito. Le autorizzazioni del CAF richiederanno un progetto separato. La tabella è riservata alla connessione server, con RLS e privilegi rimossi per i ruoli dell’API. Una seconda verifica nel database protegge ownership, profilo, tipo di requisito e presenza del file. L’associazione contiene identificativi e data; l’export contiene gli stessi riferimenti. Eliminazione, spostamento di profilo o perdita del file rimuovono i collegamenti in modo transazionale. L’analisi e l’estrazione seguono il flusso esistente.

## Migrazione e rollback

1. Eseguire la migrazione su un Postgres isolato due volte con dati sintetici. Verificare collegamento, ripetizione, revoca, eliminazione, cambio di profilo, riuso di un file in più casi, isolamento tra account, privilegi e export.
2. Prima dell’applicazione su produzione, ottenere approvazione per lo schema e per il collegamento a dati già presenti. Verificare data, retention e prova di ripristino del backup Postgres. Documentare il punto di ripristino e il risultato della prova. La migrazione si limita alle relazioni e non modifica il bucket. I backup del database Supabase non includono gli oggetti Storage. [Database Backups](https://supabase.com/docs/guides/platform/backups).
3. Applicare la migrazione con la funzione disabilitata. Controllare vincoli, trigger, RLS e assenza di privilegi per i ruoli client. Impostare `CASE_EVIDENCE_TESTER_IDS` all’identificativo dell’account di collaudo prima di abilitare `CASE_EVIDENCE_ENABLED=true`. Usare un file sintetico. L’accesso generale richiede una decisione separata dopo il collaudo.
4. Per sospendere l’accesso disabilitare `CASE_EVIDENCE_ENABLED` e ridistribuire. Conservare le relazioni e le protezioni del database per mantenere accessi, revoche ed export coerenti. Prima della rimozione dello schema, esportare le relazioni in un backup riservato e migrare l’app a una versione compatibile con la loro assenza. Il ripristino completo del database è riservato ai guasti che non si risolvono con il rollback dell’app e va valutato rispetto alle scritture avvenute dopo il backup.

Restano da approvare finalità e conservazione per nuove tipologie documentali, correzione dei dati estratti, assistenza contestuale e accesso professionale.
