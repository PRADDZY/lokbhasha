import assert from 'node:assert/strict'
import test from 'node:test'

import type { AnalysisSessionResult } from '../src/lib/types'
import {
  DEMO_SAMPLE,
} from '../src/lib/demo-sample'
import {
  DEMO_RESULT_STORAGE_KEY,
  RESULT_STORAGE_KEY,
  getInitialSelectedLocales,
  readStoredResultSession,
  writeStoredResultSession,
} from '../src/lib/result-session'


type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

function createMemoryStorage(initialValues: Record<string, string> = {}) {
  const state = new Map(Object.entries(initialValues))
  const removedKeys: string[] = []

  const storage: StorageLike = {
    getItem(key) {
      return state.has(key) ? state.get(key) ?? null : null
    },
    setItem(key, value) {
      state.set(key, value)
    },
    removeItem(key) {
      removedKeys.push(key)
      state.delete(key)
    },
  }

  return {
    storage,
    removedKeys,
    snapshot: () => Object.fromEntries(state.entries()),
  }
}

function buildSessionResult(localizedText?: Record<string, string>): AnalysisSessionResult {
  return {
    source: 'text',
    marathiText: 'अर्ज सादर करावा.',
    glossaryHits: [],
    englishCanonical: 'Submit the application.',
    localizationContext: {
      provider: 'lingo.dev',
      engineSelectionMode: 'implicit_default',
      engineId: null,
      sourceLocale: {
        configured: 'mr',
        recognized: 'mr',
        matchesConfigured: true,
      },
      canonicalStage: {
        requestShape: 'structured_object',
        method: 'localizeObject',
        sourceLocale: 'mr',
        targetLocale: 'en',
        fast: true,
        glossaryMode: 'fallback_request_hints',
      },
    },
    ...(localizedText ? { localizedText } : {}),
  }
}

test('DEMO_SAMPLE stays judge-ready with live Marathi text and suggested locales', () => {
  assert.ok(DEMO_SAMPLE.id.length > 0)
  assert.ok(DEMO_SAMPLE.title.length > 0)
  assert.ok(DEMO_SAMPLE.summary.length > 0)
  assert.ok(DEMO_SAMPLE.marathiText.length > 120)
  assert.ok(DEMO_SAMPLE.suggestedLocales.length >= 2)
})

test('getInitialSelectedLocales keeps loaded locales selected and appends suggested locales without duplicates', () => {
  const locales = getInitialSelectedLocales(
    buildSessionResult({
      hi: 'हिंदी',
      bn: 'বাংলা',
    }),
    {
      sampleId: DEMO_SAMPLE.id,
      sampleTitle: DEMO_SAMPLE.title,
      suggestedLocales: ['bn', 'gu', 'ta'],
    }
  )

  assert.deepEqual(locales, ['hi', 'bn', 'gu', 'ta'])
})

test('readStoredResultSession clears malformed session data instead of surfacing stale demo state', () => {
  const { storage, removedKeys } = createMemoryStorage({
    [RESULT_STORAGE_KEY]: '{bad json',
    [DEMO_RESULT_STORAGE_KEY]: '{"sampleId":"x","sampleTitle":"Bad","suggestedLocales":["hi"]}',
  })

  const session = readStoredResultSession(storage)

  assert.equal(session.result, null)
  assert.equal(session.demoMetadata, null)
  assert.deepEqual(removedKeys, [RESULT_STORAGE_KEY, DEMO_RESULT_STORAGE_KEY])
})

test('writeStoredResultSession replaces core result and clears stale demo metadata for non-sample runs', () => {
  const { storage, snapshot } = createMemoryStorage({
    [DEMO_RESULT_STORAGE_KEY]: JSON.stringify({
      sampleId: DEMO_SAMPLE.id,
      sampleTitle: DEMO_SAMPLE.title,
      suggestedLocales: DEMO_SAMPLE.suggestedLocales,
    }),
  })

  writeStoredResultSession(storage, buildSessionResult())

  const nextState = snapshot()

  assert.ok(nextState[RESULT_STORAGE_KEY])
  assert.equal(nextState[DEMO_RESULT_STORAGE_KEY], undefined)
})
