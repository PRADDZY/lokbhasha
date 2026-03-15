import { GlossaryDatabaseError } from './glossary'
import { LingoConfigurationError } from './lingo'
import type { AnalysisResult } from './types'


export const ANALYZE_REQUEST_ERROR_MESSAGE = 'Upload a PDF or provide Marathi text before analyzing.'

type AnalyzeRouteDependencies = {
  analyzeMarathiDocument: (input: {
    marathiText: string
    source: 'pdf' | 'text'
    extractionConfidence?: number
  }) => Promise<AnalysisResult>
  extractPdfText: (file: File) => Promise<{ text: string; confidence: number }>
}

export function getAnalyzeErrorStatus(error: unknown): number {
  if (error instanceof Error && error.message === ANALYZE_REQUEST_ERROR_MESSAGE) {
    return 400
  }

  if (error instanceof GlossaryDatabaseError || error instanceof LingoConfigurationError) {
    return 503
  }

  if (error instanceof Error && error.message.includes('LINGODOTDEV_API_KEY is required')) {
    return 503
  }

  if (
    error instanceof Error &&
    (
      error.message === 'PDF extraction failed.' ||
      error.message === 'Extraction service returned an invalid response.' ||
      error.message.includes('PDF extraction dependencies are missing')
    )
  ) {
    return 503
  }

  return 500
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
    throw new Error(ANALYZE_REQUEST_ERROR_MESSAGE)
  }

  return dependencies.analyzeMarathiDocument({
    marathiText: sourceText,
    source,
    extractionConfidence,
  })
}
