import type {
  AnalysisCoreResult,
  AnalysisEnrichmentRequest,
  AnalysisEnrichmentResult,
} from './types'


const DEFAULT_ANALYZE_API_BASE_URL = 'http://localhost:5001'

function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_ANALYZE_API_BASE_URL).replace(/\/$/, '')
}

function getAnalyzeApiUrl(): string {
  return `${getApiBaseUrl()}/analyze`
}

function getEnrichApiUrl(): string {
  return `${getApiBaseUrl()}/enrich`
}

export type {
  ActionItem,
  AnalysisCoreResult,
  AnalysisEnrichmentRequest,
  AnalysisEnrichmentResult,
  AnalysisSessionResult,
  GlossaryHit,
} from './types'

export async function analyzeDocument(input: {
  file?: File | null
  marathiText?: string
}): Promise<AnalysisCoreResult> {
  const formData = new FormData()
  if (input.file) {
    formData.append('file', input.file)
  }
  if (input.marathiText?.trim()) {
    formData.append('marathiText', input.marathiText.trim())
  }

  const response = await fetch(getAnalyzeApiUrl(), {
    method: 'POST',
    body: formData,
  })

  const payload = (await response.json().catch(() => null)) as AnalysisCoreResult | { detail?: string } | null
  if (!response.ok) {
    throw new Error((payload as { detail?: string } | null)?.detail || 'Analysis failed.')
  }

  return payload as AnalysisCoreResult
}

export async function enrichDocument(input: AnalysisEnrichmentRequest): Promise<AnalysisEnrichmentResult> {
  const response = await fetch(getEnrichApiUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json().catch(() => null)) as AnalysisEnrichmentResult | { detail?: string } | null
  if (!response.ok) {
    throw new Error((payload as { detail?: string } | null)?.detail || 'Analysis failed.')
  }

  return payload as AnalysisEnrichmentResult
}
