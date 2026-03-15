import type { AnalysisResult } from './types'


type AnalyzeRouteDependencies = {
  analyzeMarathiDocument: (input: {
    marathiText: string
    source: 'pdf' | 'text'
    extractionConfidence?: number
  }) => Promise<AnalysisResult>
  extractPdfText: (file: File) => Promise<{ text: string; confidence: number }>
}

export async function handleAnalyzeFormData(
  formData: FormData,
  dependencies: AnalyzeRouteDependencies
): Promise<AnalysisResult> {
  const uploadedFile = formData.get('file')
  const marathiText = String(formData.get('marathiText') || '').trim()

  let source: 'pdf' | 'text' = 'text'
  let extractionConfidence: number | undefined
  let sourceText = marathiText

  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    const extracted = await dependencies.extractPdfText(uploadedFile)
    source = 'pdf'
    extractionConfidence = extracted.confidence
    sourceText = extracted.text.trim()
  }

  if (!sourceText) {
    throw new Error('Upload a PDF or provide Marathi text before analyzing.')
  }

  return dependencies.analyzeMarathiDocument({
    marathiText: sourceText,
    source,
    extractionConfidence,
  })
}
