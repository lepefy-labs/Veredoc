# Veredoc Pratiche

## Stato

Il codice del modulo è protetto da `PRATICHE_ENABLED=true`. Il valore predefinito è disabilitato. La migrazione 006 e il seed pilota non sono applicati dal deploy. Il seed crea bozze; nel progetto di produzione, le tre fonti e le tre procedure sono state verificate e pubblicate il 2026-11-10 su richiesta del proprietario, con audit che identifica Codex come esecutore. Il flag di produzione abilita il catalogo dopo il deploy di questa revisione.

## Sequenza di attivazione

1. Eseguire backup e verificare lo stato delle migrazioni 001-005 nel progetto Supabase di destinazione.
2. Applicare `supabase/migrations/006_pratiche.sql` nel SQL Editor. La migrazione aggiunge dieci tabelle, indici, vincoli, trigger di immutabilità e RLS. Non modifica i dati legacy. Richiede approvazione esplicita prima di essere applicata in produzione.
3. Applicare `supabase/seeds/pratiche_pilots.sql`. Questo inserisce solo fonti e procedure in bozza.
4. Configurare `PRATICHE_REVIEWER_IDS` sul server con gli ID degli utenti autorizzati alla revisione. Senza questa variabile nessuno può usare gli strumenti editoriali. La scelta degli utenti autorizzati richiede approvazione del proprietario.
5. Abilitare temporaneamente `PRATICHE_ENABLED=true` in un ambiente controllato, aprire `/pratiche/admin`, confrontare ogni revisione e ogni istruzione con la fonte originale e verificare la data e l'ambito di applicazione.
6. Marcare le fonti verificate, poi pubblicare solo le procedure per cui tutti i passaggi sono coperti da fonti sufficienti. Pubblicare una versione non cambia le pratiche già create.
7. Abilitare il flag in produzione soltanto dopo la verifica della migrazione, della revisione, della CI e del deploy.

## Modello e API

`KnowledgeSource` rappresenta la pagina o guida istituzionale. `KnowledgeRevision` ne conserva una versione normalizzata e l'hash SHA-256. `ProcedureDefinition` contiene catalogo e stato; `ProcedureVersion` contiene domande, passaggi e condizioni strutturate. `ProcedureCitation` collega gli identificatori di istruzione a revisioni precise. `KnowledgeAudit` registra acquisizione, verifica, pubblicazione e ritiro.

`UserCase` contiene proprietario, profilo, versione bloccata della procedura, stato e revisione concorrente. `CaseAnswer`, `CaseStep` e `CaseEvent` contengono risposte, attività e audit della pratica. Le API utente sono `GET /api/pratiche/catalog`, `GET/POST /api/pratiche/cases` e `GET/PATCH/DELETE /api/pratiche/cases/[id]`. Tutte richiedono sessione, flag e schema. Ogni lettura o modifica di una pratica usa `userId` della sessione. `PATCH` richiede `expectedRevision`; un conflitto restituisce 409. `POST` accetta `Idempotency-Key`.

Il passaggio verso il portale ufficiale è informativo e non conta come attività completata. La pratica diventa `READY_TO_SUBMIT` quando domande e attività preparatorie obbligatorie sono complete. Lo stato `USER_REPORTED_SUBMITTED` viene impostato soltanto su dichiarazione dell'utente.

`GET/POST /api/pratiche/admin` è riservata agli ID utente nella allowlist server. Le azioni sono `verifySource`, `publish` e `retire`. Non esistono credenziali editoriali nel browser. La pubblicazione richiede una revisione valida per tutte le istruzioni. I dati di acquisizione non vengono promossi automaticamente.

## Gestione delle fonti

Le fonti iniziali sono:

* Guida ANPR alla [dichiarazione di residenza](https://sc.anpr.interno.it/serviziCittadino/dist/docs/guida_compilazione_cambio_residenza.pdf).
* Guida del Ministero dell'Interno ai [certificati online](https://sc.anpr.interno.it/serviziCittadino/dist/docs/guida_richiesta_certificato.pdf).
* Scheda INPS sul [Portale unico ISEE](https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.Portale-unico-ISEE.html).

I testi normalizzati nel seed sono sintesi per la revisione, non copie integrali né prova di verifica umana. La guida dei certificati tratta anche bollo e pagamento: l'MVP non mostra importi né scadenze tratti da quella guida. Prima di una nuova pubblicazione il revisore deve verificare percorso attuale, autorità, eventuali condizioni locali, data di aggiornamento e link di accesso. Se le fonti non bastano, lasciare la procedura in bozza.

L'adapter `stageSourceRevision` non effettua scraping. Accetta contenuto normalizzato da un processo già autorizzato, controlla la allowlist degli URL, deduplica tramite hash e limita la frequenza per fonte. Ogni variazione crea una revisione `PENDING_REVIEW` e rende `STALE` la fonte verificata. Non è collegato a n8n o a uno scheduler. Prima dell'attivazione occorre verificare condizioni di accesso, limiti di frequenza, formato dei contenuti e gestione degli errori. Non inviare dati personali nel contenuto o nei log.

## Sicurezza e privacy

Le nuove tabelle hanno RLS abilitata e nessuna policy di accesso diretto per `anon` o `authenticated`. Prisma usa la connessione server esistente. Le API verificano la sessione e la proprietà del profilo e della pratica. Il trigger nel database impedisce di associare alla pratica un profilo di un altro account. Versioni pubblicate e citazioni non sono modificabili. Le vecchie pratiche restano associate alla versione con cui sono state avviate.

Le pratiche non caricano file nell'MVP. I documenti amministrativi non entrano nel bucket `documents` né nel flusso di analisi bollette e buste paga. L'utente può eliminare una pratica dall'API; l'eliminazione dell'account elimina le pratiche in cascata. L'esportazione dell'account include domande, risposte, attività ed eventi essenziali. L'informativa privacy descrive il nuovo trattamento.

## Limiti del primo rilascio

Nessuna procedura pilota è già approvata nel seed. Non sono presenti IA contestuale, upload amministrativi, OCR, scadenze calcolate, conferme dagli enti, integrazione n8n o monetizzazione. Le risposte guidano soltanto la preparazione. La presentazione ufficiale avviene sul portale competente; lo stato `USER_REPORTED_SUBMITTED` è una dichiarazione dell'utente e non una conferma esterna.
