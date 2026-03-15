import assert from 'node:assert/strict'
import test from 'node:test'

import { analyzeDocument } from '../src/lib/api'
import type { AnalysisResult } from '../src/lib/types'


function buildExpectedResult(): AnalysisResult {
  return {
    source: 'text',
    marathiText: 'अर्ज सादर करा',
    glossaryHits: [],
    terminologyHints: {},
    englishCanonical: 'Submit the application',
    localizedText: {
      hi: 'आवेदन जमा करें',
    },
    simplifiedEnglish: 'Submit the application',
    actions: [],
  }
}

test('analyzeDocument posts to NEXT_PUBLIC_API_BASE_URL when configured', async () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  const originalFetch = globalThis.fetch
  const expected = buildExpectedResult()
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
