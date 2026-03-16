import type { AnalysisSessionResult } from './types'


export const RESULT_STORAGE_KEY = 'lokbhasha:last-result'
export const DEMO_RESULT_STORAGE_KEY = 'lokbhasha:last-demo'

export type DemoResultMetadata = {
  sampleId: string
  sampleTitle: string
  suggestedLocales: string[]
}

type SessionStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

type StoredResultSession = {
  result: AnalysisSessionResult | null
  demoMetadata: DemoResultMetadata | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAnalysisSessionResult(value: unknown): value is AnalysisSessionResult {
  return (
    isRecord(value)
    && typeof value.source === 'string'
    && typeof value.marathiText === 'string'
    && Array.isArray(value.glossaryHits)
    && typeof value.englishCanonical === 'string'
  )
}

function isDemoResultMetadata(value: unknown): value is DemoResultMetadata {
  return (
    isRecord(value)
    && typeof value.sampleId === 'string'
    && typeof value.sampleTitle === 'string'
    && Array.isArray(value.suggestedLocales)
    && value.suggestedLocales.every((locale) => typeof locale === 'string')
  )
}

export function getInitialSelectedLocales(
  result: AnalysisSessionResult,
  demoMetadata: DemoResultMetadata | null
): string[] {
  const loadedLocales = Object.keys(result.localizedText ?? {})
  const suggestedLocales = demoMetadata?.suggestedLocales ?? []

  return [...new Set([...loadedLocales, ...suggestedLocales])]
}

export function readStoredResultSession(storage: SessionStorageLike): StoredResultSession {
  const storedResult = storage.getItem(RESULT_STORAGE_KEY)
  if (!storedResult) {
    storage.removeItem(DEMO_RESULT_STORAGE_KEY)
    return { result: null, demoMetadata: null }
  }

  try {
    const parsedResult = JSON.parse(storedResult) as unknown
    if (!isAnalysisSessionResult(parsedResult)) {
      throw new Error('Invalid stored result')
    }

    const storedDemoMetadata = storage.getItem(DEMO_RESULT_STORAGE_KEY)
    if (!storedDemoMetadata) {
      return { result: parsedResult, demoMetadata: null }
    }

    const parsedDemoMetadata = JSON.parse(storedDemoMetadata) as unknown
    if (!isDemoResultMetadata(parsedDemoMetadata)) {
      storage.removeItem(DEMO_RESULT_STORAGE_KEY)
      return { result: parsedResult, demoMetadata: null }
    }

    return {
      result: parsedResult,
      demoMetadata: parsedDemoMetadata,
    }
  } catch {
    storage.removeItem(RESULT_STORAGE_KEY)
    storage.removeItem(DEMO_RESULT_STORAGE_KEY)
    return { result: null, demoMetadata: null }
  }
}

export function writeStoredResultSession(
  storage: SessionStorageLike,
  result: AnalysisSessionResult,
  demoMetadata?: DemoResultMetadata
) {
  storage.setItem(RESULT_STORAGE_KEY, JSON.stringify(result))

  if (demoMetadata) {
    storage.setItem(DEMO_RESULT_STORAGE_KEY, JSON.stringify(demoMetadata))
    return
  }

  storage.removeItem(DEMO_RESULT_STORAGE_KEY)
}
