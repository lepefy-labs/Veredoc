import type { MetadataRoute } from "next";
import { praticheEnabled } from "@/lib/pratiche/feature";
import { immigrationTopicPath } from "@/lib/pratiche/guide-navigation";
import { publicGuides } from "@/lib/pratiche/public-guides";

export const dynamic = "force-dynamic";

const origin = "https://www.veredoc.it";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = ["/", "/privacy", "/termini"].map((pathname) => ({
    url: new URL(pathname, origin).href,
  }));

  if (praticheEnabled()) {
    const guides = await publicGuides();
    for (const pathname of ["/guide", immigrationTopicPath]) {
      entries.push({ url: new URL(pathname, origin).href });
    }
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
