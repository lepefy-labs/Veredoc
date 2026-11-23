# Piano di lavoro per le guide pubbliche e il pilota CAF

## 1. Pubblicare e misurare

- Rendere consultabili gratuitamente le guide di residenza, certificati e ISEE su `/guide`. Ogni guida indica il canale ufficiale, i documenti e i passaggi.
- Pubblicare URL canonici, metadati e sitemap. Collegare le guide dalla home e usare gli URL diretti per condividerle in materiali e comunicazioni.
- Misurare le visite alle pagine con Vercel Web Analytics. Contare gli avvii effettivi della checklist dagli eventi `CREATED` con `metadata.entryPoint` uguale a `public_guide` o `caf_pilot`. Questi indicatori descrivono visite e nuovi casi, con granularità diversa. Non misurano l’ottenimento dell’ISEE.
- Tenere un riepilogo settimanale per guida con visite, casi avviati e casi che raggiungono almeno `READY_TO_SUBMIT`. Separare attività interna e test quando si conoscono. Monitorare anche richieste commerciali, sedi che accettano il pilota e sedi che acquistano un secondo lotto.

## 2. Trovare due sedi prima della campagna ISEE 2027

- Condividere la proposta pubblica `/per-i-caf` con sedi che fissano già appuntamenti ISEE e possono confrontare due modalità di preparazione.
- Concordare due piloti a pagamento. Proposta iniziale di €2 per incontro in cui il cittadino ha consultato la guida e il CAF può procedere senza richiedere altra documentazione. Confermare in anticipo volume, periodo, rendicontazione e condizioni commerciali con la sede.
- Consegnare alla sede il link `/guide/preparazione-dsu-isee?da=caf` da aggiungere alla conferma di prenotazione. Il CAF riceve e controlla i documenti tramite i suoi canali esistenti.
- Gestire il primo lotto con un conteggio manuale tra le parti. Il contatto dal sito avviene per email. Il pagamento va concordato con la sede.

### Collaudo operativo con una sede

1. Concordare un referente, due settimane di prova e una data di revisione. Come punto di partenza, raccogliere circa 20 appuntamenti comparabili con partecipante presente, metà per gruppo.
2. Alternare i gruppi nello stesso periodo. Il gruppo abituale riceve le istruzioni della sede. Il gruppo guida riceve anche il [link ISEE tracciato](https://www.veredoc.it/guide/preparazione-dsu-isee?da=caf) alla conferma. I cittadini consegnano i documenti tramite i canali abituali della sede.
3. Compilare una riga settimanale per gruppo e sommare i minuti delle integrazioni alla chiusura dello stesso periodo di osservazione. La sede gestisce i singoli appuntamenti nei propri strumenti. Veredoc riceve soltanto i totali settimanali.

| Settimana | Gruppo | Presenti | Assenti | Guida consultata su dichiarazione | Procedibili al primo incontro | Con integrazione | Minuti primo incontro | Minuti integrazioni |
|---|---|---:|---:|---:|---:|---:|---:|---:|
|  | Abituale o guida |  |  |  |  |  |  |  |

Per ciascun gruppo calcolare la quota di procedibili al primo incontro, la quota di integrazioni e i minuti totali per persona presente. Tenere a parte le assenze. Prolungare il confronto se i gruppi sono troppo piccoli o poco comparabili. Rivedere con la sede le richieste ricorrenti prima di definire lo spazio digitale.

## 3. Misurare il pilota e decidere

- Obiettivo di partenza 100 appuntamenti comparabili tra due sedi. In ciascuna sede alternare, quando possibile, preparazione abituale e invio della guida. Distinguere i casi con requisiti particolari e registrare le assenze separatamente.
- Per ogni appuntamento il CAF registra gruppo, consultazione della guida dichiarata dal cittadino, esito della preparazione, minuti dell’operatore e necessità di integrazione. Includere il tempo delle integrazioni nel totale. Per la rendicontazione condividere dati aggregati per sede e gruppo, evitando nomi e documenti fiscali.
- Confrontare tempo medio dell’operatore e percentuale di appuntamenti che procedono al primo incontro. Riconciliare i conteggi con la sede prima di fatturare.
- Procedere con nuove funzionalità se entrambe le sedi pagano, il risparmio medio raggiunge almeno dieci minuti per appuntamento e almeno una sede ordina un secondo lotto. Registrare anche costo del supporto e margine per appuntamento verificato. Valutare integrazioni con software di prenotazione solo dopo aver misurato il valore.

## Progetto dello spazio professionale

Nel pilota digitale il cittadino mantiene il controllo del fascicolo. L’invito porta alla preparazione dell’appuntamento; la condivisione avviene con una conferma che mostra sede, pratica, requisiti e singoli file selezionati. Il link di invito scade ed è utilizzabile una volta. La sessione NextAuth del cittadino continua a proteggere l’archivio.

- Organizzazione e iscrizione dell’operatore sono due relazioni distinte. Il ruolo autorizza azioni nella propria organizzazione e la condivisione identifica i soli oggetti visibili.
- L’autorizzazione registra pratica, beneficiario, file approvati, scadenza e revoca. Ogni lettura e download ricontrolla la condivisione. I link ai file sono brevi e l’interfaccia espone la revoca.
- L’operatore indica requisiti mancanti in una checklist e può confermare che il fascicolo è preparato per l’appuntamento. La conferma resta un evento del CAF.
- Il log di collaborazione registra azione, identità, pratica e ora. La conservazione, i criteri di cancellazione e l’informativa richiedono accordo con le sedi e riesame privacy prima del rilascio.
- Testare due organizzazioni e due cittadini, lettura e revoca, invito riutilizzato, cambio di ruolo, rimozione di un file, richieste dirette e audit. L’avvio richiede approvazione del modello di accesso e delle modifiche allo schema.

## Messaggio per contattare una sede

**Oggetto** — Proposta per ridurre le integrazioni negli appuntamenti ISEE

Buongiorno,

stiamo cercando due sedi CAF per misurare se una guida inviata con la conferma di prenotazione aiuta i cittadini ad arrivare con i documenti necessari. Il CAF continua a gestire l’appuntamento e i documenti nei propri canali. Confrontiamo il tempo dell’operatore e le richieste di integrazione con la preparazione abituale.

La proposta è di €2 per appuntamento in cui il cittadino ha usato la guida e l’operatore conferma che può procedere con i documenti presentati. Concordiamo insieme il numero di appuntamenti e il periodo del test.

Se può interessarvi, possiamo sentirci per capire come gestite oggi la preparazione degli appuntamenti ISEE. [Proposta e guida da condividere](https://www.veredoc.it/per-i-caf)
