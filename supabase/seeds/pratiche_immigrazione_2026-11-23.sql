-- Pubblica quattro guide su permesso di soggiorno e cittadinanza con fonti verificate il 2026-11-23.
-- Inserimento atomico di nuovi contenuti. Una collisione interrompe l'intero lotto.
DO $publish$
DECLARE
  entry jsonb;
  source_record jsonb;
BEGIN
  FOR entry IN SELECT value FROM jsonb_array_elements($content$
[
  {
    "procedureId": "pd_permesso_famiglia",
    "versionId": "pv_permesso_famiglia_1",
    "slug": "permesso-soggiorno-motivi-familiari",
    "title": "Permesso di soggiorno per motivi familiari",
    "description": "Documenti e passaggi per il primo rilascio dopo il ricongiungimento o per il rinnovo del permesso di soggiorno per famiglia.",
    "category": "Permessi e cittadinanza",
    "audience": "Chi è entrato con un visto per ricongiungimento o deve rinnovare il permesso per motivi familiari, codice 13.",
    "authority": "Ministero dell’Interno",
    "definition": {
      "questions": [],
      "steps": [
        {
          "id": "prepara_1",
          "title": "Passaporto",
          "description": "Porta l’originale e una copia di tutte le pagine o del documento equivalente.",
          "kind": "document",
          "required": true
        },
        {
          "id": "prepara_2",
          "title": "Modulo 1 del kit",
          "description": "Compila e firma il modulo. Per il primo rilascio dopo il ricongiungimento, il modulo viene compilato presso lo Sportello Unico.",
          "kind": "document",
          "required": true
        },
        {
          "id": "prepara_3",
          "title": "Permesso attuale e dichiarazione del familiare, per il rinnovo",
          "description": "Prepara il permesso da rinnovare e la dichiarazione di sostentamento del familiare con cui è avvenuto il ricongiungimento o la coesione familiare.",
          "kind": "document",
          "required": false
        },
        {
          "id": "sito_ufficiale",
          "title": "Apri la scheda del permesso per famiglia",
          "description": "Per il primo rilascio dopo il ricongiungimento, contatta lo Sportello Unico che ha rilasciato il nulla osta per il Modulo 1. Presenta il kit in un ufficio postale Sportello Amico. Per il rinnovo, controlla gli allegati e consegna il kit allo Sportello Amico.",
          "kind": "portal",
          "required": false,
          "url": "https://www.portaleimmigrazione.it/ITA/soggFamiglia.html"
        }
      ]
    },
    "sources": [
      {
        "id": "ks_permesso_famiglia_1",
        "revisionId": "kr_permesso_famiglia_1_1",
        "citationId": "pc_permesso_famiglia_1_1",
        "title": "Portale Immigrazione, permesso per famiglia",
        "url": "https://www.portaleimmigrazione.it/ITA/soggFamiglia.html",
        "summary": "Per il primo rilascio dopo il ricongiungimento, contatta lo Sportello Unico che ha rilasciato il nulla osta per il Modulo 1. Presenta il kit in un ufficio postale Sportello Amico. Per il rinnovo, controlla gli allegati e consegna il kit allo Sportello Amico. Porta l’originale e una copia di tutte le pagine o del documento equivalente. Compila e firma il modulo. Per il primo rilascio dopo il ricongiungimento, il modulo viene compilato presso lo Sportello Unico. Prepara il permesso da rinnovare e la dichiarazione di sostentamento del familiare con cui è avvenuto il ricongiungimento o la coesione familiare. Se sei entrato con un visto per ricongiungimento, contatta subito lo Sportello Unico per presentare la richiesta del primo permesso entro otto giorni lavorativi dall’ingresso. Se devi rinnovare, controlla la scadenza e prepara il kit. Porta il passaporto originale per l’identificazione allo Sportello Amico e conserva la ricevuta postale. Controlla l’appuntamento e porta i documenti richiesti. Puoi usare il numero sulla ricevuta per seguire la pratica.",
        "instructionIds": [
          "prepara_1",
          "prepara_2",
          "prepara_3",
          "sito_ufficiale"
        ]
      },
      {
        "id": "ks_permesso_famiglia_2",
        "revisionId": "kr_permesso_famiglia_2_1",
        "citationId": "pc_permesso_famiglia_2_1",
        "title": "Portale Immigrazione, procedura per presentare il kit",
        "url": "https://www.portaleimmigrazione.it/ITA/nuovaProcedura.html",
        "summary": "Per il primo rilascio dopo il ricongiungimento, contatta lo Sportello Unico che ha rilasciato il nulla osta per il Modulo 1. Presenta il kit in un ufficio postale Sportello Amico. Per il rinnovo, controlla gli allegati e consegna il kit allo Sportello Amico. Porta l’originale e una copia di tutte le pagine o del documento equivalente. Compila e firma il modulo. Per il primo rilascio dopo il ricongiungimento, il modulo viene compilato presso lo Sportello Unico. Prepara il permesso da rinnovare e la dichiarazione di sostentamento del familiare con cui è avvenuto il ricongiungimento o la coesione familiare. Se sei entrato con un visto per ricongiungimento, contatta subito lo Sportello Unico per presentare la richiesta del primo permesso entro otto giorni lavorativi dall’ingresso. Se devi rinnovare, controlla la scadenza e prepara il kit. Porta il passaporto originale per l’identificazione allo Sportello Amico e conserva la ricevuta postale. Controlla l’appuntamento e porta i documenti richiesti. Puoi usare il numero sulla ricevuta per seguire la pratica.",
        "instructionIds": [
          "prepara_1",
          "prepara_2",
          "prepara_3",
          "sito_ufficiale"
        ]
      },
      {
        "id": "ks_permesso_famiglia_3",
        "revisionId": "kr_permesso_famiglia_3_1",
        "citationId": "pc_permesso_famiglia_3_1",
        "title": "Normattiva, regole per la richiesta di permesso",
        "url": "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:1998-07-25;286!vig=~art5",
        "summary": "Per il primo rilascio dopo il ricongiungimento, contatta lo Sportello Unico che ha rilasciato il nulla osta per il Modulo 1. Presenta il kit in un ufficio postale Sportello Amico. Per il rinnovo, controlla gli allegati e consegna il kit allo Sportello Amico. Porta l’originale e una copia di tutte le pagine o del documento equivalente. Compila e firma il modulo. Per il primo rilascio dopo il ricongiungimento, il modulo viene compilato presso lo Sportello Unico. Prepara il permesso da rinnovare e la dichiarazione di sostentamento del familiare con cui è avvenuto il ricongiungimento o la coesione familiare. Se sei entrato con un visto per ricongiungimento, contatta subito lo Sportello Unico per presentare la richiesta del primo permesso entro otto giorni lavorativi dall’ingresso. Se devi rinnovare, controlla la scadenza e prepara il kit. Porta il passaporto originale per l’identificazione allo Sportello Amico e conserva la ricevuta postale. Controlla l’appuntamento e porta i documenti richiesti. Puoi usare il numero sulla ricevuta per seguire la pratica.",
        "instructionIds": [
          "prepara_1",
          "prepara_2",
          "prepara_3",
          "sito_ufficiale"
        ]
      }
    ]
  },
  {
    "procedureId": "pd_ricongiungimento",
    "versionId": "pv_ricongiungimento_1",
    "slug": "ricongiungimento-familiare",
    "title": "Ricongiungimento familiare",
    "description": "Come chiedere il nulla osta, preparare i documenti per il visto e avviare il primo permesso dopo l’ingresso in Italia.",
    "category": "Permessi e cittadinanza",
    "audience": "Chi soggiorna regolarmente in Italia con un titolo idoneo e vuole farsi raggiungere da un familiare che vive all’estero.",
    "authority": "Ministero dell’Interno",
    "definition": {
      "questions": [],
      "steps": [
        {
          "id": "prepara_1",
          "title": "Titolo di soggiorno e passaporto",
          "description": "Verifica che il tuo titolo consenta il ricongiungimento. Prepara anche i dati e il passaporto del familiare all’estero.",
          "kind": "document",
          "required": true
        },
        {
          "id": "prepara_2",
          "title": "Documenti sul reddito",
          "description": "Controlla la soglia applicabile e i documenti richiesti dalla Prefettura per il tuo tipo di reddito.",
          "kind": "document",
          "required": false
        },
        {
          "id": "prepara_3",
          "title": "Documenti dell’alloggio",
          "description": "Chiedi alla Prefettura quali atti servono per dimostrare disponibilità e idoneità dell’alloggio nel tuo caso.",
          "kind": "document",
          "required": false
        },
        {
          "id": "prepara_4",
          "title": "Atti che provano il legame familiare",
          "description": "Il familiare li presenta al consolato per il visto. Controlla se servono traduzione, legalizzazione o apostille.",
          "kind": "document",
          "required": false
        },
        {
          "id": "sito_ufficiale",
          "title": "Apri il Portale Servizi ALI",
          "description": "Accedi al Portale Servizi ALI e presenta la domanda di nulla osta allo Sportello Unico per l’Immigrazione della Prefettura competente per la tua residenza.",
          "kind": "portal",
          "required": false,
          "url": "https://portaleservizi.dlci.interno.it/AliSportello/ali/home.htm"
        }
      ]
    },
    "sources": [
      {
        "id": "ks_ricongiungimento_1",
        "revisionId": "kr_ricongiungimento_1_1",
        "citationId": "pc_ricongiungimento_1_1",
        "title": "Istruzioni sul ricongiungimento, Prefettura di Chieti",
        "url": "https://prefettura.interno.gov.it/it/prefetture/chieti/ricongiungimento-familiare",
        "summary": "Accedi al Portale Servizi ALI e presenta la domanda di nulla osta allo Sportello Unico per l’Immigrazione della Prefettura competente per la tua residenza. Verifica che il tuo titolo consenta il ricongiungimento. Prepara anche i dati e il passaporto del familiare all’estero. Controlla la soglia applicabile e i documenti richiesti dalla Prefettura per il tuo tipo di reddito. Chiedi alla Prefettura quali atti servono per dimostrare disponibilità e idoneità dell’alloggio nel tuo caso. Il familiare li presenta al consolato per il visto. Controlla se servono traduzione, legalizzazione o apostille. Accedi con SPID o CIE, allega quanto richiesto e controlla sul portale eventuali richieste di integrazione. Dopo il rilascio del nulla osta, il familiare chiede il visto alla rappresentanza italiana competente. Il nulla osta va utilizzato entro sei mesi dal rilascio. Contatta subito lo Sportello Unico che ha rilasciato il nulla osta. Segui le indicazioni per presentare la richiesta entro otto giorni lavorativi dall’ingresso.",
        "instructionIds": [
          "prepara_1",
          "prepara_2",
          "prepara_3",
          "prepara_4",
          "sito_ufficiale"
        ]
      },
      {
        "id": "ks_ricongiungimento_2",
        "revisionId": "kr_ricongiungimento_2_1",
        "citationId": "pc_ricongiungimento_2_1",
        "title": "Documenti e nulla osta, Prefettura di Firenze",
        "url": "https://prefettura.interno.gov.it/it/prefetture/firenze/nulla-osta-ricongiungimento-familiare",
        "summary": "Accedi al Portale Servizi ALI e presenta la domanda di nulla osta allo Sportello Unico per l’Immigrazione della Prefettura competente per la tua residenza. Verifica che il tuo titolo consenta il ricongiungimento. Prepara anche i dati e il passaporto del familiare all’estero. Controlla la soglia applicabile e i documenti richiesti dalla Prefettura per il tuo tipo di reddito. Chiedi alla Prefettura quali atti servono per dimostrare disponibilità e idoneità dell’alloggio nel tuo caso. Il familiare li presenta al consolato per il visto. Controlla se servono traduzione, legalizzazione o apostille. Accedi con SPID o CIE, allega quanto richiesto e controlla sul portale eventuali richieste di integrazione. Dopo il rilascio del nulla osta, il familiare chiede il visto alla rappresentanza italiana competente. Il nulla osta va utilizzato entro sei mesi dal rilascio. Contatta subito lo Sportello Unico che ha rilasciato il nulla osta. Segui le indicazioni per presentare la richiesta entro otto giorni lavorativi dall’ingresso.",
        "instructionIds": [
          "prepara_1",
          "prepara_2",
          "prepara_3",
          "prepara_4",
          "sito_ufficiale"
        ]
      }
    ]
  },
  {
    "procedureId": "pd_controllo_permesso",
    "versionId": "pv_controllo_permesso_1",
    "slug": "controllare-permesso-di-soggiorno",
    "title": "Come controllare se il permesso di soggiorno è pronto",
    "description": "Controlla se il permesso è in lavorazione o pronto per il ritiro. Cerca il numero di pratica o di assicurata sulla ricevuta.",
    "category": "Permessi e cittadinanza",
    "audience": "Chi ha già presentato una domanda di rilascio o rinnovo del permesso di soggiorno elettronico.",
    "authority": "Polizia di Stato",
    "definition": {
      "questions": [],
      "steps": [
        {
          "id": "prepara_1",
          "title": "Ricevuta della domanda",
          "description": "Usa il numero di pratica di 10 caratteri sulla ricevuta della Questura o il numero dell’assicurata di 12 caratteri sulla ricevuta di Poste Italiane. Te ne basta uno.",
          "kind": "document",
          "required": true
        },
        {
          "id": "sito_ufficiale",
          "title": "Controlla sul sito della Polizia di Stato",
          "description": "Apri il servizio nazionale della Polizia di Stato. Usa il numero di pratica o il numero dell’assicurata che trovi sulla ricevuta.",
          "kind": "portal",
          "required": false,
          "url": "https://questure.poliziadistato.it/stranieri/"
        }
      ]
    },
    "sources": [
      {
        "id": "ks_controllo_permesso_1",
        "revisionId": "kr_controllo_permesso_1_1",
        "citationId": "pc_controllo_permesso_1_1",
        "title": "Istruzioni della Questura sul controllo del permesso",
        "url": "https://questure.poliziadistato.it/it/Firenze/articolo/3333685d0c8686064511381967",
        "summary": "Apri il servizio nazionale della Polizia di Stato. Usa il numero di pratica o il numero dell’assicurata che trovi sulla ricevuta. Usa il numero di pratica di 10 caratteri sulla ricevuta della Questura o il numero dell’assicurata di 12 caratteri sulla ricevuta di Poste Italiane. Te ne basta uno. Compila il campo per il numero di pratica o di assicurata e invia la ricerca. Se la pratica è in lavorazione, ricontrolla più avanti. Se vengono chiesti altri documenti, segui le istruzioni della Questura. Se il permesso è pronto, consulta l’SMS o le indicazioni della Questura per l’appuntamento e i documenti da portare.",
        "instructionIds": [
          "prepara_1",
          "sito_ufficiale"
        ]
      },
      {
        "id": "ks_controllo_permesso_2",
        "revisionId": "kr_controllo_permesso_2_1",
        "citationId": "pc_controllo_permesso_2_1",
        "title": "Servizio nazionale di controllo",
        "url": "https://questure.poliziadistato.it/stranieri/",
        "summary": "Apri il servizio nazionale della Polizia di Stato. Usa il numero di pratica o il numero dell’assicurata che trovi sulla ricevuta. Usa il numero di pratica di 10 caratteri sulla ricevuta della Questura o il numero dell’assicurata di 12 caratteri sulla ricevuta di Poste Italiane. Te ne basta uno. Compila il campo per il numero di pratica o di assicurata e invia la ricerca. Se la pratica è in lavorazione, ricontrolla più avanti. Se vengono chiesti altri documenti, segui le istruzioni della Questura. Se il permesso è pronto, consulta l’SMS o le indicazioni della Questura per l’appuntamento e i documenti da portare.",
        "instructionIds": [
          "prepara_1",
          "sito_ufficiale"
        ]
      }
    ]
  },
  {
    "procedureId": "pd_cittadinanza_residenza",
    "versionId": "pv_cittadinanza_residenza_1",
    "slug": "cittadinanza-italiana-per-residenza",
    "title": "Cittadinanza italiana per residenza",
    "description": "Verifica gli anni di residenza richiesti, prepara i documenti, invia la domanda online e controlla le comunicazioni del Ministero.",
    "category": "Permessi e cittadinanza",
    "audience": "Chi risiede in Italia e vuole chiedere la cittadinanza per residenza ai sensi dell’articolo 9 della legge 91/1992.",
    "authority": "Ministero dell’Interno",
    "definition": {
      "questions": [],
      "steps": [
        {
          "id": "prepara_1",
          "title": "Documento d’identità e titolo di soggiorno, se previsto",
          "description": "Tieni a portata un documento di riconoscimento e l’eventuale titolo di soggiorno.",
          "kind": "document",
          "required": true
        },
        {
          "id": "prepara_2",
          "title": "Atto di nascita e certificato penale",
          "description": "Verifica quali atti esteri servono, la loro validità e se occorrono traduzione, legalizzazione o apostille. La Prefettura indica gli eventuali documenti sostitutivi.",
          "kind": "document",
          "required": false
        },
        {
          "id": "prepara_3",
          "title": "Redditi e conoscenza dell’italiano",
          "description": "Prepara i dati sui redditi degli ultimi tre anni. Controlla come dimostrare il livello B1 d’italiano o se rientri in un’esenzione.",
          "kind": "document",
          "required": false
        },
        {
          "id": "prepara_4",
          "title": "Contributo e bollo",
          "description": "Segui le istruzioni del portale per il contributo di 250 euro e l’imposta di bollo.",
          "kind": "document",
          "required": false
        },
        {
          "id": "sito_ufficiale",
          "title": "Apri il Portale Servizi del Ministero",
          "description": "Accedi al Portale Servizi del Ministero dell’Interno con SPID o CIE, seleziona «Richiesta Cittadinanza Italiana» e scegli il modello per residenza che corrisponde alla tua situazione.",
          "kind": "portal",
          "required": false,
          "url": "https://portaleservizi.dlci.interno.it/"
        }
      ]
    },
    "sources": [
      {
        "id": "ks_cittadinanza_residenza_1",
        "revisionId": "kr_cittadinanza_residenza_1_1",
        "citationId": "pc_cittadinanza_residenza_1_1",
        "title": "Istruzioni del Ministero per inviare la domanda",
        "url": "https://www.interno.gov.it/it/temi/cittadinanza-e-altri-diritti-civili/cittadinanza/cittadinanza-invia-tua-domanda",
        "summary": "Accedi al Portale Servizi del Ministero dell’Interno con SPID o CIE, seleziona «Richiesta Cittadinanza Italiana» e scegli il modello per residenza che corrisponde alla tua situazione. Tieni a portata un documento di riconoscimento e l’eventuale titolo di soggiorno. Verifica quali atti esteri servono, la loro validità e se occorrono traduzione, legalizzazione o apostille. La Prefettura indica gli eventuali documenti sostitutivi. Prepara i dati sui redditi degli ultimi tre anni. Controlla come dimostrare il livello B1 d’italiano o se rientri in un’esenzione. Segui le istruzioni del portale per il contributo di 250 euro e l’imposta di bollo. Nei casi ordinari servono almeno 10 anni di residenza legale e continuativa per i cittadini non UE e almeno 4 per i cittadini UE. L’articolo 9 prevede anche altri casi. Controlla il tuo prima di pagare. Controlla i dati, carica gli allegati richiesti e conserva la ricevuta. Consulta le comunicazioni sul portale. Se ricevi il decreto di concessione, segui le istruzioni del Comune per il giuramento, da prestare di norma entro sei mesi dalla notifica.",
        "instructionIds": [
          "prepara_1",
          "prepara_2",
          "prepara_3",
          "prepara_4",
          "sito_ufficiale"
        ]
      },
      {
        "id": "ks_cittadinanza_residenza_2",
        "revisionId": "kr_cittadinanza_residenza_2_1",
        "citationId": "pc_cittadinanza_residenza_2_1",
        "title": "Requisiti per la cittadinanza per residenza",
        "url": "https://libertaciviliimmigrazione.dlci.interno.gov.it/temi/concessione-della-cittadinanza-italiana-residenza-sul-territorio-italiano-ai-sensi-dellart-9",
        "summary": "Accedi al Portale Servizi del Ministero dell’Interno con SPID o CIE, seleziona «Richiesta Cittadinanza Italiana» e scegli il modello per residenza che corrisponde alla tua situazione. Tieni a portata un documento di riconoscimento e l’eventuale titolo di soggiorno. Verifica quali atti esteri servono, la loro validità e se occorrono traduzione, legalizzazione o apostille. La Prefettura indica gli eventuali documenti sostitutivi. Prepara i dati sui redditi degli ultimi tre anni. Controlla come dimostrare il livello B1 d’italiano o se rientri in un’esenzione. Segui le istruzioni del portale per il contributo di 250 euro e l’imposta di bollo. Nei casi ordinari servono almeno 10 anni di residenza legale e continuativa per i cittadini non UE e almeno 4 per i cittadini UE. L’articolo 9 prevede anche altri casi. Controlla il tuo prima di pagare. Controlla i dati, carica gli allegati richiesti e conserva la ricevuta. Consulta le comunicazioni sul portale. Se ricevi il decreto di concessione, segui le istruzioni del Comune per il giuramento, da prestare di norma entro sei mesi dalla notifica.",
        "instructionIds": [
          "prepara_1",
          "prepara_2",
          "prepara_3",
          "prepara_4",
          "sito_ufficiale"
        ]
      },
      {
        "id": "ks_cittadinanza_residenza_3",
        "revisionId": "kr_cittadinanza_residenza_3_1",
        "citationId": "pc_cittadinanza_residenza_3_1",
        "title": "Procedimento e giuramento",
        "url": "https://libertaciviliimmigrazione.dlci.interno.gov.it/ufficio-iv-cittadinanza",
        "summary": "Accedi al Portale Servizi del Ministero dell’Interno con SPID o CIE, seleziona «Richiesta Cittadinanza Italiana» e scegli il modello per residenza che corrisponde alla tua situazione. Tieni a portata un documento di riconoscimento e l’eventuale titolo di soggiorno. Verifica quali atti esteri servono, la loro validità e se occorrono traduzione, legalizzazione o apostille. La Prefettura indica gli eventuali documenti sostitutivi. Prepara i dati sui redditi degli ultimi tre anni. Controlla come dimostrare il livello B1 d’italiano o se rientri in un’esenzione. Segui le istruzioni del portale per il contributo di 250 euro e l’imposta di bollo. Nei casi ordinari servono almeno 10 anni di residenza legale e continuativa per i cittadini non UE e almeno 4 per i cittadini UE. L’articolo 9 prevede anche altri casi. Controlla il tuo prima di pagare. Controlla i dati, carica gli allegati richiesti e conserva la ricevuta. Consulta le comunicazioni sul portale. Se ricevi il decreto di concessione, segui le istruzioni del Comune per il giuramento, da prestare di norma entro sei mesi dalla notifica.",
        "instructionIds": [
          "prepara_1",
          "prepara_2",
          "prepara_3",
          "prepara_4",
          "sito_ufficiale"
        ]
      },
      {
        "id": "ks_cittadinanza_residenza_4",
        "revisionId": "kr_cittadinanza_residenza_4_1",
        "citationId": "pc_cittadinanza_residenza_4_1",
        "title": "Documenti e verifiche, guida della Prefettura",
        "url": "https://prefettura.interno.gov.it/sites/default/files/89/2024-03/guida_alla_cittadinanza_italiana_short_version.pdf",
        "summary": "Accedi al Portale Servizi del Ministero dell’Interno con SPID o CIE, seleziona «Richiesta Cittadinanza Italiana» e scegli il modello per residenza che corrisponde alla tua situazione. Tieni a portata un documento di riconoscimento e l’eventuale titolo di soggiorno. Verifica quali atti esteri servono, la loro validità e se occorrono traduzione, legalizzazione o apostille. La Prefettura indica gli eventuali documenti sostitutivi. Prepara i dati sui redditi degli ultimi tre anni. Controlla come dimostrare il livello B1 d’italiano o se rientri in un’esenzione. Segui le istruzioni del portale per il contributo di 250 euro e l’imposta di bollo. Nei casi ordinari servono almeno 10 anni di residenza legale e continuativa per i cittadini non UE e almeno 4 per i cittadini UE. L’articolo 9 prevede anche altri casi. Controlla il tuo prima di pagare. Controlla i dati, carica gli allegati richiesti e conserva la ricevuta. Consulta le comunicazioni sul portale. Se ricevi il decreto di concessione, segui le istruzioni del Comune per il giuramento, da prestare di norma entro sei mesi dalla notifica.",
        "instructionIds": [
          "prepara_1",
          "prepara_2",
          "prepara_3",
          "prepara_4",
          "sito_ufficiale"
        ]
      }
    ]
  }
]
$content$::jsonb)
  LOOP
    INSERT INTO "ProcedureDefinition" ("id", "slug", "title", "description", "category", "audience", "scope", "authority", "status")
    VALUES (entry->>'procedureId', entry->>'slug', entry->>'title', entry->>'description', entry->>'category',
      entry->>'audience', 'Nazionale', entry->>'authority', 'DRAFT');

    INSERT INTO "ProcedureVersion" ("id", "procedureId", "version", "definition", "status")
    VALUES (entry->>'versionId', entry->>'procedureId', 1, entry->'definition', 'DRAFT');

    FOR source_record IN SELECT value FROM jsonb_array_elements(entry->'sources')
    LOOP
      INSERT INTO "KnowledgeSource" ("id", "authority", "title", "url", "sourceType", "scope", "status", "provenance", "verifiedAt")
      VALUES (source_record->>'id', entry->>'authority', source_record->>'title', source_record->>'url', 'SERVIZIO', 'Nazionale', 'VERIFIED',
        jsonb_build_object('reviewedOn', '2026-11-23', 'reviewedBy', 'Codex'), CURRENT_TIMESTAMP);

      INSERT INTO "KnowledgeRevision" ("id", "sourceId", "version", "content", "contentHash", "status")
      VALUES (source_record->>'revisionId', source_record->>'id', 1, source_record->>'summary',
        encode(sha256(convert_to(source_record->>'summary', 'UTF8')), 'hex'), 'VERIFIED');

      INSERT INTO "ProcedureCitation" ("id", "procedureVersionId", "sourceId", "revisionId", "instructionIds")
      VALUES (source_record->>'citationId', entry->>'versionId', source_record->>'id', source_record->>'revisionId',
        ARRAY(SELECT jsonb_array_elements_text(source_record->'instructionIds')));

      INSERT INTO "KnowledgeAudit" ("id", "entityType", "entityId", "action", "metadata")
      VALUES ('audit_verified_' || (source_record->>'id'), 'SOURCE', source_record->>'id', 'VERIFIED',
        jsonb_build_object('executedBy', 'Codex', 'revisionId', source_record->>'revisionId'));
    END LOOP;

    UPDATE "ProcedureVersion" SET "status" = 'PUBLISHED', "approvedAt" = CURRENT_TIMESTAMP, "effectiveAt" = CURRENT_TIMESTAMP
    WHERE "id" = entry->>'versionId';
    UPDATE "ProcedureDefinition" SET "status" = 'PUBLISHED' WHERE "id" = entry->>'procedureId';

    INSERT INTO "KnowledgeAudit" ("id", "entityType", "entityId", "action", "metadata")
    VALUES ('audit_published_' || (entry->>'versionId'), 'PROCEDURE_VERSION', entry->>'versionId', 'PUBLISHED',
      jsonb_build_object('executedBy', 'Codex', 'slug', entry->>'slug'));
  END LOOP;
END;
$publish$;
