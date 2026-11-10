import type { Workflow } from "./engine";

type Details = {
  title: string;
  description: string;
  audience: string;
  scope: string;
  authority: string;
};

type Copy = {
  details: Details;
  questions: Record<string, { title: string; options?: Record<string, string> }>;
  steps: Record<string, { title: string; description: string }>;
  preparation: Preparation;
};

export type Preparation = {
  items: { title: string; detail: string }[];
  note: string;
};

// Solo i testi mostrati all'utente delle versioni pilota. ID, regole e fonti restano quelli pubblicati.
const pilotCopy: Record<string, Copy> = {
  pv_residenza_1: {
    details: {
      title: "Cambio di residenza",
      description: "Stai cambiando casa? Ti aiutiamo a preparare i dati per comunicare il nuovo indirizzo al Comune.",
      audience: "Per chi cambia casa, da solo o con la famiglia.",
      scope: "In tutta Italia. Alcuni controlli dipendono dal Comune.",
      authority: "Il Comune dove andrai a vivere",
    },
    questions: {
      tipo_trasferimento: {
        title: "Dove ti trasferisci?",
        options: {
          stesso_comune: "Cambio indirizzo nello stesso Comune",
          altro_comune: "Mi trasferisco in un altro Comune",
          rimpatrio_aire: "Torno in Italia e sono iscritto all'AIRE (italiani residenti all'estero)",
          altro: "Un altro caso",
        },
      },
      altri_maggiorenni: { title: "Si trasferiscono con te altre persone di almeno 18 anni?" },
    },
    steps: {
      verifica_percorso: {
        title: "Controlla se puoi usare il servizio online",
        description: "Se il tuo caso non è tra quelli indicati, chiedi al Comune come fare.",
      },
      dati_abitazione: {
        title: "Prepara i dati della nuova casa",
        description: "Tieni pronti il nuovo indirizzo e le informazioni che mostrano che puoi abitare lì.",
      },
      convalida_maggiorenni: {
        title: "Avvisa gli altri adulti che si trasferiscono",
        description: "Ogni persona di almeno 18 anni coinvolta deve accedere al sito ANPR e confermare la richiesta con la propria identità digitale.",
      },
      portale_anpr: {
        title: "Invia la richiesta sul sito ANPR",
        description: "Apri il sito ufficiale e invia la richiesta. Veredoc non la invia per te.",
      },
    },
    preparation: {
      items: [
        { title: "Accesso con SPID, CIE o CNS", detail: "Ti serve per entrare nel sito ANPR. Se si trasferiscono altri adulti, anche loro devono poter confermare la richiesta online." },
        { title: "Indirizzo della nuova casa", detail: "Tieni pronti via, numero civico e gli altri dati dell'abitazione richiesti dal sito." },
        { title: "Dati delle persone che si trasferiscono", detail: "Prepara i dati di chi cambia residenza con te e, se ci sono, di chi vive già nella nuova casa." },
        { title: "Patenti e veicoli, se ci sono", detail: "Il sito ANPR chiede anche informazioni sulle patenti e sui veicoli delle persone che si trasferiscono." },
        { title: "Dati che spiegano perché puoi abitare lì", detail: "Per esempio, i dati del contratto d'affitto registrato o quelli del proprietario." },
        { title: "Eventuali allegati", detail: "Se sono utili per il tuo caso, tieni a portata di mano il contratto d'affitto oppure il consenso del proprietario con una copia del suo documento. La guida ANPR indica che gli allegati non sono sempre obbligatori." },
      ],
      note: "Il Comune può chiedere informazioni diverse in base alla tua situazione. Controlla le richieste mostrate sul sito ANPR prima di inviare.",
    },
  },
  pv_certificati_1: {
    details: {
      title: "Certificati anagrafici",
      description: "Ti serve un certificato anagrafico? Scopri come richiederlo online.",
      audience: "Per chi è registrato all'anagrafe in Italia o all'AIRE (italiani residenti all'estero), se il certificato è disponibile.",
      scope: "In tutta Italia.",
      authority: "Ministero dell'Interno e il tuo Comune",
    },
    questions: {
      destinatario: {
        title: "Per chi ti serve il certificato?",
        options: {
          me: "Per me",
          familiare: "Per un familiare registrato con me all'anagrafe",
          terzo: "Per un'altra persona o come tutore",
        },
      },
      certificato_storico: { title: "Ti serve un certificato che mostri anche i dati del passato?" },
    },
    steps: {
      verifica_ambito: {
        title: "Controlla se puoi richiederlo online",
        description: "Se vivi in una struttura registrata dal Comune come convivenza anagrafica, online puoi chiedere solo il tuo certificato. Per richieste per altri, come tutore o per certificati storici, chiedi al Comune.",
      },
      scelta_certificato: {
        title: "Scegli il certificato che ti serve",
        description: "Sul sito ANPR vedrai i certificati disponibili per te. L'elenco può cambiare in base ai dati presenti e al tuo Comune.",
      },
      portale_certificati: {
        title: "Richiedi il certificato sul sito ANPR",
        description: "Controlla i dati e completa la richiesta sul sito ufficiale. Veredoc non la invia per te.",
      },
    },
    preparation: {
      items: [
        { title: "Accesso con SPID, CIE o CNS", detail: "Ti serve per entrare nel sito ANPR." },
        { title: "Il tipo di certificato che cerchi", detail: "Per esempio, un certificato di residenza o di stato di famiglia. Sul sito vedrai quali puoi richiedere." },
        { title: "I dati della persona a cui serve", detail: "Se è per un familiare, controlla che compaia tra le persone per cui puoi chiedere il certificato online." },
      ],
      note: "Per questa richiesta online non è indicato un documento da caricare in anticipo. Se il tuo caso non compare sul sito ANPR, chiedi al Comune.",
    },
  },
  pv_isee_1: {
    details: {
      title: "Prepara i dati per l'ISEE",
      description: "Prima di richiedere l'ISEE, raccogli i dati della famiglia, dei redditi e dei beni.",
      audience: "Per chi vuole ottenere l'ISEE.",
      scope: "In tutta Italia.",
      authority: "INPS",
    },
    questions: {
      isee_specifico: { title: "Ti serve l'ISEE per un aiuto o un servizio specifico?" },
      precompilata: { title: "Vuoi usare la dichiarazione già compilata in parte dall'INPS?" },
    },
    steps: {
      nucleo: {
        title: "Controlla chi va incluso nella dichiarazione",
        description: "Controlla quali persone della famiglia vanno considerate alla data in cui presenterai la dichiarazione. Se hai dubbi, consulta le indicazioni INPS.",
      },
      redditi: {
        title: "Prepara i dati sui redditi",
        description: "Servono i redditi di due anni prima di quello in cui presenti la dichiarazione.",
      },
      patrimonio: {
        title: "Prepara i dati su conti e beni",
        description: "Servono i dati sui beni posseduti il 31 dicembre di due anni prima di quello in cui presenti la dichiarazione.",
      },
      verifica_isee_specifico: {
        title: "Controlla quale ISEE ti serve",
        description: "Per alcuni aiuti o situazioni familiari serve una dichiarazione più completa o un tipo specifico di ISEE. Controlla le indicazioni sul sito INPS.",
      },
      autorizzazioni: {
        title: "Chiedi il permesso agli altri adulti",
        description: "Per usare la dichiarazione già compilata in parte dall'INPS, ogni adulto incluso deve autorizzare l'uso dei propri dati con la propria identità digitale. In alternativa, puoi inserire i dati richiesti per la verifica.",
      },
      portale_inps: {
        title: "Compila e invia la dichiarazione sul sito INPS",
        description: "Veredoc ti aiuta a preparare i dati. Compila e invia la dichiarazione sul sito INPS.",
      },
    },
    preparation: {
      items: [
        { title: "Dati delle persone da includere nell'ISEE", detail: "Tieni pronti i dati della famiglia alla data in cui presenterai la dichiarazione." },
        { title: "Documenti sui redditi", detail: "Controlla i redditi di due anni prima, per esempio con la dichiarazione dei redditi o la Certificazione Unica, se le hai." },
        { title: "Dati di conti, risparmi e altri beni", detail: "Controlla i dati al 31 dicembre di due anni prima. Per i conti possono servire saldo e giacenza media, cioè la somma media presente durante l'anno." },
        { title: "Dati della casa", detail: "Se vivi in affitto, tieni pronto il contratto e il canone. Se possiedi immobili, controlla i relativi dati." },
        { title: "Accesso con SPID, CIE o CNS", detail: "Ti serve per usare il servizio INPS. Se scegli la dichiarazione in parte già compilata, gli altri adulti possono autorizzare l'uso dei propri dati con il loro accesso." },
      ],
      note: "Il sito INPS può mostrare dati già presenti nei suoi archivi: controllali prima di confermarli. Alcune situazioni richiedono informazioni in più.",
    },
  },
};

