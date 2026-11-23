export const immigrationTopicPath = "/guide/temi/permessi-e-cittadinanza";

export const guideTopics = [
  { id: "immigrazione", title: "Permessi e cittadinanza", description: "Rilascio, rinnovo, ricongiungimento e stato della pratica.", href: immigrationTopicPath },
  { id: "casa", title: "Casa e residenza", description: "Cambio di residenza e certificati anagrafici.", href: "/guide#casa" },
  { id: "utenze", title: "Bollette e utenze", description: "Leggi la bolletta, cambia intestatario o controlla il bonus sociale.", href: "/guide#utenze" },
  { id: "famiglia", title: "ISEE, famiglia e bonus", description: "DSU, ISEE corrente e contributi per le famiglie.", href: "/guide#famiglia" },
] as const;

type TopicId = (typeof guideTopics)[number]["id"];

export const guideNavigation: Readonly<Record<string, { topic: TopicId; audience: string; keywords: string }>> = {
  "permesso-soggiorno-motivi-familiari": { topic: "immigrazione", audience: "Chi è entrato con un visto per ricongiungimento o deve rinnovare il permesso per motivi familiari, codice 13.", keywords: "famiglia familiari kit posta rinnovo rilascio documenti carta soggiorno convivenza" },
  "ricongiungimento-familiare": { topic: "immigrazione", audience: "Chi soggiorna regolarmente in Italia con un titolo idoneo e vuole farsi raggiungere da un familiare che vive all’estero.", keywords: "famiglia familiari nulla osta visto ingresso sportello unico" },
  "controllare-permesso-di-soggiorno": { topic: "immigrazione", audience: "Chi ha già presentato una domanda di rilascio o rinnovo del permesso di soggiorno elettronico.", keywords: "permesso pronto stato pratica ricevuta ritiro controllare verificare assicurata questura" },
  "cittadinanza-italiana-per-residenza": { topic: "immigrazione", audience: "Chi risiede in Italia e vuole chiedere la cittadinanza per residenza ai sensi dell’articolo 9 della legge 91/1992.", keywords: "cittadinanza residenza naturalizzazione documenti requisiti domanda b1 reddito" },
  "cambio-residenza": { topic: "casa", audience: "Chi si trasferisce e vuole aggiornare la residenza anagrafica.", keywords: "trasloco cambio indirizzo anagrafe comune" },
  "certificati-anagrafici": { topic: "casa", audience: "Chi deve scaricare un certificato anagrafico, per esempio di residenza o stato di famiglia.", keywords: "anagrafe stato famiglia certificato residenza anpr" },
  "preparazione-dsu-isee": { topic: "famiglia", audience: "Chi deve presentare la DSU per ottenere l’ISEE.", keywords: "documenti isee caf attestazione redditi" },
  "assegno-unico": { topic: "famiglia", audience: "Chi vuole chiedere o aggiornare l’Assegno unico per i figli.", keywords: "figli inps prestazioni genitori" },
  "bonus-asilo-nido": { topic: "famiglia", audience: "Chi sostiene le spese per l’asilo nido e vuole chiedere il contributo INPS.", keywords: "rette fatture rimborso bambino" },
  "bonus-sociale-luce-gas-acqua": { topic: "utenze", audience: "Chi vuole capire come ricevere lo sconto legato all’ISEE o perché non compare.", keywords: "sconto bollette energia isee" },
  "come-leggere-bolletta-luce-gas": { topic: "utenze", audience: "Chi vuole controllare consumi, costi e condizioni della propria bolletta.", keywords: "prezzo kwh consumi scontrino costo energia" },
  "voltura-o-subentro-luce-gas": { topic: "utenze", audience: "Chi trasloca e deve cambiare intestatario o riattivare luce e gas.", keywords: "cambio intestatario bolletta trasloco riattivare contatore pod pdr" },
  "isee-corrente": { topic: "famiglia", audience: "Chi ha già un ISEE ordinario e ha avuto una variazione di lavoro, reddito o patrimonio.", keywords: "aggiornare rifare isee perdita lavoro reddito patrimonio" },
  "bonus-nuovi-nati-2026": { topic: "famiglia", audience: "Chi vuole chiedere il bonus per una nascita, un’adozione o un affido preadottivo nel 2026.", keywords: "neonati 1000 euro nascita genitori inps" },
};

export const immigrationSections = [
  { id: "rilascio", title: "Devo chiedere o rinnovare un permesso" },
  { id: "famiglia", title: "Voglio far venire un familiare in Italia" },
  { id: "stato", title: "Ho già fatto domanda per il permesso" },
  { id: "cittadinanza", title: "Voglio chiedere la cittadinanza italiana" },
] as const;

type ImmigrationResource = {
  section: (typeof immigrationSections)[number]["id"];
  title: string;
  description: string;
  authority: string;
  href: string;
  keywords: string;
  guideSlug?: string;
};

