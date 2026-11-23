export type PracticalGuide = {
  destination: string;
  destinationHeading?: string;
  stepsHeading?: string;
  link: { label: string; href: string };
  alternative: string;
  documents: { title: string; detail: string }[];
  steps: { title: string; detail: string }[];
  source: { label: string; href: string };
  references?: { label: string; href: string }[];
  example?: {
    title: string;
    detail: string;
    rows: { label: string; calculation: string; amount: string }[];
  };
};

// Riepiloghi per le versioni pilota pubblicate. Una nuova versione richiede una propria revisione dei testi.
const guides: Readonly<Record<string, PracticalGuide>> = {
  pv_permesso_famiglia_1: {
    destination: "Per il primo rilascio dopo il ricongiungimento, contatta lo Sportello Unico che ha rilasciato il nulla osta per il Modulo 1. Presenta il kit in un ufficio postale Sportello Amico. Per il rinnovo, controlla gli allegati e consegna il kit allo Sportello Amico.",
    link: {
      label: "Apri la scheda del permesso per famiglia",
      href: "https://www.portaleimmigrazione.it/ITA/soggFamiglia.html"
    },
    alternative: "Se il tuo familiare è italiano o cittadino di un altro Paese UE, verifica il percorso con la Questura competente prima di usare questo kit.",
    documents: [
      {
        title: "Passaporto",
        detail: "Porta l’originale e una copia di tutte le pagine o del documento equivalente."
      },
      {
        title: "Modulo 1 del kit",
        detail: "Compila e firma il modulo. Per il primo rilascio dopo il ricongiungimento, il modulo viene compilato presso lo Sportello Unico."
      },
      {
        title: "Permesso attuale e dichiarazione del familiare, per il rinnovo",
        detail: "Prepara il permesso da rinnovare e la dichiarazione di sostentamento del familiare con cui è avvenuto il ricongiungimento o la coesione familiare."
      }
    ],
    steps: [
      {
        title: "Avvia la richiesta",
        detail: "Se sei entrato con un visto per ricongiungimento, contatta subito lo Sportello Unico per presentare la richiesta del primo permesso entro otto giorni lavorativi dall’ingresso. Se devi rinnovare, controlla la scadenza e prepara il kit."
      },
      {
        title: "Consegna il kit",
        detail: "Porta il passaporto originale per l’identificazione allo Sportello Amico e conserva la ricevuta postale."
      },
      {
        title: "Segui la convocazione della Questura",
        detail: "Controlla l’appuntamento e porta i documenti richiesti. Puoi usare il numero sulla ricevuta per seguire la pratica."
      }
    ],
    source: {
      label: "Portale Immigrazione, permesso per famiglia",
      href: "https://www.portaleimmigrazione.it/ITA/soggFamiglia.html"
    },
    references: [
      {
        label: "Portale Immigrazione, procedura per presentare il kit",
        href: "https://www.portaleimmigrazione.it/ITA/nuovaProcedura.html"
      },
      {
        label: "Normattiva, regole per la richiesta di permesso",
        href: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:1998-07-25;286!vig=~art5"
      }
    ]
  },
  pv_ricongiungimento_1: {
    destination: "Accedi al Portale Servizi ALI e presenta la domanda di nulla osta allo Sportello Unico per l’Immigrazione della Prefettura competente per la tua residenza.",
    link: {
      label: "Apri il Portale Servizi ALI",
      href: "https://portaleservizi.dlci.interno.it/AliSportello/ali/home.htm"
    },
    alternative: "I familiari di cittadini italiani o di altri Paesi UE seguono un percorso specifico. Consulta il consolato italiano competente per il luogo in cui vive il familiare.",
    documents: [
      {
        title: "Titolo di soggiorno e passaporto",
        detail: "Verifica che il tuo titolo consenta il ricongiungimento. Prepara anche i dati e il passaporto del familiare all’estero."
      },
      {
        title: "Documenti sul reddito",
        detail: "Controlla la soglia applicabile e i documenti richiesti dalla Prefettura per il tuo tipo di reddito."
      },
      {
        title: "Documenti dell’alloggio",
        detail: "Chiedi alla Prefettura quali atti servono per dimostrare disponibilità e idoneità dell’alloggio nel tuo caso."
      },
      {
        title: "Atti che provano il legame familiare",
        detail: "Il familiare li presenta al consolato per il visto. Controlla se servono traduzione, legalizzazione o apostille."
      }
    ],
    steps: [
      {
        title: "Chiedi il nulla osta",
        detail: "Accedi con SPID o CIE, allega quanto richiesto e controlla sul portale eventuali richieste di integrazione."
      },
      {
        title: "Il familiare chiede il visto",
        detail: "Dopo il rilascio del nulla osta, il familiare chiede il visto alla rappresentanza italiana competente. Il nulla osta va utilizzato entro sei mesi dal rilascio."
      },
      {
        title: "Avvia il primo permesso dopo l’ingresso",
        detail: "Contatta subito lo Sportello Unico che ha rilasciato il nulla osta. Segui le indicazioni per presentare la richiesta entro otto giorni lavorativi dall’ingresso."
      }
    ],
    source: {
      label: "Istruzioni sul ricongiungimento, Prefettura di Chieti",
      href: "https://prefettura.interno.gov.it/it/prefetture/chieti/ricongiungimento-familiare"
    },
    references: [
      {
        label: "Documenti e nulla osta, Prefettura di Firenze",
        href: "https://prefettura.interno.gov.it/it/prefetture/firenze/nulla-osta-ricongiungimento-familiare"
      }
    ]
  },
  pv_controllo_permesso_1: {
    destination: "Apri il servizio nazionale della Polizia di Stato. Usa il numero di pratica o il numero dell’assicurata che trovi sulla ricevuta.",
    destinationHeading: "Dove controllare lo stato",
    stepsHeading: "Come leggere l’esito",
    link: {
      label: "Controlla sul sito della Polizia di Stato",
      href: "https://questure.poliziadistato.it/stranieri/"
    },
    alternative: "Se ti hanno indicato un canale diverso, consulta la pagina della Questura che segue la tua pratica.",
    documents: [
      {
        title: "Ricevuta della domanda",
        detail: "Usa il numero di pratica di 10 caratteri sulla ricevuta della Questura o il numero dell’assicurata di 12 caratteri sulla ricevuta di Poste Italiane. Te ne basta uno."
      }
    ],
    steps: [
      {
        title: "Inserisci il numero che hai sulla ricevuta",
        detail: "Compila il campo per il numero di pratica o di assicurata e invia la ricerca."
      },
      {
        title: "Leggi lo stato",
        detail: "Se la pratica è in lavorazione, ricontrolla più avanti. Se vengono chiesti altri documenti, segui le istruzioni della Questura."
      },
      {
        title: "Controlla quando e dove ritirarlo",
        detail: "Se il permesso è pronto, consulta l’SMS o le indicazioni della Questura per l’appuntamento e i documenti da portare."
      }
    ],
    source: {
      label: "Istruzioni della Questura sul controllo del permesso",
      href: "https://questure.poliziadistato.it/it/Firenze/articolo/3333685d0c8686064511381967"
    },
    references: [
      {
        label: "Servizio nazionale di controllo",
        href: "https://questure.poliziadistato.it/stranieri/"
      }
    ]
  },
  pv_cittadinanza_residenza_1: {
    destination: "Accedi al Portale Servizi del Ministero dell’Interno con SPID o CIE, seleziona «Richiesta Cittadinanza Italiana» e scegli il modello per residenza che corrisponde alla tua situazione.",
    link: {
      label: "Apri il Portale Servizi del Ministero",
      href: "https://portaleservizi.dlci.interno.it/"
    },
    alternative: "Se hai dubbi su quale categoria scegliere o su come presentare un atto estero, consulta la Prefettura competente per il tuo Comune di residenza.",
    documents: [
      {
        title: "Documento d’identità e titolo di soggiorno, se previsto",
        detail: "Tieni a portata un documento di riconoscimento e l’eventuale titolo di soggiorno."
      },
      {
        title: "Atto di nascita e certificato penale",
        detail: "Verifica quali atti esteri servono, la loro validità e se occorrono traduzione, legalizzazione o apostille. La Prefettura indica gli eventuali documenti sostitutivi."
      },
      {
        title: "Redditi e conoscenza dell’italiano",
        detail: "Prepara i dati sui redditi degli ultimi tre anni. Controlla come dimostrare il livello B1 d’italiano o se rientri in un’esenzione."
      },
      {
        title: "Contributo e bollo",
        detail: "Segui le istruzioni del portale per il contributo di 250 euro e l’imposta di bollo."
      }
    ],
    steps: [
      {
        title: "Verifica gli anni di residenza",
        detail: "Nei casi ordinari servono almeno 10 anni di residenza legale e continuativa per i cittadini non UE e almeno 4 per i cittadini UE. L’articolo 9 prevede anche altri casi. Controlla il tuo prima di pagare."
      },
      {
        title: "Compila, allega e invia",
        detail: "Controlla i dati, carica gli allegati richiesti e conserva la ricevuta."
      },
      {
        title: "Segui la pratica fino all’esito",
        detail: "Consulta le comunicazioni sul portale. Se ricevi il decreto di concessione, segui le istruzioni del Comune per il giuramento, da prestare di norma entro sei mesi dalla notifica."
      }
    ],
    source: {
      label: "Istruzioni del Ministero per inviare la domanda",
      href: "https://www.interno.gov.it/it/temi/cittadinanza-e-altri-diritti-civili/cittadinanza/cittadinanza-invia-tua-domanda"
    },
    references: [
      {
        label: "Requisiti per la cittadinanza per residenza",
        href: "https://libertaciviliimmigrazione.dlci.interno.gov.it/temi/concessione-della-cittadinanza-italiana-residenza-sul-territorio-italiano-ai-sensi-dellart-9"
      },
      {
        label: "Procedimento e giuramento",
        href: "https://libertaciviliimmigrazione.dlci.interno.gov.it/ufficio-iv-cittadinanza"
      },
      {
        label: "Documenti e verifiche, guida della Prefettura",
        href: "https://prefettura.interno.gov.it/sites/default/files/89/2024-03/guida_alla_cittadinanza_italiana_short_version.pdf"
      }
    ]
  },
  pv_bonus_sociale_1: {
    destination: "Per il bonus sociale per disagio economico basta presentare la DSU per ottenere l’ISEE. Lo sconto scatta in automatico se il tuo nucleo e la fornitura rispettano i requisiti.",
    destinationHeading: "Come ottenere il bonus",
    stepsHeading: "Cosa controllare e quando",
    link: {
      label: "Controlla requisiti e soglie su ARERA",
      href: "https://www.arera.it/consumatori/bonus-sociale/bonus-sociale-per-disagio-economico/quali-sono-i-requisiti"
    },
    alternative: "Puoi fare la DSU sul Portale unico ISEE oppure chiedere aiuto a un CAF.",
    documents: [
      {
        title: "ISEE valido",
        detail: "Controlla il limite ISEE fissato da ARERA per l’anno in cui hai presentato la DSU. Il limite dipende anche dal numero di figli a carico."
      },
      {
        title: "Una bolletta recente",
        detail: "Per un’utenza individuale, cerca il codice della fornitura e controlla a chi è intestata. L’intestatario deve far parte del nucleo indicato nell’ISEE."
      },
      {
        title: "Codice PDR per il gas condominiale",
        detail: "Se ti arriva una lettera che chiede il PDR, fatti dare il codice dall’amministratore e comunicalo come indicato nella lettera."
      }
    ],
    steps: [
      {
        title: "Controlla se l’ISEE è pronto",
        detail: "Dopo aver inviato la DSU, cerca l’attestazione nel Portale unico ISEE. Se ti sei rivolto a un CAF, puoi chiederla lì."
      },
      {
        title: "Dove cercare il bonus",
        detail: "Per un’utenza intestata a te o a un familiare del nucleo, cerca lo sconto in bolletta. Se gas o acqua sono condominiali, consulta le istruzioni ARERA qui sotto."
      },
      {
        title: "Se lo sconto non compare",
        detail: "Parti dalla data dell’ISEE e dai tempi indicati da ARERA. Poi controlla l’intestatario della bolletta o, per il gas condominiale, se hai ricevuto la lettera. Se è già passato il tempo previsto, usa i contatti riportati da ARERA."
      }
    ],
    source: {
      label: "Tempi e modalità del bonus sul sito ARERA",
      href: "https://www.arera.it/consumatori/bonus-sociale/bonus-sociale-per-disagio-economico/come-e-quando-si-ricevono"
    }
  },
  pv_lettura_bolletta_1: {
    destination: "Nel PDF del fornitore trovi il totale in prima pagina. Nelle pagine successive, lo scontrino dell’energia ti dice da dove viene la spesa e il box dell’offerta ti ricorda le condizioni del contratto.",
    destinationHeading: "Dove trovare le informazioni",
    stepsHeading: "Le tre parti da leggere",
    link: {
      label: "Com’è fatta la bolletta sul sito ARERA",
      href: "https://www.arera.it/nuova-bolletta"
    },
    alternative: "Se una cifra non ti torna, cerca gli «elementi di dettaglio» indicati dal fornitore.",
    documents: [
      {
        title: "Bolletta completa",
        detail: "Apri il PDF completo. Ti serve anche la pagina con gli eventuali ricalcoli."
      },
      {
        title: "Bolletta precedente, se vuoi confrontare i consumi",
        detail: "Scegli due periodi simili. Prima di confrontarli, guarda se i consumi sono stimati o se si basano su una lettura del contatore, compresa l’autolettura."
      }
    ],
    steps: [
      {
        title: "Periodo, totale e scadenza in prima pagina",
        detail: "Se hai più utenze, controlla anche l’indirizzo della fornitura e i riferimenti per il pagamento."
      },
      {
        title: "Consumi e quote fisse nello scontrino",
        detail: "I consumi si leggono in kWh per la luce e in Smc per il gas. Tienili distinti dalla quota fissa e, per la luce, dalla quota potenza. Nel totale trovi anche imposte, IVA ed eventuali altre voci."
      },
      {
        title: "Prezzo e scadenza nel box dell’offerta",
        detail: "Cerca il nome dell’offerta e guarda se il prezzo è fisso o variabile. Controlla fino a quando valgono le condizioni economiche."
      }
    ],
    source: {
      label: "Il formato della bolletta spiegato da ARERA",
      href: "https://www.arera.it/nuova-bolletta"
    },
    example: {
      title: "Esempio di lettura dello scontrino luce",
      detail: "L’esempio copre un mese. Per arrivare al totale della tua bolletta, aggiungi le imposte, l’IVA e le eventuali altre voci.",
      rows: [
        {
          label: "Quota consumi",
          calculation: "150 kWh × 0,16 €/kWh",
          amount: "24,00 €"
        },
        {
          label: "Quota fissa",
          calculation: "1 mese × 10,00 €/mese",
          amount: "10,00 €"
        },
        {
          label: "Quota potenza",
          calculation: "3 kW × 1,80 €/kW per un mese",
          amount: "5,40 €"
        },
        {
          label: "Subtotale dell’esempio",
          calculation: "24,00 € + 10,00 € + 5,40 €",
          amount: "39,40 €"
        }
      ]
    }
  },
  pv_voltura_subentro_1: {
    destination: "La richiesta si fa al venditore. Se la fornitura è attiva, chiedi la voltura seguendo la procedura per quella fornitura. Per riattivare una fornitura dopo la chiusura del vecchio contratto, chiedi il subentro al venditore che hai scelto.",
    destinationHeading: "A chi chiedere voltura o subentro",
    stepsHeading: "Dal controllo del contatore alla prima bolletta",
    link: {
      label: "Consulta le pratiche per la luce su ARERA",
      href: "https://www.arera.it/single-digital-gateway-elettricita"
    },
    alternative: "Se la casa non è collegata alla rete, chiedi al venditore come fare l’allacciamento. Se il contatore c’è ma non è mai stato usato, chiedi della prima attivazione.",
    documents: [
      {
        title: "POD per la luce o PDR per il gas",
        detail: "Di solito il codice è su una vecchia bolletta. Se non l’hai, chiedi al proprietario. Il venditore può indicarti quali altri dati usare per trovare la fornitura."
      },
      {
        title: "Dati del nuovo intestatario e indirizzo",
        detail: "Tieni a portata di mano documento, codice fiscale e indirizzo. Chiedi al venditore quali dati vuole sul contratto d’affitto o su un altro titolo che ti consente di occupare la casa."
      },
      {
        title: "Dati del contatore e del pagamento, se richiesti",
        detail: "Tieni disponibili matricola e lettura del contatore. Prepara l’IBAN se scegli la domiciliazione."
      }
    ],
    steps: [
      {
        title: "La fornitura è ancora attiva?",
        detail: "Chiedi al proprietario o al venditore se luce e gas sono ancora attivi. Potresti dover fare la voltura per un’utenza e il subentro per l’altra."
      },
      {
        title: "Invia la richiesta al venditore",
        detail: "Usa il canale indicato dal venditore e dagli il POD o il PDR insieme agli altri dati che ti chiede. Prima di inoltrare la richiesta, fatti dare costi e tempi."
      },
      {
        title: "Dopo la richiesta",
        detail: "Conserva la ricevuta. Se hai chiesto un subentro, segui le indicazioni del venditore per la riattivazione. Controlla il nome dell’intestatario sulla prima bolletta."
      }
    ],
    source: {
      label: "Voltura e subentro del gas sul sito ARERA",
      href: "https://www.arera.it/single-digital-gateway-gas"
    }
  },
  pv_isee_corrente_1: {
    destination: "Se hai già un ISEE ordinario valido, puoi chiedere l’ISEE corrente dal Portale unico ISEE di INPS. Accedi e compila la DSU per l’ISEE corrente.",
    link: {
      label: "Apri il Portale unico ISEE",
      href: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.Portale-unico-ISEE.html"
    },
    alternative: "Se preferisci rivolgerti a un CAF, porta il tuo ISEE ordinario e i documenti che mostrano cosa è cambiato.",
    documents: [
      {
        title: "ISEE ordinario valido",
        detail: "Recupera l’attestazione e il protocollo della DSU ordinaria."
      },
      {
        title: "Documenti su lavoro, redditi o trattamenti",
        detail: "Se hai perso il lavoro, tieni la comunicazione di cessazione. Raccogli anche i documenti su redditi o prestazioni per il periodo che l’INPS chiede nel tuo caso."
      },
      {
        title: "Patrimonio del nucleo, se è cambiato",
        detail: "Per un aggiornamento del patrimonio servono i dati dell’anno precedente, sia quelli di conti e altri beni mobiliari sia quelli degli immobili del nucleo."
      }
    ],
    steps: [
      {
        title: "Quando puoi richiederlo",
        detail: "L’INPS prevede casi specifici per chi perde il lavoro, cambia situazione lavorativa o subisce una variazione dei trattamenti. Puoi richiederlo anche se, rispetto all’ISEE ordinario, l’indicatore reddituale del nucleo varia di oltre il 25% o quello patrimoniale di oltre il 20%."
      },
      {
        title: "Quale periodo conta",
        detail: "Per i redditi, controlla sul sito INPS quale periodo si applica alla tua situazione. Se aggiorni il patrimonio, puoi farlo dal 1° aprile con i dati dell’anno precedente."
      },
      {
        title: "Dopo l’invio della DSU",
        detail: "Quando trovi l’attestazione sul portale INPS, scaricala e controlla la scadenza. Se cambiano di nuovo il lavoro o i trattamenti, verifica se devi aggiornarla."
      }
    ],
    source: {
      label: "Requisiti dell’ISEE corrente sul sito INPS",
      href: "https://www.inps.it/it/it/dettaglio-approfondimento.schede-informative.49936.tipologie-di-isee.html"
    }
  },
  pv_bonus_nuovi_nati_2026_1: {
    destination: "Sulla scheda INPS del Bonus nuovi nati, scegli «Utilizza il servizio». Per una nascita, un’adozione o un affido preadottivo nel 2026, il bonus è di 1.000 euro in un solo pagamento se hai diritto al contributo.",
    link: {
      label: "Apri il servizio Bonus nuovi nati su INPS",
      href: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-nuovi-nati.html"
    },
    alternative: "Puoi presentare la domanda anche tramite un patronato.",
    documents: [
      {
        title: "Accesso a MyINPS",
        detail: "Prepara SPID, CIE o CNS per presentare la domanda online."
      },
      {
        title: "Dati del minore",
        detail: "Ti servono il codice fiscale del minore e la data di nascita o di ingresso in famiglia. Per adozione e affido preadottivo, controlla nel servizio quali altri dati ti chiede l’INPS."
      },
      {
        title: "ISEE applicabile al minore",
        detail: "Per il 2026 serve l’ISEE per specifiche prestazioni familiari e per l’inclusione riferito al minore. Il limite è di 40.000 euro. Nel calcolo l’INPS esclude gli importi dell’Assegno unico."
      },
      {
        title: "Modalità di pagamento",
        detail: "Scegli sul portale come vuoi ricevere il bonus e inserisci i dati richiesti."
      }
    ],
    steps: [
      {
        title: "Controlla chi può presentare la domanda",
        detail: "La scheda INPS indica i requisiti di cittadinanza o soggiorno, residenza e ISEE. Se i genitori vivono separati, fa domanda il genitore che risiede con il minore."
      },
      {
        title: "Quando scadono i 120 giorni",
        detail: "Invia la domanda entro 120 giorni dalla nascita o dall’ingresso del minore in famiglia. Se l’evento era avvenuto nel 2026 prima dell’apertura del servizio, la scadenza era il 12 agosto 2026."
      },
      {
        title: "Dove vedere l’esito",
        detail: "Salva la ricevuta. Riapri il servizio INPS per vedere l’esito o leggere i messaggi sulla domanda."
      }
    ],
    source: {
      label: "Requisiti e scadenze sul sito INPS",
      href: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-nuovi-nati.html"
    }
  },
  pv_assegno_unico_1: {
    references: [{ label: "INPS, domande e aggiornamenti dell’Assegno unico nel 2026", href: "https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.02.assegno-unico-2026-presentazione-domanda-e-aggiornamento-importi.html" }],
    destination: "Apri la scheda INPS dell’Assegno unico e seleziona «Utilizza il servizio». Da lì puoi controllare una domanda già presentata, aggiornarla o avviarne una nuova.",
    link: {
      label: "Apri il servizio Assegno unico su INPS",
      href: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.assegno-unico-e-universale-per-i-figli-a-carico-55984.assegno-unico-e-universale-per-i-figli-a-carico.html"
    },
    alternative: "Puoi farti assistere da un patronato. Se vivi fuori dall’Italia o la tua famiglia ha una situazione transfrontaliera, controlla le istruzioni specifiche dell’INPS.",
    documents: [
      {
        title: "Accesso a MyINPS",
        detail: "Tieni a portata di mano SPID, CIE o CNS se presenti o consulti la domanda online."
      },
      {
        title: "Dati dei figli e informazioni sul pagamento",
        detail: "Prepara i codici fiscali dei figli da includere, gli eventuali dati richiesti dell’altro genitore e l’IBAN se scegli l’accredito su conto."
      },
      {
        title: "ISEE valido, se disponibile",
        detail: "L’INPS usa l’ISEE per determinare l’importo. In assenza di un ISEE valido si può presentare domanda, con l’importo minimo previsto per il caso."
      }
    ],
    steps: [
      {
        title: "Controlla se hai già una domanda accolta",
        detail: "Se la domanda risulta ancora accolta, di norma non devi inviarne un’altra. Aggiorna i dati quando cambiano, per esempio dopo una nascita."
      },
      {
        title: "Presenta la domanda se necessaria",
        detail: "Apri il servizio con la tua identità digitale, indica i figli per cui chiedi la prestazione e completa le informazioni sul pagamento."
      },
      {
        title: "Segui l’esito",
        detail: "Consulta la domanda sul portale INPS e controlla eventuali richieste di integrazione o comunicazioni sul pagamento."
      }
    ],
    source: {
      label: "Istruzioni ufficiali INPS sull’Assegno unico",
      href: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.assegno-unico-e-universale-per-i-figli-a-carico-55984.assegno-unico-e-universale-per-i-figli-a-carico.html"
    }
  },
  pv_bonus_nido_1: {
    destination: "Apri la scheda INPS e scegli «Utilizza il servizio» per il Bonus asilo nido. Il portale consente di inviare la domanda, indicare le mensilità e allegare i documenti di spesa.",
    link: {
      label: "Apri il servizio Bonus asilo nido su INPS",
      href: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-asilo-nido-e-forme-di-supporto-presso-la-propria-abitazione-51105.bonus-asilo-nido-e-forme-di-supporto-presso-la-propria-abitazione.html"
    },
    alternative: "Puoi rivolgerti a un patronato. Questa guida riguarda le rette del nido. Per il supporto presso l’abitazione, consulta nella stessa scheda INPS le istruzioni dedicate.",
    documents: [
      {
        title: "Dati del bambino e dell’asilo nido",
        detail: "Prepara il codice fiscale del bambino e le informazioni sulla struttura che il servizio richiede, compresi gli estremi dell’autorizzazione se pertinenti."
      },
      {
        title: "Mesi per cui chiedi il contributo",
        detail: "Segna le mensilità da indicare nella domanda o da aggiornare per l’anno in corso."
      },
      {
        title: "Documenti di spesa per ogni mese",
        detail: "Conserva la fattura. Quando la struttura non è tenuta a fatturare, verifica sulla scheda INPS se puoi usare una ricevuta o un avviso di pagamento."
      },
      {
        title: "Prova del pagamento tracciabile",
        detail: "Per ogni mese conserva anche il giustificativo, per esempio la ricevuta del bonifico. Tienilo insieme al documento della retta."
      },
      {
        title: "ISEE applicabile alla prestazione",
        detail: "Controlla sulla scheda INPS quale indicatore per il minore si applica al tuo anno di domanda. L’indicatore incide sull’importo del contributo."
      }
    ],
    steps: [
      {
        title: "Verifica chi presenta la domanda",
        detail: "Per la retta, la domanda è presentata dal genitore che sostiene il pagamento. Se chiedi il contributo per più figli, serve una domanda per ciascuno."
      },
      {
        title: "Avvia o aggiorna la domanda su INPS",
        detail: "Le domande presentate dal 2026 valgono fino ad agosto dell’anno in cui il bambino compie tre anni. Ogni anno indica le mensilità per cui chiedi il contributo. Se devi fare una nuova domanda, scegli il contributo per la frequenza del nido."
      },
      {
        title: "Allega i documenti per ogni mensilità",
        detail: "Associa alla mensilità il documento di spesa e la prova del pagamento. Controlla nel servizio le scadenze e le istruzioni aggiornate per gli allegati."
      },
      {
        title: "Controlla esito e pagamenti",
        detail: "Torna alla domanda nel servizio INPS per verificare lo stato, i documenti acquisiti e le eventuali richieste di integrazione."
      }
    ],
    source: {
      label: "Istruzioni ufficiali INPS per il Bonus asilo nido",
      href: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-asilo-nido-e-forme-di-supporto-presso-la-propria-abitazione-51105.bonus-asilo-nido-e-forme-di-supporto-presso-la-propria-abitazione.html"
    }
  },
  pv_residenza_1: {
    references: [{ label: "Dipartimento per la trasformazione digitale, servizi ANPR", href: "https://innovazione.gov.it/dipartimento/focus/servizi-digitali-anagrafe-nazionale/" }],
    destination: "Accedi ad ANPR con SPID, CIE o CNS e apri Cambio di residenza. Il servizio si rivolge ai maggiorenni già registrati in ANPR per trasferimenti in Italia o, se iscritti all’AIRE, per il rientro dall’estero. La dichiarazione arriva al Comune della nuova abitazione.",
    link: {
      label: "Vai al cambio di residenza su ANPR",
      href: "https://www.anagrafenazionale.interno.it/area-cittadino/cambio-di-residenza/",
    },
    alternative: "Se il portale non copre la tua situazione o non riesci a usarlo, cerca «Cambio di residenza» sul sito del Comune di destinazione. L’Ufficio Anagrafe indica il modulo, gli allegati e i canali accettati.",
    documents: [
      { title: "Indirizzo e persone che si trasferiscono", detail: "Tieni pronti Comune, via, numero civico e, se presenti, scala, piano e interno. Controlla le generalità dei familiari che si trasferiscono con te. Se entri in una famiglia già residente, servono anche le generalità di un suo componente." },
      { title: "Se la casa è di tua proprietà", detail: "Prepara gli estremi catastali che trovi nel rogito o nella visura, come foglio, particella e subalterno." },
      { title: "Se sei in affitto o in comodato registrato", detail: "Tieni a portata di mano il contratto e gli estremi di registrazione presso l’Agenzia delle Entrate." },
      { title: "Se sei ospite o hai un altro titolo", detail: "Indica su quale base puoi abitare lì. Verifica con il Comune se per il tuo caso serve una dichiarazione di assenso del proprietario o dell’intestatario del contratto, con copia del documento di chi firma." },
      { title: "Allegati e altri dati, secondo il caso", detail: "Carica il titolo di soggiorno se richiesto per la tua situazione e i documenti utili a dimostrare il titolo di occupazione. Tieni a portata di mano anche i dati di patente e veicoli se il portale li chiede." },
    ],
    steps: [
      { title: "Accedi e avvia la richiesta", detail: "In ANPR apri Servizi → Cambio di residenza e seleziona Richiedi cambio di residenza." },
      { title: "Scegli il tipo di dichiarazione", detail: "Seleziona «Nuova residenza» se vai a vivere da solo, con chi si trasferisce con te o con persone senza legami familiari o affettivi. Scegli «Residenza in famiglia esistente» se entri in una famiglia con cui hai questi legami." },
      { title: "Compila Famiglia, Residenza e Immobile", detail: "Indica chi si trasferisce, il nuovo indirizzo e il titolo che ti permette di abitare lì. Compila i recapiti e aggiungi gli allegati richiesti." },
      { title: "Controlla il riepilogo e invia", detail: "Rileggi i dati. Se ci sono altri maggiorenni coinvolti, invia per convalida: ciascuno accede con la propria identità digitale e conferma in «Le tue richieste». L’invio al Comune si completa dopo tutte le convalide." },
      { title: "Segui la richiesta su ANPR", detail: "Apri «Le tue richieste» per controllare lo stato, leggere le comunicazioni e scaricare la copia della dichiarazione." },
    ],
    source: {
      label: "Guida ANPR alla compilazione del cambio di residenza",
      href: "https://public-anpr.github.io/anpr-docs-cittadino/src/docs/guide/guida_compilazione_cambio_residenza.pdf",
    },
  },
  pv_certificati_1: {
    destination: "Accedi ad ANPR con SPID, CIE o CNS. Puoi scegliere i certificati disponibili per te o per una persona della tua famiglia anagrafica.",
    link: {
      label: "Vai ai certificati su ANPR",
      href: "https://www.anagrafenazionale.interno.it/area-cittadino/certificati/",
    },
    alternative: "Per un certificato storico, per una persona fuori dalla tua famiglia anagrafica o se agisci come tutore, chiedi all’Ufficio Anagrafe quale canale usare. Se fai parte di una convivenza anagrafica, questo percorso online riguarda il tuo certificato.",
    documents: [
      { title: "Identità digitale", detail: "Tieni pronto SPID, CIE o CNS. Per un familiare la guida ANPR richiede che risulti registrato un documento d’identità valido del richiedente." },
      { title: "Nome del certificato, destinatario e uso", detail: "Per esempio, residenza o stato di famiglia. Verifica per chi lo richiedi e a cosa serve, perché l’uso determina l’eventuale esenzione dal bollo." },
    ],
    steps: [
      { title: "Accedi e scegli per chi fare la richiesta", detail: "Apri il servizio Certificati e seleziona te stesso oppure il familiare tra quelli disponibili." },
      { title: "Scegli il certificato e indica l’uso", detail: "Seleziona il documento e, se previsto, il motivo di esenzione. Se il bollo è dovuto, il servizio consente il pagamento online." },
      { title: "Controlla l’anteprima e ottieni il PDF", detail: "Verifica i dati prima di confermare. Scarica il certificato o scegli una modalità di ricezione proposta dal portale." },
    ],
    source: {
      label: "Guida del Ministero dell’Interno ai certificati ANPR",
      href: "https://sc.anpr.interno.it/serviziCittadino/dist/docs/guida_richiesta_certificato.pdf",
    },
  },
  pv_isee_1: {
    references: [{ label: "INPS, la nuova DSU e l’indicatore per le prestazioni familiari", href: "https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.03.dichiarazione-sostitutiva-unica-disponibile-il-nuovo-modello.html" }],
    destination: "Per ottenere l’ISEE devi presentare la Dichiarazione sostitutiva unica (DSU). Puoi usare il Portale unico ISEE dell’INPS con SPID, CIE o CNS.",
    link: {
      label: "Apri il Portale unico ISEE dell’INPS",
      href: "https://servizi2.inps.it/servizi/ISEEPrecompilato/",
    },
    alternative: "Se preferisci assistenza, puoi presentare la DSU tramite un CAF. Chiedi al CAF quali documenti portare per la tua situazione e per la prestazione che vuoi richiedere.",
    documents: [
      { title: "Dati delle persone del nucleo", detail: "Prepara i codici fiscali e controlla chi fa parte del nucleo alla data in cui presenti la DSU." },
      { title: "Redditi, conti e altri beni", detail: "Per l’ISEE ordinario, prepara i dati di due anni prima, per esempio Certificazione Unica o dichiarazione dei redditi, saldo al 31 dicembre e giacenza media dei conti." },
      { title: "Casa e altre situazioni rilevanti", detail: "Se vivi in affitto, tieni a portata di mano contratto registrato e canone. Prepara i dati degli immobili o gli altri documenti richiesti per il tuo nucleo." },
    ],
    steps: [
      { title: "Verifica quale ISEE ti serve", detail: "Controlla i requisiti della prestazione. Dal 2026 l’INPS usa un indicatore specifico per alcune prestazioni, tra cui Assegno unico e Bonus asilo nido. In alcune situazioni può servire una DSU integrale." },
      { title: "Apri la DSU e indica il nucleo", detail: "Nel portale INPS avvia la dichiarazione. Per la precompilata segui la procedura per le autorizzazioni digitali dei maggiorenni oppure per i dati di riscontro." },
      { title: "Controlla, completa e presenta la DSU", detail: "Verifica i dati proposti, aggiungi quelli richiesti e invia la dichiarazione." },
      { title: "Scarica l’attestazione", detail: "Torna al Portale unico ISEE per consultare l’attestazione quando è disponibile." },
    ],
    source: {
      label: "Istruzioni INPS per il Portale unico ISEE",
      href: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.Portale-unico-ISEE.html",
    },
  },
};

export function practicalGuide(versionId: string | null): PracticalGuide | undefined {
  if (!versionId || !Object.hasOwn(guides, versionId)) return undefined;
  return guides[versionId];
}
