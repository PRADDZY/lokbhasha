import { getExtractionBackendUrl } from './config'


export async function extractPdfText(file: File): Promise<{ text: string; confidence: number }> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${getExtractionBackendUrl()}/extract`, {
    method: 'POST',
    body: formData,
  })

  const payload = (await response.json().catch(() => null)) as
    | { text?: string; confidence?: number; detail?: string }
    | null

  if (!response.ok) {
    throw new Error(payload?.detail || 'PDF extraction failed.')
  }

  if (!payload?.text || typeof payload.confidence !== 'number') {
    throw new Error('Extraction service returned an invalid response.')
  }

  return {
    text: payload.text,
    confidence: payload.confidence,
  }
}
