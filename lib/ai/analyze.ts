import { AnthropicProvider } from './providers/anthropic'
import { GeminiProvider } from './providers/gemini'
import { OpenAIProvider } from './providers/openai'
import { AIProvider, AnalyzeDocumentParams, AnalyzeDocumentResult } from './types'

function getProvider(): AIProvider {
  const name = process.env.AI_PROVIDER ?? 'anthropic'
  switch (name) {
    case 'anthropic':
      return new AnthropicProvider()
    case 'openai':
      return new OpenAIProvider()
    case 'gemini':
      return new GeminiProvider()
    default:
      throw new Error(`Unknown AI provider: ${name}`)
  }
}

export async function analyzeDocument(
  params: AnalyzeDocumentParams
): Promise<AnalyzeDocumentResult> {
  return getProvider().analyzeDocument(params)
}
