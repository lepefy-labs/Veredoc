import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/account", "/analyze", "/dashboard", "/pratiche", "/login", "/register"],
    },
    sitemap: "https://www.veredoc.it/sitemap.xml",
  };
}
