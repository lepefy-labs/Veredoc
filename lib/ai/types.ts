export interface AIProvider {
  analyzeDocument(params: AnalyzeDocumentParams): Promise<AnalyzeDocumentResult>
}

export interface AnalyzeDocumentParams {
  fileBase64: string
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png'
  documentType: 'BOLLETTA_LUCE' | 'BOLLETTA_GAS' | 'BOLLETTA_INTERNET' | 'BUSTA_PAGA'
}

export interface AnalyzeDocumentResult {
  raw: unknown
  provider: string
}
