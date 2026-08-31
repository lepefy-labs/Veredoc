import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    lang: "it",
    name: "Veredoc — Documenti spiegati in chiaro",
    short_name: "Veredoc",
    description: "Analizza bollette e buste paga con Veredoc, direttamente dal telefono.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F8FC",
    theme_color: "#1B4FD8",
    orientation: "portrait-primary",
    categories: ["finance", "productivity", "utilities"],
    shortcuts: [
      {
        name: "Analizza documento",
        short_name: "Analizza",
        description: "Scatta una foto o scegli un documento da analizzare",
        url: "/analyze",
        icons: [{ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "I miei documenti",
        short_name: "Documenti",
        description: "Apri dashboard, profili e storico documenti",
        url: "/dashboard",
        icons: [{ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
