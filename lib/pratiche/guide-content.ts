export type PracticalGuide = {
  destination: string;
  link: { label: string; href: string };
  alternative: string;
  documents: { title: string; detail: string }[];
  steps: { title: string; detail: string }[];
  source: { label: string; href: string };
};

// Riepiloghi per le versioni pilota pubblicate. Una nuova versione richiede una propria revisione dei testi.
const guides: Readonly<Record<string, PracticalGuide>> = {
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
