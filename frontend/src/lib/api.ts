import type { AnalysisResult } from './types'


const DEFAULT_ANALYZE_API_BASE_URL = 'http://localhost:5001'

function getAnalyzeApiUrl(): string {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_ANALYZE_API_BASE_URL).replace(/\/$/, '')
  return `${baseUrl}/analyze`
}

export type { AnalysisResult } from './types'

export async function analyzeDocument(input: {
  file?: File | null
  marathiText?: string
}): Promise<AnalysisResult> {
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

  const payload = (await response.json().catch(() => null)) as AnalysisResult | { detail?: string } | null
  if (!response.ok) {
    throw new Error((payload as { detail?: string } | null)?.detail || 'Analysis failed.')
  }

  return payload as AnalysisResult
}
