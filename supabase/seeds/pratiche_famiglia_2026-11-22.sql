-- Pubblica le due nuove guide INPS, verificate il 2026-11-22.
-- Inserimento atomico di nuovi contenuti. Una collisione interrompe l'intero lotto.
DO $publish$
DECLARE
  entry jsonb;
BEGIN
  FOR entry IN SELECT value FROM jsonb_array_elements($content$
[
  {
    "sourceId": "ks_assegno_unico",
    "revisionId": "kr_assegno_unico_1",
    "procedureId": "pd_assegno_unico",
    "versionId": "pv_assegno_unico_1",
    "citationId": "pc_assegno_unico_1",
    "sourceTitle": "INPS — Assegno unico e universale per i figli a carico",
    "url": "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.assegno-unico-e-universale-per-i-figli-a-carico-55984.assegno-unico-e-universale-per-i-figli-a-carico.html",
    "summary": "Guida ordinaria per famiglie residenti in Italia. Verifica lo stato di eventuali domande esistenti e aggiorna i dati variati. Per una nuova domanda usa il servizio INPS o un patronato. In assenza di ISEE valido l’importo è di norma quello minimo. Prepara i dati dei figli e della modalità di pagamento. Segui esito e comunicazioni sul servizio INPS.",
    "slug": "assegno-unico",
    "title": "Assegno unico per i figli",
    "description": "Scopri quando presentare o aggiornare la domanda, cosa preparare e come controllare l’esito su INPS.",
    "audience": "Genitori e altri soggetti ammessi dall’INPS. Questa guida descrive il percorso ordinario per le famiglie residenti in Italia.",
    "definition": {
      "questions": [],
      "steps": [
        {
          "id": "prepara_1",
          "title": "Accesso a MyINPS",
          "description": "Tieni a portata di mano SPID, CIE o CNS se presenti o consulti la domanda online.",
          "kind": "document",
          "required": true
        },
        {
          "id": "prepara_2",
          "title": "Dati dei figli e informazioni sul pagamento",
          "description": "Prepara i codici fiscali dei figli da includere, gli eventuali dati richiesti dell’altro genitore e l’IBAN se scegli l’accredito su conto.",
          "kind": "document",
          "required": true
        },
        {
          "id": "portale_inps",
          "title": "Apri il servizio Assegno unico su INPS",
          "description": "Usa il servizio INPS per la presentazione e per verificare quanto richiesto per il tuo caso.",
          "kind": "portal",
          "required": false,
          "url": "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.assegno-unico-e-universale-per-i-figli-a-carico-55984.assegno-unico-e-universale-per-i-figli-a-carico.html"
        }
      ]
    },
    "instructionIds": [
      "prepara_1",
      "prepara_2",
      "portale_inps"
    ]
  },
  {
    "sourceId": "ks_bonus_nido",
    "revisionId": "kr_bonus_nido_1",
    "procedureId": "pd_bonus_nido",
    "versionId": "pv_bonus_nido_1",
    "citationId": "pc_bonus_nido_1",
    "sourceTitle": "INPS — Bonus asilo nido e supporto domiciliare",
    "url": "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-asilo-nido-e-forme-di-supporto-presso-la-propria-abitazione-51105.bonus-asilo-nido-e-forme-di-supporto-presso-la-propria-abitazione.html",
    "summary": "Percorso del contributo per rette del nido. Il genitore che sostiene la spesa presenta una domanda per figlio tramite servizio INPS o patronato. Dal 2026, nei casi previsti, le domande restano valide fino ad agosto dell’anno dei tre anni e si aggiornano le mensilità ogni anno solare. Per il pagamento allega fattura o, quando ammesso, altro documento di spesa, insieme alla prova del pagamento tracciabile di ciascun mese. L’ISEE applicabile incide sull’importo.",
    "slug": "bonus-asilo-nido",
    "title": "Bonus asilo nido",
    "description": "Prepara la domanda INPS e organizza fatture, ricevute e prove di pagamento per le mensilità del nido.",
    "audience": "Genitori che sostengono le rette per la frequenza del nido e soddisfano i requisiti INPS.",
    "definition": {
      "questions": [],
      "steps": [
        {
          "id": "prepara_1",
          "title": "Dati del bambino e dell’asilo nido",
          "description": "Prepara il codice fiscale del bambino e le informazioni sulla struttura che il servizio richiede, compresi gli estremi dell’autorizzazione se pertinenti.",
          "kind": "document",
          "required": true
        },
        {
          "id": "prepara_2",
          "title": "Mesi per cui chiedi il contributo",
          "description": "Segna le mensilità da indicare nella domanda o da aggiornare per l’anno in corso.",
          "kind": "document",
          "required": true
        },
        {
          "id": "prepara_3",
          "title": "Documenti di spesa per ogni mese",
          "description": "Conserva la fattura. Quando la struttura non è tenuta a fatturare, verifica sulla scheda INPS se puoi usare una ricevuta o un avviso di pagamento.",
          "kind": "document",
          "required": false
        },
        {
          "id": "prepara_4",
          "title": "Prova del pagamento tracciabile",
          "description": "Per ogni mese conserva anche il giustificativo, per esempio la ricevuta del bonifico. Tienilo insieme al documento della retta.",
          "kind": "document",
          "required": false
        },
        {
          "id": "portale_inps",
          "title": "Apri il servizio Bonus asilo nido su INPS",
          "description": "Usa il servizio INPS per la presentazione e per verificare quanto richiesto per il tuo caso.",
          "kind": "portal",
          "required": false,
          "url": "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-asilo-nido-e-forme-di-supporto-presso-la-propria-abitazione-51105.bonus-asilo-nido-e-forme-di-supporto-presso-la-propria-abitazione.html"
        }
      ]
    },
    "instructionIds": [
      "prepara_1",
      "prepara_2",
      "prepara_3",
      "prepara_4",
      "portale_inps"
    ]
  }
]
$content$::jsonb)
  LOOP
    INSERT INTO "KnowledgeSource" ("id", "authority", "title", "url", "sourceType", "scope", "status", "provenance", "verifiedAt")
    VALUES (entry->>'sourceId', 'INPS', entry->>'sourceTitle', entry->>'url', 'SERVIZIO', 'Nazionale', 'VERIFIED',
      jsonb_build_object('reviewedOn', '2026-11-22', 'reviewedBy', 'Codex'), CURRENT_TIMESTAMP);

    INSERT INTO "KnowledgeRevision" ("id", "sourceId", "version", "content", "contentHash", "status")
    VALUES (entry->>'revisionId', entry->>'sourceId', 1, entry->>'summary',
      encode(sha256(convert_to(entry->>'summary', 'UTF8')), 'hex'), 'VERIFIED');

    INSERT INTO "ProcedureDefinition" ("id", "slug", "title", "description", "category", "audience", "scope", "authority", "status")
    VALUES (entry->>'procedureId', entry->>'slug', entry->>'title', entry->>'description', 'Famiglia',
      entry->>'audience', 'Nazionale', 'INPS', 'DRAFT');

    INSERT INTO "ProcedureVersion" ("id", "procedureId", "version", "definition", "status")
    VALUES (entry->>'versionId', entry->>'procedureId', 1, entry->'definition', 'DRAFT');

    INSERT INTO "ProcedureCitation" ("id", "procedureVersionId", "sourceId", "revisionId", "instructionIds")
    VALUES (entry->>'citationId', entry->>'versionId', entry->>'sourceId', entry->>'revisionId',
      ARRAY(SELECT jsonb_array_elements_text(entry->'instructionIds')));

    UPDATE "ProcedureVersion" SET "status" = 'PUBLISHED', "approvedAt" = CURRENT_TIMESTAMP, "effectiveAt" = CURRENT_TIMESTAMP
    WHERE "id" = entry->>'versionId';
    UPDATE "ProcedureDefinition" SET "status" = 'PUBLISHED' WHERE "id" = entry->>'procedureId';

    INSERT INTO "KnowledgeAudit" ("id", "entityType", "entityId", "action", "metadata")
    VALUES
      ('audit_verified_' || (entry->>'sourceId'), 'SOURCE', entry->>'sourceId', 'VERIFIED',
        jsonb_build_object('executedBy', 'Codex', 'revisionId', entry->>'revisionId')),
      ('audit_published_' || (entry->>'versionId'), 'PROCEDURE_VERSION', entry->>'versionId', 'PUBLISHED',
        jsonb_build_object('executedBy', 'Codex', 'slug', entry->>'slug'));
  END LOOP;
END;
$publish$;
