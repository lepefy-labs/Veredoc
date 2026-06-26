import Anthropic from '@anthropic-ai/sdk'
import { AIProvider, AnalyzeDocumentParams, AnalyzeDocumentResult } from '../types'

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5'

function buildPrompt(documentType: AnalyzeDocumentParams['documentType']): string {
  if (documentType === 'BUSTA_PAGA') {
    return `Sei un esperto di diritto del lavoro italiano. Analizza questa busta paga e restituisci SOLO un JSON:
{
  "tipo_rilevato": "busta_paga" | "sconosciuto",
  "datore_lavoro": string,
  "competenza": string,
  "stipendio_lordo": number,
  "stipendio_netto": number,
  "voci": [{ "nome": string, "importo": number, "tipo": "competenza"|"trattenuta", "spiegazione": string }],
  "contributi_inps": number,
  "irpef": number,
  "tfr_maturato": number | null
}
Aggiungi sempre come primo campo "tipo_rilevato": il tipo reale del documento che stai analizzando. Valori possibili: "busta_paga" | "sconosciuto". Determinalo dal contenuto del documento, ignorando il tipo passato come hint.
Ogni "spiegazione" deve essere in italiano semplice per chi non è esperto. Non aggiungere testo fuori dal JSON.`
  }
  return `Sei un esperto di bollette italiane. Analizza questo documento e restituisci SOLO un JSON con questa struttura esatta:
{
  "tipo_rilevato": "luce" | "gas" | "internet" | "sconosciuto",
  "tipo": "luce" | "gas" | "internet" | "telefonia",
  "fornitore": string,
  "offerta_nome": string | null,
  "periodo": string,
  "periodo_giorni": number | null,
  "scadenza": string | null,
  "potenza_impegnata_kw": number | null,
  "consumi": { "valore": number, "unita": string, "mensile_stimato": number | null } | null,
  "materia_energia": {
    "quota_variabile_eur": number | null,
    "quota_variabile_prezzo_kwh": number | null,
    "quota_fissa_eur": number | null,
    "quota_fissa_mensile_eur": number | null,
    "totale_eur": number | null
  },
  "rete_e_oneri": {
    "trasporto_rete_eur": number | null,
    "oneri_sistema_eur": number | null,
    "quota_potenza_eur": number | null,
    "totale_eur": number | null
  },
  "imposte": {
    "accise_eur": number | null,
    "iva_eur": number | null,
    "totale_eur": number | null
  },
  "altro": {
    "canone_rai_eur": number | null,
    "altri_eur": number | null
  },
  "importo_totale": number,
  "voci_dettaglio": [{ "nome": string, "importo": number, "categoria": "materia_energia"|"rete_oneri"|"imposte"|"altro", "spiegazione": string }]
}

STRUTTURA OBBLIGATORIA — rispetta sempre questi campi anche se il documento non li mostra esplicitamente:

materia_energia: La componente NEGOZIABILE della bolletta — varia cambiando fornitore.
  - quota_variabile_eur: costo proporzionale ai kWh consumati (es. "spesa per la vendita di energia elettrica" nella quota consumi)
  - quota_variabile_prezzo_kwh: prezzo unitario in €/kWh applicato (es. 0.144065)
  - quota_fissa_eur: costo fisso indipendente dai consumi per il periodo di fatturazione (es. quota fissa di vendita)
  - quota_fissa_mensile_eur: quota_fissa_eur normalizzata a 30 giorni = quota_fissa_eur / periodo_giorni * 30 (arrotondato a 2 decimali)
  - totale_eur: quota_variabile_eur + quota_fissa_eur

rete_e_oneri: Costi regolati da ARERA — identici per tutti i fornitori. NON cambiano con il cambio fornitore.
  - trasporto_rete_eur: costo trasporto e distribuzione energia
  - oneri_sistema_eur: ASOS + ARIM e oneri generali di sistema
  - quota_potenza_eur: costo legato alla potenza impegnata
  - totale_eur: somma di tutti i precedenti

imposte: IVA e accise — non negoziabili.

altro: Voci NON legate all'energia (canone RAI, recupero fatture, ecc.).

consumi.mensile_stimato: consumi.valore / periodo_giorni * 30 arrotondato all'intero.

Se un campo non è determinabile dal documento, impostare null (non omettere mai il campo).
Per bollette gas: quota_variabile_prezzo_kwh rappresenta il prezzo in €/Smc, quota_variabile_eur il costo dei consumi.
Per bollette internet/telefonia: materia_energia.totale_eur è l'importo totale del piano, rete_e_oneri e imposte possono essere null.

Aggiungi sempre come primo campo "tipo_rilevato": il tipo reale del documento che stai analizzando. Valori possibili: "luce" | "gas" | "internet" | "sconosciuto". Determinalo dal contenuto del documento, ignorando il tipo passato come hint.
Spiega ogni voce in voci_dettaglio in italiano semplice. Non aggiungere testo fuori dal JSON.`
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
