import Anthropic from "@anthropic-ai/sdk";
import { BollettaData } from "@/types/bolletta";
import { BustaPagaData } from "@/types/bustapaga";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-haiku-4-5";

function buildBollettaPrompt(): string {
  return `Sei un esperto di bollette italiane. Analizza questo documento e restituisci SOLO un JSON con questa struttura:
{
  "tipo": "luce" | "gas" | "internet" | "telefonia",
  "fornitore": string,
  "periodo": string,
  "importo_totale": number,
  "consumi": { "valore": number, "unita": string } | null,
  "voci_dettaglio": [{ "nome": string, "importo": number, "spiegazione": string }],
  "scadenza": string | null
}
Spiega ogni voce in italiano semplice nel campo "spiegazione". Non aggiungere testo fuori dal JSON.`;
}

function buildBustaPagaPrompt(): string {
  return `Sei un esperto di diritto del lavoro italiano. Analizza questa busta paga e restituisci SOLO un JSON:
{
  "datore_lavoro": string,
  "competenza": string,
  "stipendio_lordo": number,
  "stipendio_netto": number,
  "voci": [{ "nome": string, "importo": number, "tipo": "competenza"|"trattenuta", "spiegazione": string }],
  "contributi_inps": number,
  "irpef": number,
  "tfr_maturato": number | null
}
Ogni "spiegazione" deve essere in italiano semplice per chi non è esperto. Non aggiungere testo fuori dal JSON.`;
}

async function analyzeDocument<T>(
  fileBuffer: Buffer,
  mimeType: string,
  prompt: string
): Promise<T> {
  const base64 = fileBuffer.toString("base64");
  const isPdf = mimeType === "application/pdf";

  type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  const imageContent = {
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: mimeType as ImageMediaType,
      data: base64,
    },
  };

  const docContent = {
    type: "document" as const,
    source: {
      type: "base64" as const,
      media_type: "application/pdf" as const,
      data: base64,
    },
  };

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          isPdf ? docContent : imageContent,
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Nessun JSON trovato nella risposta AI.");
  return JSON.parse(jsonMatch[0]) as T;
}

export async function analyzeBolletta(
  fileBuffer: Buffer,
  mimeType: string
): Promise<BollettaData> {
  return analyzeDocument<BollettaData>(fileBuffer, mimeType, buildBollettaPrompt());
}

export async function analyzeBustaPaga(
  fileBuffer: Buffer,
  mimeType: string
): Promise<BustaPagaData> {
  return analyzeDocument<BustaPagaData>(fileBuffer, mimeType, buildBustaPagaPrompt());
}
