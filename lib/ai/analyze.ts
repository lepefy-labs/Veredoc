import { AIProvider, AnalyzeDocumentParams, AnalyzeDocumentResult } from './types'

function getProvider(): AIProvider {
  const name = process.env.AI_PROVIDER ?? 'anthropic'
  switch (name) {
    case 'anthropic': {
      const { AnthropicProvider } = require('./providers/anthropic')
      return new AnthropicProvider()
    }
    case 'openai': {
      const { OpenAIProvider } = require('./providers/openai')
      return new OpenAIProvider()
    }
    case 'gemini': {
      const { GeminiProvider } = require('./providers/gemini')
      return new GeminiProvider()
    }
    default:
      throw new Error(`Unknown AI provider: ${name}`)
  }
}

export async function analyzeDocument(
  params: AnalyzeDocumentParams
): Promise<AnalyzeDocumentResult> {
  return getProvider().analyzeDocument(params)
}
