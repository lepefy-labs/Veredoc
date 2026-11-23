# Veredoc 2.0

Baseline dell’audit: `71f70efa88224c4f93acb43b717e8b21481430be`.

## Mappa AS-IS e decisioni

| Area | Implementazione di partenza | Decisione |
|---|---|---|
| Home e navigazione | `app/page.tsx`, Navbar e barra mobile propongono guide, analisi, pratiche e piano come ingressi separati. | Organizzare la navigazione in Home, Attività, Documenti e Profilo. Riutilizzare rotte e token. |
| Dashboard e documenti | `/dashboard` unisce ripresa dell’ultima pratica, profili, quota, storico, trend e pagina documenti. | Fare di `/dashboard` la Home autenticata. Spostare l’archivio in `/dashboard/documenti`, riusando `ProfileDashboard`, `DocumentList` e la paginazione server. Mantenere quota e piano nello spazio Profilo. |
| Guide e pratiche | Le guide pubbliche verificano edizione e copertura. `/pratiche/[slug]` ripete la preparazione e avvia la checklist. Le spunte pubbliche sono locali per edizione. | Conservare gli URL, le guide indicizzate e il ritorno dopo il login. Avvicinare avvio e ripresa senza duplicare domande. |
| Motore e casi | `UserCase` usa una versione, condizioni deterministiche, risposte, passaggi, eventi e revisione ottimistica. La presentazione è una dichiarazione dell’utente. | Estendere il caso come fascicolo usando il motore esistente e mantenendo ID, cronologia e collegamenti alle fonti. |
| Analisi e storage | `/analyze` carica per profilo. La pipeline valida tipo e output, usa lease, retry e checkpoint; l’archivio mostra riepiloghi con ownership. | Mantenere la pipeline e il flusso per bollette e cedolini. Separare in futuro la presenza di un file dall’esito di analisi e dalla verifica di un requisito. |
| Knowledge Base | Il catalogo legge procedure, revisioni e citazioni. Edizioni pubbliche, guide, sinonimi, e testi semplificati sono anche in TypeScript. L’amministrazione verifica e pubblica. | Conservare le versioni pubblicate. Portare la rappresentazione editoriale nello stesso ciclo di validazione delle fonti. |
| Sicurezza, PWA e piani | NextAuth e controlli server, RLS per tabelle private, service worker con fallback statico, outbox email per analisi, piani FREE/PRO. | Riutilizzare i confini di accesso e i flussi correnti. Estendere eventi e permessi solo dove il nuovo caso d’uso lo richiede. |
| CAF e rilascio | Pilota ISEE con ingresso tracciato, contatto e gestione operativa manuale. Actions valida build e test E2E su Postgres. Vercel pubblica `main`. | Preparare condivisione selettiva e revoca dopo approvazione. Usare il normale flusso atomico e verificare CI e Vercel sullo stesso SHA. |

## Architettura funzionale

Home cerca un bisogno nelle guide pubblicate. La guida spiega obiettivo, preparazione e canale ufficiale. La pratica salvata conosce la persona di riferimento, le condizioni applicabili, i dati già raccolti e le azioni da completare. Le mie attività presenta stato e progressi. Documenti raggruppa i file per profilo e permette di aprire le analisi. Profilo gestisce persone o nuclei, preferenze, privacy e quota.

Per la collaborazione futura, l’accesso parte dalla singola pratica e dai documenti espressamente condivisi. La Knowledge Base alimenta ricerca e orientamento. Una risposta AI può citare fonti già pubblicate; stato e regole rimangono nelle operazioni deterministiche eseguite dal server.

I riferimenti di prodotto orientano quattro decisioni: partire dal racconto del caso, personalizzare il percorso, mostrare documenti mancanti e raggruppare le guide per bisogno. [Pratica Facile](https://www.pratiche.it/pratica_facile) · [Boundless](https://www.boundless.com/boundless-faqs) · [Gestionale Pratiche](https://gestionalepratiche.it/piattaforma/pratiche/) · [Service Public](https://www.service-public.gouv.fr/P10015).

## Dipendenze delle prossime wave

| Wave | Passo verificabile | Dipendenze |
|---|---|---|
| 2 | Entrare dalla guida direttamente nella preparazione e rientrare in un caso senza perdere il contesto. | Continuità dopo autenticazione ed E2E su modifica risposte e salvataggio concorrente. |
| 3 | Collegare un documento già posseduto a un requisito senza duplicare il file. | Relazione additiva con ownership, export e cancellazione, valutazione privacy e approvazione prima di applicare lo schema produttivo. |
| 4 | Aggiornare una procedura con una revisione editoriale e mostrare le fonti interessate. | Migrazione compatibile dei contenuti TypeScript; acquisizione idempotente e revisione umana prima della pubblicazione. |
| 5 | Trovare percorsi per sinonimi e intenti colloquiali, con astensione quando mancano risultati. | Valutare copertura della ricerca deterministica prima di embedding. Assistente con citazioni, limiti API e autorizzazione esplicita per contesto documentale. |
| 6 | Preparare DSU/ISEE, ISEE corrente, assegno unico, bonus nido e bonus sociale. | Regole e fonti dell’annualità verificate, test dei casi condizionali, handoff ufficiale e metriche prive di dati personali. |
| 7 | Preparare un appuntamento ISEE con un CAF. | [Pilota CAF](pilota-caf.md), accordi con le sedi, modello di condivisione, audit, approvazione di accessi e trattamento dati. |
| 8 | Preparare un modello disponibile e monitorare una pratica dopo la presentazione. | Provenienza e condizioni d’uso dei moduli; preferenze, scadenze verificate e outbox idempotente. |
| 9 | Modellare diritti di accesso alle funzioni e validare i costi. | Compatibilità FREE/PRO, evidenze pilota e approvazione prima di pagamenti e rinnovi. |

## Verifiche di esercizio

Controllare il percorso Home → ricerca → guida → checklist con sessione assente e con sessione attiva. Provare la ripresa da Home e da Le mie attività, quindi l’accesso a Documenti, all’analisi e a Profilo. Su mobile verificare la raggiungibilità dell’ultimo controllo del wizard, del footer e delle funzioni dell’archivio con la barra fissa. La modalità offline mostra il fallback statico. Per il rilascio, verificare una run GitHub Actions completata e un deployment Vercel READY associato al commit di `main`.
