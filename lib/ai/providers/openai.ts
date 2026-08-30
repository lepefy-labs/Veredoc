import { AIProvider, AnalyzeDocumentParams, AnalyzeDocumentResult } from '../types'

export class OpenAIProvider implements AIProvider {
  async analyzeDocument(params: AnalyzeDocumentParams): Promise<AnalyzeDocumentResult> {
    void params
    throw new Error('Provider not yet implemented')
  }
}