export function plainDetails(versionId: string | null | undefined, details: Details): Details {
  const copy = versionId ? pilotCopy[versionId] : undefined;
  return copy ? copy.details : details;
}

export function plainTitle(versionId: string | null | undefined, title: string): string {
  return versionId ? pilotCopy[versionId]?.details.title ?? title : title;
}

export function plainPreparation(versionId: string | null | undefined, workflow: Workflow): Preparation | null {
  const copy = versionId ? pilotCopy[versionId] : undefined;
  if (copy) return copy.preparation;
  const items = workflow.steps.filter((step) => step.kind === "document").map((step) => ({ title: step.title, detail: step.description }));
  return items.length ? { items, note: "Ti mostreremo solo i passaggi utili per il tuo caso." } : null;
}

export function plainWorkflow(versionId: string | null | undefined, workflow: Workflow): Workflow {
  const copy = versionId ? pilotCopy[versionId] : undefined;
  if (!copy) return workflow;
  return {
    questions: workflow.questions.map((question) => {
      const text = copy.questions[question.id];
      return text ? {
        ...question,
        title: text.title,
        options: question.options?.map((option) => ({ ...option, label: text.options?.[option.value] ?? option.label })),
      } : question;
    }),
    steps: workflow.steps.map((step) => {
      const text = copy.steps[step.id];
      return text ? { ...step, title: text.title, description: text.description } : step;
    }),
  };
}
