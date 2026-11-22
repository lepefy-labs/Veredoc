export type PracticalGuide = {
  destination: string;
  destinationHeading?: string;
  stepsHeading?: string;
  link: { label: string; href: string };
  alternative: string;
  documents: { title: string; detail: string }[];
  steps: { title: string; detail: string }[];
  source: { label: string; href: string };
  example?: {
    title: string;
    detail: string;
    rows: { label: string; calculation: string; amount: string }[];
  };
};

// Riepiloghi per le versioni pilota pubblicate. Una nuova versione richiede una propria revisione dei testi.
const guides: Readonly<Record<string, PracticalGuide>> = {
  pv_bonus_sociale_1: {
    destination: "Presenta la DSU per ottenere un ISEE valido. Se la famiglia e la fornitura soddisfano i requisiti, il bonus per disagio economico viene riconosciuto automaticamente.",
    destinationHeading: "Come ottenere il bonus",
    stepsHeading: "Cosa controllare e quando",
    link: {
      label: "Controlla requisiti e soglie su ARERA",
      href: "https://www.arera.it/consumatori/bonus-sociale/bonus-sociale-per-disagio-economico/quali-sono-i-requisiti"
    },
    alternative: "Puoi presentare la DSU dal Portale unico ISEE o farti aiutare da un CAF. Per alcune forniture condominiali il percorso è diverso.",
    documents: [
      {
        title: "ISEE valido",
        detail: "Verifica la soglia ARERA dell’anno della DSU e quella applicabile in base ai figli a carico."
      },
      {
        title: "Una bolletta recente",
        detail: "Se l’utenza è individuale, controlla intestatario e codice della fornitura. L’intestatario deve appartenere al nucleo ISEE e la fornitura deve rispettare i requisiti ARERA."
      },
      {
        title: "Dati dell’utenza condominiale, se applicabile",
        detail: "Per il gas centralizzato, se ricevi la lettera per comunicare il PDR, chiedi il codice all’amministratore e segui le istruzioni della lettera."
      }
    ],
    steps: [
      {
        title: "Presenta o rinnova la DSU",
        detail: "Controlla che l’attestazione ISEE sia disponibile e confrontala con le soglie pubblicate per l’anno."
      },
      {
        title: "Verifica come arriva lo sconto",
        detail: "Per le utenze individuali il bonus viene normalmente applicato in bolletta. Consulta le modalità previste da ARERA per gas e acqua condominiali."
      },
      {
        title: "Se il bonus manca, controlla in quest’ordine",
        detail: "Verifica la data dell’attestazione, i tempi previsti per la fornitura, la corrispondenza dell’intestatario con il nucleo e l’eventuale comunicazione per il gas condominiale. Se i tempi risultano superati, usa i contatti di assistenza indicati da ARERA."
      }
    ],
    source: {
      label: "ARERA — Come e quando si ricevono i bonus",
      href: "https://www.arera.it/consumatori/bonus-sociale/bonus-sociale-per-disagio-economico/come-e-quando-si-ricevono"
    }
  },
  pv_lettura_bolletta_1: {
    destination: "Apri il PDF del fornitore. Nel formato introdotto da ARERA, il frontespizio mostra l’importo da pagare. Nelle pagine successive cerca lo scontrino dell’energia e il box dell’offerta.",
    destinationHeading: "Dove trovare le informazioni",
    stepsHeading: "Come leggere la bolletta in tre passaggi",
    link: {
      label: "Consulta il formato della bolletta su ARERA",
      href: "https://www.arera.it/nuova-bolletta"
    },
    alternative: "Per verificare come si compone una singola voce, consulta gli elementi di dettaglio indicati dal fornitore.",
    documents: [
      {
        title: "Bolletta completa",
        detail: "Tieni disponibile il PDF con tutte le pagine, il periodo fatturato e le eventuali informazioni sui ricalcoli."
      },
      {
        title: "Bolletta precedente, se vuoi confrontare i consumi",
        detail: "Usa un periodo confrontabile e controlla se la bolletta riporta letture effettive, autoletture o consumi stimati."
      }
    ],
    steps: [
      {
        title: "Frontespizio — verifica periodo, totale e scadenza",
        detail: "Controlla i riferimenti della fornitura e i dati di pagamento prima di confrontare due bollette."
      },
      {
        title: "Scontrino dell’energia — separa consumi e quote fisse",
        detail: "Confronta quantità e unità di misura (kWh per la luce, Smc per il gas). Per la luce controlla anche la quota potenza. Considera le altre voci, le imposte e l’IVA quando ricostruisci il totale."
      },
      {
        title: "Box dell’offerta — verifica le condizioni contrattuali",
        detail: "Leggi il nome dell’offerta, il tipo di prezzo e le informazioni sulla durata o sulla scadenza delle condizioni economiche. Usa gli elementi di dettaglio se vuoi approfondire un importo."
      }
    ],
    source: {
      label: "ARERA — La nuova bolletta",
      href: "https://www.arera.it/nuova-bolletta"
    },
    example: {
      title: "Esempio di lettura dello scontrino luce",
      detail: "Importi illustrativi per un mese. Per ricostruire il totale della tua bolletta devi considerare anche gli eventuali altri importi, le imposte e l’IVA.",
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
    destination: "Se la fornitura è attiva, chiedi una voltura al venditore secondo il percorso previsto per quella fornitura. Se il precedente contratto è cessato e la fornitura è disattivata, chiedi un subentro al venditore con cui vuoi stipulare il contratto.",
    destinationHeading: "A chi chiedere voltura o subentro",
    stepsHeading: "Come scegliere la pratica e inviare la richiesta",
    link: {
      label: "Consulta le pratiche per la luce su ARERA",
      href: "https://www.arera.it/single-digital-gateway-elettricita"
    },
    alternative: "Per il gas trovi il percorso dedicato nella fonte qui sotto. Se l’immobile non è collegato alla rete o il contatore non è mai stato attivato, verifica se serve un allacciamento o una prima attivazione.",
    documents: [
      {
        title: "POD per la luce o PDR per il gas",
        detail: "Cerca il codice su una bolletta della fornitura precedente. Se non ce l’hai, chiedi al proprietario o al venditore quali dati usare per identificare la fornitura."
      },
      {
        title: "Dati del nuovo intestatario e indirizzo",
        detail: "Prepara documento di identità, codice fiscale e indirizzo esatto. Chiedi al venditore quali informazioni richiede sul titolo di occupazione dell’immobile."
      },
      {
        title: "Dati del contatore e del pagamento, se richiesti",
        detail: "Tieni disponibili matricola e lettura del contatore. Prepara l’IBAN se scegli la domiciliazione."
      }
    ],
    steps: [
      {
        title: "La fornitura è ancora attiva?",
        detail: "Sì: chiedi la voltura per cambiare intestatario. No, perché il precedente contratto è cessato: chiedi il subentro per riattivarla. Verifica lo stato separatamente per luce e gas."
      },
      {
        title: "Invia la richiesta al venditore",
        detail: "Usa il canale indicato dal venditore, seleziona la pratica corretta e comunica POD o PDR con i dati richiesti. Fatti indicare i costi e i tempi per il tuo caso."
      },
      {
        title: "Conserva conferma e controlla l’esito",
        detail: "Tieni la ricevuta della richiesta. Verifica l’intestazione sulla prima bolletta e, per il subentro, attendi le indicazioni sulla riattivazione."
      }
    ],
    source: {
      label: "ARERA — Voltura e subentro per il gas",
      href: "https://www.arera.it/single-digital-gateway-gas"
    }
  },
  pv_isee_corrente_1: {
    destination: "Apri il Portale unico ISEE di INPS e accedi per compilare la DSU per l’ISEE corrente dopo aver verificato i requisiti del tuo caso.",
    link: {
      label: "Apri il Portale unico ISEE",
      href: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.Portale-unico-ISEE.html"
    },
    alternative: "Puoi rivolgerti a un CAF con l’ISEE ordinario e la documentazione della variazione.",
    documents: [
      {
        title: "ISEE ordinario valido",
        detail: "Recupera l’attestazione e il protocollo della DSU ordinaria."
      },
      {
        title: "Documenti su lavoro, redditi o trattamenti",
        detail: "Se la variazione è lavorativa o reddituale, prepara le prove pertinenti, ad esempio la comunicazione di cessazione e i documenti sui redditi o trattamenti del periodo richiesto da INPS."
      },
      {
        title: "Dati patrimoniali aggiornati, se pertinenti",
        detail: "Se chiedi l’aggiornamento per variazione patrimoniale, raccogli i dati del patrimonio mobiliare e immobiliare del nucleo relativi all’anno precedente."
      }
    ],
    steps: [
      {
        title: "Individua quale variazione vuoi dichiarare",
        detail: "Verifica i casi previsti per perdita o variazione del lavoro o dei trattamenti, una variazione dell’indicatore reddituale superiore al 25% o dell’indicatore patrimoniale superiore al 20%. Le soglie si riferiscono agli indicatori del nucleo rispetto all’ISEE ordinario."
      },
      {
        title: "Controlla periodo da documentare e data di presentazione",
        detail: "Per i redditi il periodo dipende dal caso. Per la componente patrimoniale si può presentare la richiesta dal 1° aprile e si considerano i dati dell’anno precedente."
      },
      {
        title: "Presenta la DSU e controlla la validità della nuova attestazione",
        detail: "Scarica l’attestazione da INPS. Verifica la durata applicabile e se un successivo cambiamento di occupazione o di trattamenti richiede un aggiornamento."
      }
    ],
    source: {
      label: "INPS — Tipologie di ISEE e requisiti dell’ISEE corrente",
      href: "https://www.inps.it/it/it/dettaglio-approfondimento.schede-informative.49936.tipologie-di-isee.html"
    }
  },
  pv_bonus_nuovi_nati_2026_1: {
    destination: "Apri la scheda INPS del Bonus nuovi nati e seleziona «Utilizza il servizio». Per gli eventi del 2026 il contributo è di 1.000 euro una tantum, se sussistono i requisiti.",
    link: {
      label: "Apri il servizio Bonus nuovi nati su INPS",
      href: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-nuovi-nati.html"
    },
    alternative: "Puoi usare anche i canali di assistenza indicati dall’INPS, incluso il patronato.",
    documents: [
      {
        title: "Accesso a MyINPS",
        detail: "Prepara SPID, CIE o CNS per presentare la domanda online."
      },
      {
        title: "Dati del minore",
        detail: "Tieni a portata di mano codice fiscale e data di nascita o dell’evento riconosciuto dall’INPS. Per adozione o affido preadottivo verifica i dati richiesti dal servizio."
      },
      {
        title: "ISEE applicabile al minore",
        detail: "Per il 2026 verifica l’ISEE per specifiche prestazioni familiari e per l’inclusione applicabile al minore. La soglia è di 40.000 euro, al netto degli importi dell’Assegno unico secondo le regole INPS."
      },
      {
        title: "Modalità di pagamento",
        detail: "Prepara i dati necessari per la modalità di pagamento che scegli sul portale."
      }
    ],
    steps: [
      {
        title: "Controlla chi può presentare la domanda",
        detail: "Verifica cittadinanza o titolo di soggiorno, residenza e ISEE sulla scheda ufficiale. Se i genitori non convivono, la richiesta è presentata dal genitore che risiede con il minore."
      },
      {
        title: "Invia la domanda entro 120 giorni dall’evento",
        detail: "Conta 120 giorni dalla nascita o dall’ingresso in famiglia del minore. Per gli eventi del 2026 precedenti all’apertura del servizio INPS il termine transitorio era il 12 agosto 2026."
      },
      {
        title: "Conserva la ricevuta e segui lo stato",
        detail: "Torna nel servizio INPS per verificare l’esito della domanda e leggere eventuali comunicazioni."
      }
    ],
    source: {
      label: "INPS — Requisiti e termini del Bonus nuovi nati",
      href: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-nuovi-nati.html"
    }
  },
  pv_assegno_unico_1: {
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
        detail: "Per il percorso ordinario, se la domanda è ancora valida, controlla lo stato e aggiorna i dati quando cambiano, per esempio dopo una nascita."
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
        detail: "Se hai già una domanda valida, verifica nel servizio come aggiornare le mensilità per l’anno in corso. Se serve una nuova domanda, seleziona il contributo per la frequenza del nido."
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
    destination: "Accedi ad ANPR con SPID, CIE o CNS e apri il servizio Cambio di residenza. La dichiarazione viene ricevuta dal Comune della nuova abitazione.",
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
      href: "https://www.interno.gov.it/sites/default/files/2021-11/guida_richiesta_certificati_online.pdf",
    },
  },
  pv_isee_1: {
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
      { title: "Verifica quale ISEE ti serve", detail: "Controlla i requisiti della prestazione. Per alcune situazioni o prestazioni può servire una DSU integrale o un ISEE specifico." },
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
