import { cache } from "react";
import { catalog, praticheEnabled, praticheSchemaReady } from "./service";
import { practicalGuide } from "./guide-content";

const PUBLIC_EDITIONS = [
  { slug: "cambio-residenza", versionId: "pv_residenza_1" },
  { slug: "certificati-anagrafici", versionId: "pv_certificati_1" },
  { slug: "preparazione-dsu-isee", versionId: "pv_isee_1" },
  { slug: "assegno-unico", versionId: "pv_assegno_unico_1" },
  { slug: "bonus-asilo-nido", versionId: "pv_bonus_nido_1" },
];

export const publicGuides = cache(async () => {
  if (!praticheEnabled() || !await praticheSchemaReady()) return [];

  const entries = await catalog(PUBLIC_EDITIONS.map(({ slug }) => slug));
  return PUBLIC_EDITIONS.flatMap(({ slug, versionId }) => {
    const item = entries.find((entry) => entry.slug === slug);
    const guide = practicalGuide(versionId);
    if (!item?.available || item.versionId !== versionId || !guide) return [];
    return [{ slug, versionId, title: item.title, description: item.description, guide }];
  });
});

export async function publicGuide(slug: string) {
  if (!PUBLIC_EDITIONS.some((edition) => edition.slug === slug)) return undefined;
  return (await publicGuides()).find((guide) => guide.slug === slug);
}
