import { GlossaryDatabaseError, LingoConfigurationError } from './errors'
import type {
  AnalysisComparisonRequest,
  AnalysisComparisonResult,
  AnalysisCoreResult,
  AnalysisEnrichmentRequest,
  AnalysisEnrichmentResult,
} from './types'


export const ANALYZE_REQUEST_ERROR_MESSAGE = 'Upload a PDF or provide Marathi text before analyzing.'
export const ENRICH_SELECTION_ERROR_MESSAGE = 'Request at least one optional output before generating enrichments.'
export const ENRICH_TEXT_ERROR_MESSAGE = 'Provide canonical English text before generating enrichments.'
export const BASELINE_COMPARE_REQUEST_ERROR_MESSAGE =
  'Provide Marathi text and canonical English before running the baseline comparison.'

type AnalyzeRouteDependencies = {
  analyzeMarathiDocument: (input: {
    marathiText: string
    source: 'pdf' | 'text'
    extractionConfidence?: number
  }) => Promise<AnalysisCoreResult>
  extractPdfText: (file: File) => Promise<{ text: string; confidence: number }>
}

type EnrichRouteDependencies = {
  generateAnalysisEnrichment: (input: AnalysisEnrichmentRequest) => Promise<AnalysisEnrichmentResult>
}

type BaselineCompareRouteDependencies = {
  buildBaselineComparison: (input: AnalysisComparisonRequest) => Promise<AnalysisComparisonResult>
}

export function getAnalyzeErrorStatus(error: unknown): number {
  if (
    error instanceof Error &&
    (
      error.message === ANALYZE_REQUEST_ERROR_MESSAGE ||
      error.message === ENRICH_SELECTION_ERROR_MESSAGE ||
      error.message === ENRICH_TEXT_ERROR_MESSAGE ||
      error.message === BASELINE_COMPARE_REQUEST_ERROR_MESSAGE
    )
  ) {
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
): Promise<AnalysisCoreResult> {
  const uploadedFile = formData.get('file')
  const marathiText = String(formData.get('marathiText') || '').trim()
  const providedSource = String(formData.get('source') || '').trim()
  const extractionConfidenceValue = String(formData.get('extractionConfidence') || '').trim()
  const parsedExtractionConfidence = Number.parseFloat(extractionConfidenceValue)

  let source: 'pdf' | 'text' = 'text'
  let extractionConfidence: number | undefined
  let sourceText = marathiText

  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    const extracted = await dependencies.extractPdfText(uploadedFile)
    source = 'pdf'
    extractionConfidence = extracted.confidence
    sourceText = extracted.text.trim()
  } else {
    if (providedSource === 'pdf') {
      source = 'pdf'
    }

    if (Number.isFinite(parsedExtractionConfidence)) {
      extractionConfidence = parsedExtractionConfidence
    }
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

export async function handleEnrichRequest(
  body: Partial<AnalysisEnrichmentRequest> | null | undefined,
  dependencies: EnrichRouteDependencies
): Promise<AnalysisEnrichmentResult> {
  const englishCanonical = String(body?.englishCanonical || '').trim()
  const requestedLocales = Array.isArray(body?.requestedLocales)
    ? body.requestedLocales.map((locale) => String(locale).trim()).filter(Boolean)
    : []
  const includePlainExplanation = Boolean(body?.includePlainExplanation)
  const includeActions = Boolean(body?.includeActions)

  if (!englishCanonical) {
    throw new Error(ENRICH_TEXT_ERROR_MESSAGE)
  }

  if (!requestedLocales.length && !includePlainExplanation && !includeActions) {
    throw new Error(ENRICH_SELECTION_ERROR_MESSAGE)
  }

  return dependencies.generateAnalysisEnrichment({
    englishCanonical,
    requestedLocales,
    includePlainExplanation,
    includeActions,
  })
}

export async function handleBaselineCompareRequest(
  body: Partial<AnalysisComparisonRequest> | null | undefined,
  dependencies: BaselineCompareRouteDependencies
): Promise<AnalysisComparisonResult> {
  const marathiText = String(body?.marathiText || '').trim()
  const englishCanonical = String(body?.englishCanonical || '').trim()

  if (!marathiText || !englishCanonical) {
    throw new Error(BASELINE_COMPARE_REQUEST_ERROR_MESSAGE)
  }

  return dependencies.buildBaselineComparison({
    marathiText,
    englishCanonical,
  })
}
