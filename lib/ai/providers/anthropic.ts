import Anthropic from '@anthropic-ai/sdk'
import { AIProvider, AnalyzeDocumentParams, AnalyzeDocumentResult } from '../types'

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5'

function buildPrompt(documentType: AnalyzeDocumentParams['documentType']): string {
  if (documentType === 'BUSTA_PAGA') {
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
Ogni "spiegazione" deve essere in italiano semplice per chi non è esperto. Non aggiungere testo fuori dal JSON.`
  }
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
Spiega ogni voce in italiano semplice nel campo "spiegazione". Non aggiungere testo fuori dal JSON.`
}

export class AnthropicProvider implements AIProvider {
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  async analyzeDocument(params: AnalyzeDocumentParams): Promise<AnalyzeDocumentResult> {
    const { fileBase64, mimeType, documentType, textOverride } = params
    const isPdf = mimeType === 'application/pdf'

    type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    const imageContent = {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: mimeType as ImageMediaType,
        data: fileBase64,
      },
    }

    const docContent = {
      type: 'document' as const,
      source: {
        type: 'base64' as const,
        media_type: 'application/pdf' as const,
        data: fileBase64,
      },
    }

    const contentBlocks = textOverride
      ? [{ type: 'text' as const, text: `${buildPrompt(documentType)}\n\nTesto del documento:\n${textOverride}` }]
      : [isPdf ? docContent : imageContent, { type: 'text' as const, text: buildPrompt(documentType) }]

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: contentBlocks,
        },
      ],
    })

    const text = response.content.find((b) => b.type === 'text')?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Nessun JSON trovato nella risposta AI.')
    return { raw: JSON.parse(jsonMatch[0]), provider: 'anthropic' }
  }
}
