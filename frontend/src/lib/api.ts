import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

export type ActionItem = {
  action: string
  deadline: string | null
  requirement: string | null
}

export type UploadResponse = {
  text: string
  glossary: Record<string, string>
  confidence: number
}

export type TranslateResponse = {
  marathi: string
  english: string
  simplified: string
  actions: ActionItem[]
  glossary_terms: Record<string, string>
}

export type AnalysisResult = TranslateResponse & {
  source: 'pdf' | 'text'
  extractionConfidence?: number
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const uploadPDF = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data as UploadResponse
  } catch (error) {
    throw new Error(`PDF upload failed: ${error}`)
  }
}

export const translateText = async (marathiText: string) => {
  try {
    const response = await api.post('/translate', {
      marathi_text: marathiText,
    })
    return response.data as TranslateResponse
  } catch (error) {
    throw new Error(`Translation failed: ${error}`)
  }
}

export default api
