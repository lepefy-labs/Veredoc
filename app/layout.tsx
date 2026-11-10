import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PwaRegistration from "@/components/pwa/PwaRegistration";
import { praticheEnabled } from "@/lib/pratiche/feature";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const viewport: Viewport = {
  themeColor: "#1B4FD8",
  viewportFit: "cover",
};

// Dominio canonico: https://www.veredoc.it (stesso valore di default di getAppBaseUrl()).
export const metadata: Metadata = {
  metadataBase: new URL("https://www.veredoc.it"),
  title: "Veredoc | Documenti e pratiche, più chiari",
  description: "Analizza bollette e buste paga, prepara le pratiche con percorsi guidati e tieni traccia dei passaggi. Tutto nel tuo account Veredoc.",
  keywords: ["pratiche guidate", "cambio di residenza", "certificati anagrafici", "preparazione ISEE", "analisi bolletta online", "capire busta paga"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Veredoc",
  },
  openGraph: {
    title: "Veredoc | Documenti e pratiche, più chiari",
    description: "Leggi meglio bollette e buste paga. Prepara le pratiche con guide e fonti ufficiali.",
    url: "https://www.veredoc.it",
    siteName: "Veredoc",
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Veredoc | Documenti e pratiche, più chiari",
    description: "Analizza i documenti e prepara le pratiche passo dopo passo.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://www.veredoc.it",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/pwa/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-page text-ink">
        <Providers>
          <Navbar praticheAvailable={praticheEnabled()} />
          {children}
        </Providers>
        <Footer />
        <PwaRegistration />
        <Analytics />
      </body>
    </html>
  );
}
