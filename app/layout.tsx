import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Veredoc — Analisi AI di bollette e buste paga",
  description: "Carica la tua bolletta luce, gas o internet oppure la busta paga: Veredoc la analizza con l'AI, spiega ogni voce in italiano e ti dice se stai pagando troppo.",
  keywords: ["analisi bolletta online", "capire busta paga", "controllare bolletta luce AI", "spiegazione voci busta paga", "confronto offerte energia"],
  openGraph: {
    title: "Veredoc — I tuoi documenti, spiegati in chiaro",
    description: "AI che legge bollette e buste paga al posto tuo. Ogni voce spiegata, ogni anomalia segnalata.",
    url: "https://veredoc.it",
    siteName: "Veredoc",
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Veredoc — Analisi AI di bollette e buste paga",
    description: "Carica il documento. L'AI spiega tutto in italiano semplice.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://veredoc.it",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F7F9FC] text-[#0F172A]">
        <Providers>
          <Navbar />
          {children}
        </Providers>
        <Footer />
      </body>
    </html>
  );
}
