-- Pubblica cinque guide con le fonti ARERA e INPS verificate il 2026-11-23.
-- Inserimento atomico di nuovi contenuti. Una collisione interrompe l'intero lotto.
DO $publish$
DECLARE
  entry jsonb;
  source_record jsonb;
BEGIN
  FOR entry IN SELECT value FROM jsonb_array_elements($content$
[
  {
    "procedureId": "pd_bonus_sociale",
    "versionId": "pv_bonus_sociale_1",
    "slug": "bonus-sociale-luce-gas-acqua",
    "title": "Bonus sociale luce, gas e acqua",
    "description": "Scopri come ottenere lo sconto con l’ISEE, quando arriva e cosa controllare se non compare.",
    "category": "Casa e bollette",
    "audience": "Famiglie che vogliono verificare o ricevere il bonus sociale per disagio economico.",
    "authority": "ARERA",
    "definition": {
      "questions": [],
      "steps": [
        {
          "id": "prepara_1",
          "title": "ISEE valido",
          "description": "Verifica la soglia ARERA dell’anno della DSU e quella applicabile in base ai figli a carico.",
          "kind": "document",
          "required": true
        },
        {
          "id": "prepara_2",
          "title": "Una bolletta recente",
          "description": "Se l’utenza è individuale, controlla intestatario e codice della fornitura. L’intestatario deve appartenere al nucleo ISEE e la fornitura deve rispettare i requisiti ARERA.",
          "kind": "document",
          "required": false
        },
        {
          "id": "prepara_3",
          "title": "Dati dell’utenza condominiale, se applicabile",
          "description": "Per il gas centralizzato, se ricevi la lettera per comunicare il PDR, chiedi il codice all’amministratore e segui le istruzioni della lettera.",
          "kind": "document",
          "required": false
        },
        {
          "id": "sito_ufficiale",
          "title": "Controlla requisiti e soglie su ARERA",
          "description": "Presenta la DSU per ottenere un ISEE valido. Se la famiglia e la fornitura soddisfano i requisiti, il bonus per disagio economico viene riconosciuto automaticamente.",
          "kind": "portal",
          "required": false,
          "url": "https://www.arera.it/consumatori/bonus-sociale/bonus-sociale-per-disagio-economico/quali-sono-i-requisiti"
        }
      ]
    },
    "sources": [
      {
        "id": "ks_bonus_sociale",
        "revisionId": "kr_bonus_sociale_1",
        "citationId": "pc_bonus_sociale_1",
        "title": "ARERA — Come e quando si ricevono i bonus",
        "url": "https://www.arera.it/consumatori/bonus-sociale/bonus-sociale-per-disagio-economico/come-e-quando-si-ricevono",
        "summary": "Presenta la DSU per ottenere un ISEE valido. Se la famiglia e la fornitura soddisfano i requisiti, il bonus per disagio economico viene riconosciuto automaticamente. Controlla che l’attestazione ISEE sia disponibile e confrontala con le soglie pubblicate per l’anno. Per le utenze individuali il bonus viene normalmente applicato in bolletta. Consulta le modalità previste da ARERA per gas e acqua condominiali. Verifica la data dell’attestazione, i tempi previsti per la fornitura, la corrispondenza dell’intestatario con il nucleo e l’eventuale comunicazione per il gas condominiale. Se i tempi risultano superati, usa i contatti di assistenza indicati da ARERA.",
        "instructionIds": [
          "prepara_1",
          "prepara_2",
          "prepara_3",
          "sito_ufficiale"
        ]
      },
      {
        "id": "ks_bonus_sociale_riferimento",
        "revisionId": "kr_bonus_sociale_riferimento_1",
        "citationId": "pc_bonus_sociale_riferimento_1",
        "title": "Controlla requisiti e soglie su ARERA",
        "url": "https://www.arera.it/consumatori/bonus-sociale/bonus-sociale-per-disagio-economico/quali-sono-i-requisiti",
        "summary": "Presenta la DSU per ottenere un ISEE valido. Se la famiglia e la fornitura soddisfano i requisiti, il bonus per disagio economico viene riconosciuto automaticamente. Verifica la soglia ARERA dell’anno della DSU e quella applicabile in base ai figli a carico. Se l’utenza è individuale, controlla intestatario e codice della fornitura. L’intestatario deve appartenere al nucleo ISEE e la fornitura deve rispettare i requisiti ARERA.",
        "instructionIds": [
          "prepara_1",
          "prepara_2",
          "sito_ufficiale"
        ]
      }
    ]
  },
  {
    "procedureId": "pd_lettura_bolletta",
    "versionId": "pv_lettura_bolletta_1",
    "slug": "come-leggere-bolletta-luce-gas",
    "title": "Come leggere la bolletta di luce e gas",
    "description": "Trova totale, consumi e costi nello scontrino dell’energia e nel box dell’offerta. Segui un esempio numerico e analizza la tua bolletta.",
    "category": "Casa e bollette",
    "audience": "Intestatari di forniture domestiche di luce o gas che vogliono capire gli importi in bolletta.",
    "authority": "ARERA",
    "definition": {
      "questions": [],
      "steps": [
        {
          "id": "prepara_1",
          "title": "Bolletta completa",
          "description": "Tieni disponibile il PDF con tutte le pagine, il periodo fatturato e le eventuali informazioni sui ricalcoli.",
          "kind": "document",
          "required": true
        },
        {
          "id": "prepara_2",
          "title": "Bolletta precedente, se vuoi confrontare i consumi",
          "description": "Usa un periodo confrontabile e controlla se la bolletta riporta letture effettive, autoletture o consumi stimati.",
          "kind": "document",
          "required": false
        },
        {
          "id": "sito_ufficiale",
          "title": "Consulta il formato della bolletta su ARERA",
          "description": "Apri il PDF del fornitore. Nel formato introdotto da ARERA, il frontespizio mostra l’importo da pagare. Nelle pagine successive cerca lo scontrino dell’energia e il box dell’offerta.",
          "kind": "portal",
          "required": false,
          "url": "https://www.arera.it/nuova-bolletta"
        }
      ]
    },
    "sources": [
      {
        "id": "ks_lettura_bolletta",
        "revisionId": "kr_lettura_bolletta_1",
        "citationId": "pc_lettura_bolletta_1",
        "title": "ARERA — La nuova bolletta",
        "url": "https://www.arera.it/nuova-bolletta",
        "summary": "Apri il PDF del fornitore. Nel formato introdotto da ARERA, il frontespizio mostra l’importo da pagare. Nelle pagine successive cerca lo scontrino dell’energia e il box dell’offerta. Controlla i riferimenti della fornitura e i dati di pagamento prima di confrontare due bollette. Confronta quantità e unità di misura (kWh per la luce, Smc per il gas). Per la luce controlla anche la quota potenza. Considera le altre voci, le imposte e l’IVA quando ricostruisci il totale. Leggi il nome dell’offerta, il tipo di prezzo e le informazioni sulla durata o sulla scadenza delle condizioni economiche. Usa gli elementi di dettaglio se vuoi approfondire un importo.",
        "instructionIds": [
          "prepara_1",
          "prepara_2",
          "sito_ufficiale"
        ]
      }
    ]
  },
  {
    "procedureId": "pd_voltura_subentro",
    "versionId": "pv_voltura_subentro_1",
    "slug": "voltura-o-subentro-luce-gas",
    "title": "Voltura o subentro di luce e gas",
    "description": "Stai traslocando? Scopri quale pratica chiedere, dove trovare POD e PDR e quali dati preparare per il venditore.",
    "category": "Casa e bollette",
    "audience": "Chi entra in una nuova abitazione e deve intestare o riattivare le utenze.",
    "authority": "ARERA",
    "definition": {
      "questions": [],
      "steps": [
        {
          "id": "prepara_1",
          "title": "POD per la luce o PDR per il gas",
          "description": "Cerca il codice su una bolletta della fornitura precedente. Se non ce l’hai, chiedi al proprietario o al venditore quali dati usare per identificare la fornitura.",
          "kind": "document",
          "required": true
        },
        {
          "id": "prepara_2",
          "title": "Dati del nuovo intestatario e indirizzo",
          "description": "Prepara documento di identità, codice fiscale e indirizzo esatto. Chiedi al venditore quali informazioni richiede sul titolo di occupazione dell’immobile.",
          "kind": "document",
          "required": false
        },
        {
          "id": "prepara_3",
          "title": "Dati del contatore e del pagamento, se richiesti",
          "description": "Tieni disponibili matricola e lettura del contatore. Prepara l’IBAN se scegli la domiciliazione.",
          "kind": "document",
          "required": false
        },
        {
          "id": "sito_ufficiale",
          "title": "Consulta le pratiche per la luce su ARERA",
          "description": "Se la fornitura è attiva, chiedi una voltura al venditore secondo il percorso previsto per quella fornitura. Se il precedente contratto è cessato e la fornitura è disattivata, chiedi un subentro al venditore con cui vuoi stipulare il contratto.",
          "kind": "portal",
          "required": false,
          "url": "https://www.arera.it/single-digital-gateway-elettricita"
        }
      ]
    },
    "sources": [
      {
        "id": "ks_voltura_subentro",
        "revisionId": "kr_voltura_subentro_1",
        "citationId": "pc_voltura_subentro_1",
        "title": "ARERA — Voltura e subentro per il gas",
        "url": "https://www.arera.it/single-digital-gateway-gas",
        "summary": "Se la fornitura è attiva, chiedi una voltura al venditore secondo il percorso previsto per quella fornitura. Se il precedente contratto è cessato e la fornitura è disattivata, chiedi un subentro al venditore con cui vuoi stipulare il contratto. Sì: chiedi la voltura per cambiare intestatario. No, perché il precedente contratto è cessato: chiedi il subentro per riattivarla. Verifica lo stato separatamente per luce e gas. Usa il canale indicato dal venditore, seleziona la pratica corretta e comunica POD o PDR con i dati richiesti. Fatti indicare i costi e i tempi per il tuo caso. Tieni la ricevuta della richiesta. Verifica l’intestazione sulla prima bolletta e, per il subentro, attendi le indicazioni sulla riattivazione.",
        "instructionIds": [
          "prepara_1",
          "prepara_2",
          "prepara_3",
          "sito_ufficiale"
        ]
      },
      {
        "id": "ks_voltura_subentro_riferimento",
        "revisionId": "kr_voltura_subentro_riferimento_1",
        "citationId": "pc_voltura_subentro_riferimento_1",
        "title": "le pratiche per la luce su ARERA",
        "url": "https://www.arera.it/single-digital-gateway-elettricita",
        "summary": "Se la fornitura è attiva, chiedi una voltura al venditore secondo il percorso previsto per quella fornitura. Se il precedente contratto è cessato e la fornitura è disattivata, chiedi un subentro al venditore con cui vuoi stipulare il contratto. Cerca il codice su una bolletta della fornitura precedente. Se non ce l’hai, chiedi al proprietario o al venditore quali dati usare per identificare la fornitura. Prepara documento di identità, codice fiscale e indirizzo esatto. Chiedi al venditore quali informazioni richiede sul titolo di occupazione dell’immobile.",
        "instructionIds": [
          "prepara_1",
          "prepara_2",
          "sito_ufficiale"
        ]
      }
    ]
  },
  {
    "procedureId": "pd_isee_corrente",
    "versionId": "pv_isee_corrente_1",
    "slug": "isee-corrente",
    "title": "ISEE corrente: quando richiederlo e quali documenti servono",
    "description": "Scopri quando puoi aggiornare l’ISEE dopo un cambiamento di lavoro, reddito o patrimonio e come presentare la richiesta.",
    "category": "ISEE",
    "audience": "Nuclei con ISEE ordinario valido che vogliono verificare se possono aggiornarlo.",
    "authority": "INPS",
    "definition": {
      "questions": [],
      "steps": [
        {
          "id": "prepara_1",
          "title": "ISEE ordinario valido",
          "description": "Recupera l’attestazione e il protocollo della DSU ordinaria.",
          "kind": "document",
          "required": true
        },
        {
          "id": "prepara_2",
          "title": "Documenti su lavoro, redditi o trattamenti",
          "description": "Se la variazione è lavorativa o reddituale, prepara le prove pertinenti, ad esempio la comunicazione di cessazione e i documenti sui redditi o trattamenti del periodo richiesto da INPS.",
          "kind": "document",
          "required": false
        },
        {
          "id": "prepara_3",
          "title": "Dati patrimoniali aggiornati, se pertinenti",
          "description": "Se chiedi l’aggiornamento per variazione patrimoniale, raccogli i dati del patrimonio mobiliare e immobiliare del nucleo relativi all’anno precedente.",
          "kind": "document",
          "required": false
        },
        {
          "id": "sito_ufficiale",
          "title": "Apri il Portale unico ISEE",
          "description": "Apri il Portale unico ISEE di INPS e accedi per compilare la DSU per l’ISEE corrente dopo aver verificato i requisiti del tuo caso.",
          "kind": "portal",
          "required": false,
          "url": "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.Portale-unico-ISEE.html"
        }
      ]
    },
    "sources": [
      {
        "id": "ks_isee_corrente",
        "revisionId": "kr_isee_corrente_1",
        "citationId": "pc_isee_corrente_1",
        "title": "INPS — Tipologie di ISEE e requisiti dell’ISEE corrente",
        "url": "https://www.inps.it/it/it/dettaglio-approfondimento.schede-informative.49936.tipologie-di-isee.html",
        "summary": "Apri il Portale unico ISEE di INPS e accedi per compilare la DSU per l’ISEE corrente dopo aver verificato i requisiti del tuo caso. Verifica i casi previsti per perdita o variazione del lavoro o dei trattamenti, una variazione dell’indicatore reddituale superiore al 25% o dell’indicatore patrimoniale superiore al 20%. Le soglie si riferiscono agli indicatori del nucleo rispetto all’ISEE ordinario. Per i redditi il periodo dipende dal caso. Per la componente patrimoniale si può presentare la richiesta dal 1° aprile e si considerano i dati dell’anno precedente. Scarica l’attestazione da INPS. Verifica la durata applicabile e se un successivo cambiamento di occupazione o di trattamenti richiede un aggiornamento.",
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
    "procedureId": "pd_bonus_nuovi_nati_2026",
    "versionId": "pv_bonus_nuovi_nati_2026_1",
    "slug": "bonus-nuovi-nati-2026",
    "title": "Bonus nuovi nati 2026",
    "description": "Verifica requisiti, ISEE, documenti e scadenza per chiedere all’INPS il contributo una tantum da 1.000 euro.",
    "category": "Famiglia",
    "audience": "Genitori di minori nati, adottati o in affido preadottivo nel 2026, nei casi previsti dall’INPS.",
    "authority": "INPS",
    "definition": {
      "questions": [],
      "steps": [
        {
          "id": "prepara_1",
          "title": "Accesso a MyINPS",
          "description": "Prepara SPID, CIE o CNS per presentare la domanda online.",
          "kind": "document",
          "required": true
        },
        {
          "id": "prepara_2",
          "title": "Dati del minore",
          "description": "Tieni a portata di mano codice fiscale e data di nascita o dell’evento riconosciuto dall’INPS. Per adozione o affido preadottivo verifica i dati richiesti dal servizio.",
          "kind": "document",
          "required": false
        },
        {
          "id": "prepara_3",
          "title": "ISEE applicabile al minore",
          "description": "Per il 2026 verifica l’ISEE per specifiche prestazioni familiari e per l’inclusione applicabile al minore. La soglia è di 40.000 euro, al netto degli importi dell’Assegno unico secondo le regole INPS.",
          "kind": "document",
          "required": false
        },
        {
          "id": "prepara_4",
          "title": "Modalità di pagamento",
          "description": "Prepara i dati necessari per la modalità di pagamento che scegli sul portale.",
          "kind": "document",
          "required": false
        },
        {
          "id": "sito_ufficiale",
          "title": "Apri il servizio Bonus nuovi nati su INPS",
          "description": "Apri la scheda INPS del Bonus nuovi nati e seleziona «Utilizza il servizio». Per gli eventi del 2026 il contributo è di 1.000 euro una tantum, se sussistono i requisiti.",
          "kind": "portal",
          "required": false,
          "url": "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-nuovi-nati.html"
        }
      ]
    },
    "sources": [
      {
        "id": "ks_bonus_nuovi_nati_2026",
        "revisionId": "kr_bonus_nuovi_nati_2026_1",
        "citationId": "pc_bonus_nuovi_nati_2026_1",
        "title": "INPS — Requisiti e termini del Bonus nuovi nati",
        "url": "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-nuovi-nati.html",
        "summary": "Apri la scheda INPS del Bonus nuovi nati e seleziona «Utilizza il servizio». Per gli eventi del 2026 il contributo è di 1.000 euro una tantum, se sussistono i requisiti. Verifica cittadinanza o titolo di soggiorno, residenza e ISEE sulla scheda ufficiale. Se i genitori non convivono, la richiesta è presentata dal genitore che risiede con il minore. Conta 120 giorni dalla nascita o dall’ingresso in famiglia del minore. Per gli eventi del 2026 precedenti all’apertura del servizio INPS il termine transitorio era il 12 agosto 2026. Torna nel servizio INPS per verificare l’esito della domanda e leggere eventuali comunicazioni.",
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
