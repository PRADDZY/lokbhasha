import assert from 'node:assert/strict'
import test from 'node:test'

import { analyzeDocument, enrichDocument } from '../src/lib/api'
import type { AnalysisCoreResult, AnalysisEnrichmentResult } from '../src/lib/types'


function buildExpectedCoreResult(): AnalysisCoreResult {
  return {
    source: 'text',
    marathiText: 'अर्ज सादर करा',
    glossaryHits: [],
    englishCanonical: 'Submit the application',
  }
}

test('analyzeDocument posts to NEXT_PUBLIC_API_BASE_URL/analyze and expects the core result only', async () => {
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
    const result = await analyzeDocument({ marathiText: 'अर्ज सादर करा' })
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
      hi: 'आवेदन जमा करें',
      bn: 'আবেদন জমা দিন',
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
