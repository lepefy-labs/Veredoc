import type { MetadataRoute } from "next";
import { praticheEnabled } from "@/lib/pratiche/feature";
import { publicGuides } from "@/lib/pratiche/public-guides";

export const dynamic = "force-dynamic";

const origin = "https://www.veredoc.it";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls = ["/", "/privacy", "/termini"];
  if (praticheEnabled()) {
    const guides = await publicGuides();
    if (guides.length) urls.push("/guide", ...guides.map(({ slug }) => `/guide/${slug}`));
    urls.push("/per-i-caf");
  }
  return urls.map((pathname) => ({ url: new URL(pathname, origin).href }));
}
