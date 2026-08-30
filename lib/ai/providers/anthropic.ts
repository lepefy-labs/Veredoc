import Anthropic from '@anthropic-ai/sdk'
import { AIProvider, AnalyzeDocumentParams, AnalyzeDocumentResult } from '../types'

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5'

function buildPrompt(): string {
  return `Sei un analista documentale italiano. Devi prima riconoscere il documento e poi estrarre i dati corretti in una singola risposta JSON.

TIPI SUPPORTATI:
- bolletta luce -> tipo_rilevato "luce"
- bolletta gas -> tipo_rilevato "gas"
- bolletta internet/telefonia -> tipo_rilevato "internet"
- busta paga/cedolino -> tipo_rilevato "busta_paga"
- altro documento -> tipo_rilevato "sconosciuto"

NON usare il nome del file o un hint esterno per decidere il tipo: riconoscilo dal contenuto reale.
Restituisci SOLO JSON, senza testo prima o dopo.

SE È UNA BOLLETTA restituisci:
{
  "tipo_rilevato": "luce" | "gas" | "internet",
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
  } | null,
  "imposte": {
    "accise_eur": number | null,
    "iva_eur": number | null,
    "totale_eur": number | null
  } | null,
  "altro": {
    "canone_rai_eur": number | null,
    "altri_eur": number | null
  } | null,
  "importo_totale": number,
  "voci_dettaglio": [{ "nome": string, "importo": number, "categoria": "materia_energia"|"rete_oneri"|"imposte"|"altro", "spiegazione": string }]
}

Regole bolletta:
- materia_energia è la parte negoziabile col fornitore.
- rete_e_oneri e imposte sono componenti regolate/non negoziabili.
- quota_fissa_mensile_eur = quota_fissa_eur / periodo_giorni * 30 quando calcolabile.
- consumi.mensile_stimato = consumi.valore / periodo_giorni * 30 quando calcolabile.
- per gas, quota_variabile_prezzo_kwh rappresenta €/Smc.
- per internet/telefonia, materia_energia.totale_eur rappresenta il costo del piano; rete_e_oneri e imposte possono essere null.
- se un dato non è leggibile, usa null. Non inventare valori.

SE È UNA BUSTA PAGA restituisci:
{
  "tipo_rilevato": "busta_paga",
  "datore_lavoro": string,
  "competenza": string,
  "stipendio_lordo": number,
  "stipendio_netto": number,
  "competenze_totali": number | null,
  "trattenute_totali": number | null,
  "imponibile_previdenziale": number | null,
  "imponibile_fiscale": number | null,
  "contributi_inps": number,
  "irpef": number,
  "irpef_lorda": number | null,
  "detrazioni": number | null,
  "addizionali": number | null,
  "tfr_maturato": number | null,
  "tfr_progressivo": number | null,
  "saldi_assenze": [{
    "tipo": "ferie"|"permessi"|"rol"|"ex_festivita"|"altro",
    "maturato": number | null,
    "goduto": number | null,
    "residuo": number | null,
    "unita": string | null
  }],
  "eventi_periodo": [{
    "tipo": "straordinario"|"premio"|"assenza"|"malattia"|"ferie"|"permesso"|"altro",
    "descrizione": string,
    "quantita": number | null,
    "unita": string | null,
    "importo": number | null
  }],
  "voci": [{ "nome": string, "importo": number, "tipo": "competenza"|"trattenuta", "spiegazione": string }]
}

Regole busta paga:
- estrai i totali esattamente come stampati sul cedolino; non ricostruire importi mancanti per supposizione.
- stipendio_lordo è il lordo/competenze lorde del periodo indicato dal cedolino.
- contributi_inps è la quota a carico del lavoratore quando distinguibile.
- irpef è l'IRPEF effettivamente trattenuta nel periodo, al netto delle detrazioni quando il cedolino la espone così.
- imponibile_previdenziale e imponibile_fiscale devono essere quelli riportati nel documento, non stimati.
- competenze_totali e trattenute_totali devono essere i totali del cedolino quando presenti.
- tfr_maturato è il rateo/maturazione del periodo solo quando esplicitamente indicato; tfr_progressivo è il totale/progressivo riportato nel documento. Non stimare nessuno dei due.
- saldi_assenze contiene solo contatori chiaramente stampati per ferie, permessi, ROL, ex festività o equivalenti. Mantieni l'unità originale (ore/giorni) e non convertire.
- eventi_periodo contiene solo eventi chiaramente riferiti al mese: straordinari, premi, assenze, malattia, ferie, permessi o altre competenze/assenze variabili. Se quantità o importo non sono stampati, usa null.
- se non trovi saldi o eventi, restituisci array vuoti. Se un campo non è determinabile, usa null. Non inventare valori.
- ogni spiegazione deve essere in italiano semplice e descrittiva, senza affermare che una voce è legalmente corretta se il documento da solo non lo dimostra.

SE NON È UN DOCUMENTO SUPPORTATO restituisci esattamente:
{ "tipo_rilevato": "sconosciuto" }`
}

export class AnthropicProvider implements AIProvider {
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  async analyzeDocument(params: AnalyzeDocumentParams): Promise<AnalyzeDocumentResult> {
    const { fileBase64, mimeType, textOverride } = params
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

    const prompt = buildPrompt()
    const contentBlocks = textOverride
      ? [{ type: 'text' as const, text: `${prompt}\n\nTesto del documento:\n${textOverride}` }]
      : [isPdf ? docContent : imageContent, { type: 'text' as const, text: prompt }]

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 4096,
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