const immigrationResources: readonly ImmigrationResource[] = [
  {
    section: "rilascio",
    title: "Permesso di soggiorno per famiglia",
    guideSlug: "permesso-soggiorno-motivi-familiari",
    description: "Documenti indicati dal Portale Immigrazione per il permesso per motivi familiari.",
    authority: "Portale Immigrazione",
    href: "https://www.portaleimmigrazione.it/ITA/soggFamiglia.html",
    keywords: "rinnovo primo rilascio familiari carta soggiorno",
  },
  {
    section: "rilascio",
    title: "Permesso di soggiorno per lavoro",
    description: "Istruzioni per il permesso per lavoro subordinato.",
    authority: "Portale Immigrazione",
    href: "https://www.portaleimmigrazione.it/ITA/lavoroSubordinato.html",
    keywords: "rinnovo primo rilascio documenti lavoro dipendente contratto carta soggiorno",
  },
  {
    section: "rilascio",
    title: "Permesso di soggiorno per studio",
    description: "Documenti e istruzioni per primo rilascio e rinnovo del permesso per studio.",
    authority: "Portale Immigrazione",
    href: "https://www.portaleimmigrazione.it/ITA/soggMotiviStudio39.html",
    keywords: "rinnovo primo rilascio documenti studenti università carta soggiorno",
  },
  {
    section: "rilascio",
    title: "Kit postale o Questura",
    description: "Controlla quali richieste si possono presentare a uno Sportello Amico e quali si presentano in Questura.",
    authority: "Portale Immigrazione",
    href: "https://www.portaleimmigrazione.it/ITA/nuovaProcedura.html",
    keywords: "kit invio rinnovo primo rilascio permesso soggiorno poste sportello amico",
  },
  {
    section: "famiglia",
    title: "Ricongiungimento familiare",
    guideSlug: "ricongiungimento-familiare",
    description: "Consulta il percorso dello Sportello unico per chi vuole far venire un familiare in Italia.",
    authority: "Ministero dell’Interno",
    href: "https://www.interno.gov.it/it/temi/immigrazione-e-asilo/modalita-dingresso/sportello-unico-limmigrazione",
    keywords: "famiglia permesso nulla osta visto ingresso",
  },
  {
    section: "stato",
    title: "Controlla se il permesso di soggiorno è pronto",
    guideSlug: "controllare-permesso-di-soggiorno",
    description: "Apri il servizio della Polizia di Stato e tieni a portata il numero della pratica o dell’assicurata.",
    authority: "Polizia di Stato",
    href: "https://questure.poliziadistato.it/stranieri/",
    keywords: "stato pratica ricevuta ritiro controllare verificare permesso pronto assicurata",
  },
  {
    section: "cittadinanza",
    title: "Cittadinanza italiana per residenza",
    guideSlug: "cittadinanza-italiana-per-residenza",
    description: "Apri le istruzioni del Ministero per inviare o consultare una domanda di cittadinanza.",
    authority: "Ministero dell’Interno",
    href: "https://www.interno.gov.it/it/temi/cittadinanza-e-altri-diritti-civili/cittadinanza/cittadinanza-invia-tua-domanda",
    keywords: "documenti requisiti cittadinanza residenza naturalizzazione",
  },
  {
    section: "cittadinanza",
    title: "Cittadinanza italiana per matrimonio",
    description: "Apri le istruzioni del Ministero per la domanda di cittadinanza per matrimonio.",
    authority: "Ministero dell’Interno",
    href: "https://www.interno.gov.it/it/temi/cittadinanza-e-altri-diritti-civili/cittadinanza/cittadinanza-invia-tua-domanda",
    keywords: "documenti requisiti coniuge nozze cittadinanza matrimoniale",
  },
];

type GuideSummary = { slug: string; title: string; description: string };

export function immigrationDirectory(guides: readonly GuideSummary[]) {
  return immigrationResources.map((entry) => {
    const guide = entry.guideSlug ? guides.find(({ slug }) => slug === entry.guideSlug) : undefined;
    return guide
      ? { ...entry, title: guide.title, description: guide.description, href: `/guide/${guide.slug}`, authority: undefined }
      : entry;
  });
}

type DirectoryEntry = {
  href: string;
  title: string;
  description: string;
  keywords: string;
  authority?: string;
};

const stopWords = new Set(["a", "al", "come", "con", "da", "de", "del", "della", "di", "e", "gli", "i", "il", "in", "la", "le", "lo", "o", "per", "quale", "quali", "se", "un", "una"]);

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function searchGuideDirectory(guides: readonly GuideSummary[], query: string) {
  const entries: DirectoryEntry[] = [
    ...guides.map(({ slug, title, description }) => ({
      title, description, href: `/guide/${slug}`, keywords: guideNavigation[slug]?.keywords ?? "",
    })),
    ...immigrationDirectory(guides).filter((entry) => entry.authority),
  ];

  const words = normalize(query).split(" ").filter((word) => word && !stopWords.has(word));
  if (!words.length) return [];

  return entries.map((entry) => {
    const title = normalize(entry.title).split(" ");
    const terms = new Set([...title, ...normalize(`${entry.description} ${entry.keywords}`).split(" ")]);
    const score = words.every((word) => terms.has(word))
      ? words.reduce((sum, word) => sum + (title.includes(word) ? 3 : 1), 0)
      : 0;
    return { entry, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).map(({ entry }) => entry);
}
