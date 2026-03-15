import type { AnalysisResult } from './server/types'

export type { AnalysisResult }

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

  const response = await fetch('/api/analyze', {
    method: 'POST',
    body: formData,
  })

  const payload = (await response.json().catch(() => null)) as AnalysisResult | { detail?: string } | null
  if (!response.ok) {
    throw new Error((payload as { detail?: string } | null)?.detail || 'Analysis failed.')
  }

  return payload as AnalysisResult
}
