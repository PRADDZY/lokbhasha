import assert from 'node:assert/strict'
import test from 'node:test'

import * as api from '../src/lib/api'
import {
  analyzeDocument,
  enrichDocument,
  fetchGlossaryStatus,
  fetchQualitySummary,
  runBaselineComparison,
} from '../src/lib/api'
import type {
  AnalysisComparisonResult,
  AnalysisCoreResult,
  AnalysisEnrichmentResult,
  GlossarySyncStatus,
  QualitySummary,
} from '../src/lib/types'


function buildExpectedCoreResult(): AnalysisCoreResult {
  return {
    source: 'text',
    marathiText: 'arj sadar kara',
    glossaryHits: [],
    englishCanonical: 'Submit the application',
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
  }
}

test('analyzeDocument posts to NEXT_PUBLIC_API_BASE_URL/analyze and expects source-recognition and canonical-stage metadata', async () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  const originalFetch = globalThis.fetch
  const expected = buildExpectedCoreResult()
  let requestedUrl = ''

  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://lokbhasha-analyze.onrender.com'
  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return new Response(JSON.stringify(expected), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const result = await analyzeDocument({ marathiText: 'arj sadar kara' })
    assert.equal(requestedUrl, 'https://lokbhasha-analyze.onrender.com/analyze')
    assert.deepEqual(result, expected)
  } finally {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalBaseUrl
    }
    globalThis.fetch = originalFetch
  }
})

test('enrichDocument posts JSON to NEXT_PUBLIC_API_BASE_URL/enrich and returns only requested optional outputs', async () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  const originalFetch = globalThis.fetch
  const expected: AnalysisEnrichmentResult = {
    localizedText: {
      hi: 'Hindi output',
      bn: 'Bangla output',
    },
  }
  const requests: Array<{ url: string; method: string; contentType: string | null; body: string }> = []

  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://lokbhasha-analyze.onrender.com'
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method || 'GET',
      contentType: new Headers(init?.headers).get('content-type'),
      body: String(init?.body || ''),
    })
    return new Response(JSON.stringify(expected), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const result = await enrichDocument({
      englishCanonical: 'Submit the application',
      requestedLocales: ['hi', 'bn'],
      includePlainExplanation: false,
      includeActions: false,
    })

    assert.deepEqual(requests, [
      {
        url: 'https://lokbhasha-analyze.onrender.com/enrich',
        method: 'POST',
        contentType: 'application/json',
        body: JSON.stringify({
          englishCanonical: 'Submit the application',
          requestedLocales: ['hi', 'bn'],
          includePlainExplanation: false,
          includeActions: false,
        }),
      },
    ])
    assert.deepEqual(result, expected)
  } finally {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalBaseUrl
    }
    globalThis.fetch = originalFetch
  }
})

test('fetchGlossaryStatus reads glossary sync metadata from NEXT_PUBLIC_API_BASE_URL/glossary-status', async () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  const originalFetch = globalThis.fetch
  const expected: GlossarySyncStatus = {
    source: 'government_19k',
    sourcePath: '/app/dict/19k.json',
    sourceFormat: 'english_to_marathi_list',
    sourceLocale: 'mr',
    targetLocale: 'en',
    authority: 'lingo_mcp',
    detectionStore: 'sqlite',
    managementMode: 'mcp_only',
    syncState: 'ready',
    totalTerms: 249048,
    customTranslationTerms: 249040,
    nonTranslatableTerms: 8,
    packageHash: 'abc123',
    runtimeArtifactPath: '/app/sqlite/glossary.sqlite3',
    lastPreparedAt: '2026-03-16T12:00:00.000Z',
    lastSyncedAt: null,
    fallbackMode: 'compact_request_hints',
    previewEntries: [
      {
        sourceLocale: 'mr',
        targetLocale: 'en',
        sourceText: 'arj',
        targetText: 'application',
        type: 'custom_translation',
        hint: null,
      },
    ],
  }
  let requestedUrl = ''

  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://lokbhasha-analyze.onrender.com'
  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return new Response(JSON.stringify(expected), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const result = await fetchGlossaryStatus()
    assert.equal(requestedUrl, 'https://lokbhasha-analyze.onrender.com/glossary-status')
    assert.deepEqual(result, expected)
  } finally {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalBaseUrl
    }
    globalThis.fetch = originalFetch
  }
})

test('frontend api exports fetchLingoSetup for the read-only Lingo setup panel', async () => {
  assert.equal(typeof api.fetchLingoSetup, 'function')
})

function buildExpectedQualitySummary(): QualitySummary {
  return {
    sourceLocale: 'mr',
    canonicalTargetLocale: 'en',
    selectedTargetLocales: ['as', 'bn', 'gu', 'hi'],
    engineStatus: 'default_org_engine',
    layerStates: {
      glossary: 'ready',
      brandVoices: 'not_surfaced',
      instructions: 'not_surfaced',
      aiReviewers: 'not_surfaced',
    },
    glossaryStatus: {
      totalTerms: 249048,
      syncState: 'ready',
      lastSyncedAt: '2026-03-16T12:00:00.000Z',
      fallbackHintsEnabled: true,
    },
    baselineComparison: {
      available: true,
      method: 'same_localizeObject_without_glossary_hints',
    },
  }
}

function buildExpectedComparisonResult(): AnalysisComparisonResult {
  return {
    targetLocale: 'en',
    method: 'same_localizeObject_without_glossary_hints',
    baselineText: 'Send the application',
    sameAsCurrent: false,
    glossaryMatchCount: 2,
    hintTermCount: 2,
  }
}

test('fetchQualitySummary reads quality metadata from NEXT_PUBLIC_API_BASE_URL/quality-summary', async () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  const originalFetch = globalThis.fetch
  const expected = buildExpectedQualitySummary()
  let requestedUrl = ''

  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://lokbhasha-analyze.onrender.com'
  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return new Response(JSON.stringify(expected), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const result = await fetchQualitySummary()
    assert.equal(requestedUrl, 'https://lokbhasha-analyze.onrender.com/quality-summary')
    assert.deepEqual(result, expected)
  } finally {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalBaseUrl
    }
    globalThis.fetch = originalFetch
  }
})

test('runBaselineComparison posts Marathi text and canonical English to NEXT_PUBLIC_API_BASE_URL/quality/baseline-compare', async () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  const originalFetch = globalThis.fetch
  const expected = buildExpectedComparisonResult()
  const requests: Array<{ url: string; method: string; contentType: string | null; body: string }> = []

  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://lokbhasha-analyze.onrender.com'
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method || 'GET',
      contentType: new Headers(init?.headers).get('content-type'),
      body: String(init?.body || ''),
    })
    return new Response(JSON.stringify(expected), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const result = await runBaselineComparison({
      marathiText: 'arj sadar kara',
      englishCanonical: 'Submit the application',
    })

    assert.deepEqual(requests, [
      {
        url: 'https://lokbhasha-analyze.onrender.com/quality/baseline-compare',
        method: 'POST',
        contentType: 'application/json',
        body: JSON.stringify({
          marathiText: 'arj sadar kara',
          englishCanonical: 'Submit the application',
        }),
      },
    ])
    assert.deepEqual(result, expected)
  } finally {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalBaseUrl
    }
    globalThis.fetch = originalFetch
  }
})
