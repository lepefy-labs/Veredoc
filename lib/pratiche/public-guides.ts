import { cache } from "react";
import { catalog, praticheEnabled, praticheSchemaReady } from "./service";
import { practicalGuide } from "./guide-content";

type EditorialMetadata = {
  description: string;
  reviewedOn: string;
  lastModified: string;
};

type PublicEdition = {
  slug: string;
  versionId: string;
  editorial?: EditorialMetadata;
};

const PUBLIC_EDITIONS: readonly PublicEdition[] = [
  {
    slug: "cambio-residenza",
    versionId: "pv_residenza_1",
    editorial: {
      description: "Scopri come dichiarare la nuova residenza su ANPR, quali documenti servono e come seguire la pratica con il Comune.",
      reviewedOn: "2026-11-23",
      lastModified: "2026-11-23",
    },
  },
  {
    slug: "certificati-anagrafici",
    versionId: "pv_certificati_1",
    editorial: {
      description: "Scarica i certificati anagrafici per te o per un familiare su ANPR. Scopri come accedere, scegliere il certificato e ottenere il PDF.",
      reviewedOn: "2026-11-23",
      lastModified: "2026-11-23",
    },
  },
  {
    slug: "preparazione-dsu-isee",
    versionId: "pv_isee_1",
    editorial: {
      description: "Prepara la DSU per l’ISEE con la checklist dei dati del nucleo, dei redditi e del patrimonio. Scopri dove presentarla e come seguire l’esito.",
      reviewedOn: "2026-11-23",
      lastModified: "2026-11-23",
    },
  },
  {
    slug: "assegno-unico",
    versionId: "pv_assegno_unico_1",
    editorial: {
      description: "Scopri quando presentare o aggiornare la domanda, cosa preparare e come controllare l’esito su INPS.",
      reviewedOn: "2026-11-23",
      lastModified: "2026-11-23",
    },
  },
  {
    slug: "bonus-asilo-nido",
    versionId: "pv_bonus_nido_1",
    editorial: {
      description: "Prepara la domanda INPS e organizza fatture, ricevute e prove di pagamento per le mensilità del nido.",
      reviewedOn: "2026-11-23",
      lastModified: "2026-11-23",
    },
  },
  {
    slug: "bonus-sociale-luce-gas-acqua",
    versionId: "pv_bonus_sociale_1",
    editorial: {
      description: "Come ottenere il bonus sociale per luce, gas e acqua con l’ISEE, dove arriva lo sconto e cosa controllare se non compare in bolletta.",
      reviewedOn: "2026-11-23",
      lastModified: "2026-11-23",
    },
  },
  {
    slug: "come-leggere-bolletta-luce-gas",
    versionId: "pv_lettura_bolletta_1",
    editorial: {
      description: "Trova consumi, quote fisse e prezzo dell’offerta nella bolletta di luce o gas. L’esempio mostra come leggere lo scontrino dell’energia.",
      reviewedOn: "2026-11-23",
      lastModified: "2026-11-23",
    },
  },
  {
    slug: "voltura-o-subentro-luce-gas",
    versionId: "pv_voltura_subentro_1",
    editorial: {
      description: "Se la fornitura è attiva serve la voltura. Se è stata disattivata serve il subentro. Trova POD e PDR e prepara la richiesta al venditore.",
      reviewedOn: "2026-11-23",
      lastModified: "2026-11-23",
    },
  },
  {
    slug: "isee-corrente",
    versionId: "pv_isee_corrente_1",
    editorial: {
      description: "Quando richiedere l’ISEE corrente se cambiano lavoro, reddito o patrimonio. Quali documenti servono e come inviare la DSU a INPS.",
      reviewedOn: "2026-11-23",
      lastModified: "2026-11-23",
    },
  },
  {
    slug: "bonus-nuovi-nati-2026",
    versionId: "pv_bonus_nuovi_nati_2026_1",
    editorial: {
      description: "Bonus da 1.000 euro. Requisiti ISEE, documenti e domanda INPS entro 120 giorni dalla nascita o dall’ingresso del minore in famiglia.",
      reviewedOn: "2026-11-23",
      lastModified: "2026-11-23",
    },
  },
  {
    slug: "permesso-soggiorno-motivi-familiari",
    versionId: "pv_permesso_famiglia_1",
    editorial: {
      description: "Documenti e passaggi per il primo rilascio dopo il ricongiungimento o per il rinnovo del permesso di soggiorno per famiglia.",
      reviewedOn: "2026-11-23",
      lastModified: "2026-11-23",
    },
  },
  {
    slug: "ricongiungimento-familiare",
    versionId: "pv_ricongiungimento_1",
    editorial: {
      description: "Come chiedere il nulla osta, preparare i documenti per il visto e avviare il primo permesso dopo l’ingresso in Italia.",
      reviewedOn: "2026-11-23",
      lastModified: "2026-11-23",
    },
  },
  {
    slug: "controllare-permesso-di-soggiorno",
    versionId: "pv_controllo_permesso_1",
    editorial: {
      description: "Controlla se il permesso è in lavorazione o pronto per il ritiro. Cerca il numero di pratica o di assicurata sulla ricevuta.",
      reviewedOn: "2026-11-23",
      lastModified: "2026-11-23",
    },
  },
  {
    slug: "cittadinanza-italiana-per-residenza",
    versionId: "pv_cittadinanza_residenza_1",
    editorial: {
      description: "Verifica gli anni di residenza richiesti, prepara i documenti, invia la domanda online e controlla le comunicazioni del Ministero.",
      reviewedOn: "2026-11-23",
      lastModified: "2026-11-23",
    },
  },
];

export const publicGuides = cache(async () => {
  if (!praticheEnabled() || !await praticheSchemaReady()) return [];

  const entries = await catalog(PUBLIC_EDITIONS.map(({ slug }) => slug));
  const legacy = PUBLIC_EDITIONS.flatMap(({ slug, versionId, editorial }) => {
    const item = entries.find((entry) => entry.slug === slug);
    const guide = practicalGuide(versionId);
    if (!item?.available || item.versionId !== versionId || !guide) return [];
    return [{
      slug, versionId, title: item.title,
      description: editorial?.description ?? item.description,
      reviewedOn: editorial?.reviewedOn,
      lastModified: editorial?.lastModified,
      guide,
    }];
  });
  const legacySlugs = new Set(legacy.map(({ slug }) => slug));
  const generated = entries.flatMap((item) => {
    if (!item.publicGuide || !item.versionId || !item.publishedAt || legacySlugs.has(item.slug)) return [];
    const reviewedOn = item.sources.flatMap(({ verifiedAt }) => verifiedAt ? [verifiedAt.toISOString().slice(0, 10)] : []).sort()[0];
    return [{
      slug: item.slug, versionId: item.versionId, title: item.title, description: item.description,
      reviewedOn, lastModified: item.publishedAt.toISOString().slice(0, 10), guide: item.publicGuide,
    }];
  });
  return [...legacy, ...generated];
});

export async function publicGuide(slug: string) {
  return (await publicGuides()).find((guide) => guide.slug === slug);
}
