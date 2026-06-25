import { AIProvider, AnalyzeDocumentParams, AnalyzeDocumentResult } from '../types'

export class OpenAIProvider implements AIProvider {
  async analyzeDocument(_params: AnalyzeDocumentParams): Promise<AnalyzeDocumentResult> {
    throw new Error('Provider not yet implemented')
  }
}
