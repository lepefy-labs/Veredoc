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
  { slug: "cambio-residenza", versionId: "pv_residenza_1" },
  { slug: "certificati-anagrafici", versionId: "pv_certificati_1" },
  { slug: "preparazione-dsu-isee", versionId: "pv_isee_1" },
  { slug: "assegno-unico", versionId: "pv_assegno_unico_1" },
  { slug: "bonus-asilo-nido", versionId: "pv_bonus_nido_1" },
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
];

export const publicGuides = cache(async () => {
  if (!praticheEnabled() || !await praticheSchemaReady()) return [];

  const entries = await catalog(PUBLIC_EDITIONS.map(({ slug }) => slug));
  return PUBLIC_EDITIONS.flatMap(({ slug, versionId, editorial }) => {
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
});

export async function publicGuide(slug: string) {
  if (!PUBLIC_EDITIONS.some((edition) => edition.slug === slug)) return undefined;
  return (await publicGuides()).find((guide) => guide.slug === slug);
}
