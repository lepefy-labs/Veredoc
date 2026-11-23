import type { MetadataRoute } from "next";
import { praticheEnabled } from "@/lib/pratiche/feature";
import { publicGuides } from "@/lib/pratiche/public-guides";

export const dynamic = "force-dynamic";

const origin = "https://www.veredoc.it";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = ["/", "/privacy", "/termini"].map((pathname) => ({
    url: new URL(pathname, origin).href,
  }));

  if (praticheEnabled()) {
    const guides = await publicGuides();
    if (guides.length) entries.push({ url: new URL("/guide", origin).href });
    for (const { slug, lastModified } of guides) {
      entries.push({
        url: new URL(`/guide/${slug}`, origin).href,
        ...(lastModified ? { lastModified } : {}),
      });
    }
    entries.push({ url: new URL("/per-i-caf", origin).href });
  }

  return entries;
}
