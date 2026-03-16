import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  AnalysisCoreResult,
  AnalysisEnrichmentResult,
  GlossarySyncStatus,
  LingoSetupSummary,
} from '../src/types'
import { buildAnalyzeServer, getStartupFailureMessage } from '../src/server'


function buildExpectedCoreResult(): AnalysisCoreResult {
  return {
    source: 'text',
    marathiText: 'submitted text',
    glossaryHits: [],
    englishCanonical: 'Submit the application',
  }
}

function buildExpectedEnrichmentResult(): AnalysisEnrichmentResult {
  return {
    localizedText: {
      hi: 'आवेदन जमा करें',
    },
    simplifiedEnglish: 'Submit the application',
    actions: [],
  }
}

function buildExpectedGlossaryStatus(): GlossarySyncStatus {
  return {
    source: 'sqlite',
    sourceLocale: 'mr',
    targetLocale: 'en',
    syncState: 'ready',
    totalTerms: 249048,
    customTranslationTerms: 249040,
    nonTranslatableTerms: 8,
    packageHash: 'abc123',
    lastSyncedAt: '2026-03-16T12:00:00.000Z',
    fallbackMode: 'compact_request_hints',
    previewEntries: [
      {
        sourceLocale: 'mr',
        targetLocale: 'en',
        sourceText: 'अर्ज',
        targetText: 'application',
        type: 'custom_translation',
        hint: null,
      },
    ],
  }
}

function buildExpectedLingoSetup(): LingoSetupSummary {
  return {
    sourceLocale: 'mr',
    canonicalTargetLocale: 'en',
    selectedTargetLocales: ['as', 'bn', 'gu', 'hi'],
    runtimePath: ['mr->en', 'en->selectedLocales'],
    engine: {
      selectionMode: 'implicit_default',
      engineId: null,
      status: 'default_org_engine',
      note: 'SDK wrapper uses the organization default engine.',
    },
    layers: {
      glossary: {
        status: 'ready',
        source: 'sqlite',
        sourceLocale: 'mr',
        targetLocale: 'en',
        precedence: 'highest',
        totalTerms: 249048,
        customTranslationTerms: 249040,
        nonTranslatableTerms: 8,
        packageHash: 'abc123',
        lastSyncedAt: '2026-03-16T12:00:00.000Z',
        fallbackMode: 'compact_request_hints',
      },
      brandVoices: {
        status: 'not_surfaced',
        supportedShape: 'one_per_target_locale',
        configuredCount: 0,
        activeInRuntime: false,
      },
      instructions: {
        status: 'not_surfaced',
        supportedShape: 'many_per_locale',
        wildcardSupported: true,
        configuredCount: 0,
        activeInRuntime: false,
      },
      aiReviewers: {
        status: 'not_surfaced',
        supportedShape: 'async_per_locale_pair',
        configuredCount: 0,
        activeInRuntime: false,
      },
    },
  }
}

function buildMultipartBody(parts: Array<
  | { name: string; value: string }
  | { name: string; filename: string; contentType: string; content: Buffer | string }
>) {
  const boundary = 'lokbhasha-test-boundary'
  const chunks: Buffer[] = []

  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\n`))
    if ('filename' in part) {
      chunks.push(
        Buffer.from(
          `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n` +
          `Content-Type: ${part.contentType}\r\n\r\n`
        )
      )
      chunks.push(Buffer.isBuffer(part.content) ? part.content : Buffer.from(part.content))
      chunks.push(Buffer.from('\r\n'))
      continue
    }

    chunks.push(
      Buffer.from(
        `Content-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value}\r\n`
      )
    )
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`))
  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  }
}

test('buildAnalyzeServer exposes a health endpoint', async () => {
  const server = buildAnalyzeServer({
    handleAnalyzeRequest: async () => buildExpectedCoreResult(),
    handleEnrichRequest: async () => buildExpectedEnrichmentResult(),
  })

  const response = await server.inject({
    method: 'GET',
    url: '/health',
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { status: 'ok' })
  await server.close()
})

test('buildAnalyzeServer explains how to use the analyze endpoint on GET requests', async () => {
  const server = buildAnalyzeServer({
    handleAnalyzeRequest: async () => buildExpectedCoreResult(),
    handleEnrichRequest: async () => buildExpectedEnrichmentResult(),
  })

  const response = await server.inject({
    method: 'GET',
    url: '/analyze',
  })

  assert.equal(response.statusCode, 405)
  assert.deepEqual(response.json(), {
    detail: 'Use POST /analyze with multipart form data or Marathi text.',
  })
  await server.close()
})

test('buildAnalyzeServer explains how to use the enrich endpoint on GET requests', async () => {
  const server = buildAnalyzeServer({
    handleAnalyzeRequest: async () => buildExpectedCoreResult(),
    handleEnrichRequest: async () => buildExpectedEnrichmentResult(),
    handleGlossaryStatusRequest: async () => buildExpectedGlossaryStatus(),
  })

  const response = await server.inject({
    method: 'GET',
    url: '/enrich',
  })

  assert.equal(response.statusCode, 405)
  assert.deepEqual(response.json(), {
    detail: 'Use POST /enrich with canonical English text and requested outputs.',
  })
  await server.close()
})

test('buildAnalyzeServer exposes glossary sync status for the result view', async () => {
  const server = buildAnalyzeServer({
    handleAnalyzeRequest: async () => buildExpectedCoreResult(),
    handleEnrichRequest: async () => buildExpectedEnrichmentResult(),
    handleGlossaryStatusRequest: async () => buildExpectedGlossaryStatus(),
  })

  const response = await server.inject({
    method: 'GET',
    url: '/glossary-status',
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), buildExpectedGlossaryStatus())
  await server.close()
})

test('buildAnalyzeServer exposes a read-only lingo setup summary for the result view', async () => {
  const server = buildAnalyzeServer({
    handleAnalyzeRequest: async () => buildExpectedCoreResult(),
    handleEnrichRequest: async () => buildExpectedEnrichmentResult(),
    handleGlossaryStatusRequest: async () => buildExpectedGlossaryStatus(),
    handleLingoSetupRequest: async () => buildExpectedLingoSetup(),
  })

  const response = await server.inject({
    method: 'GET',
    url: '/lingo-setup',
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), buildExpectedLingoSetup())
  await server.close()
})

test('buildAnalyzeServer converts multipart text requests into FormData for analysis', async () => {
  let receivedText = ''
  const server = buildAnalyzeServer({
    handleAnalyzeRequest: async (formData) => {
      receivedText = String(formData.get('marathiText') ?? '')
      return buildExpectedCoreResult()
    },
    handleEnrichRequest: async () => buildExpectedEnrichmentResult(),
  })
  const multipart = buildMultipartBody([
    { name: 'marathiText', value: 'मजकूर' },
  ])

  const response = await server.inject({
    method: 'POST',
    url: '/analyze',
    payload: multipart.body,
    headers: {
      'content-type': multipart.contentType,
    },
  })

  assert.equal(response.statusCode, 200)
  assert.equal(receivedText, 'मजकूर')
  await server.close()
})

test('buildAnalyzeServer converts multipart file uploads into File objects for analysis', async () => {
  let receivedFileName = ''
  const server = buildAnalyzeServer({
    handleAnalyzeRequest: async (formData) => {
      const file = formData.get('file')
      assert.ok(file instanceof File)
      receivedFileName = file.name
      return {
        ...buildExpectedCoreResult(),
        source: 'pdf',
      }
    },
    handleEnrichRequest: async () => buildExpectedEnrichmentResult(),
  })
  const multipart = buildMultipartBody([
    {
      name: 'file',
      filename: 'circular.pdf',
      contentType: 'application/pdf',
      content: Buffer.from('%PDF-sample'),
    },
  ])

  const response = await server.inject({
    method: 'POST',
    url: '/analyze',
    payload: multipart.body,
    headers: {
      'content-type': multipart.contentType,
    },
  })

  assert.equal(response.statusCode, 200)
  assert.equal(receivedFileName, 'circular.pdf')
  await server.close()
})

test('buildAnalyzeServer forwards enrich requests as JSON payloads', async () => {
  let receivedBody: Record<string, unknown> | null = null
  const server = buildAnalyzeServer({
    handleAnalyzeRequest: async () => buildExpectedCoreResult(),
    handleEnrichRequest: async (body) => {
      receivedBody = body as Record<string, unknown>
      return buildExpectedEnrichmentResult()
    },
  })

  const response = await server.inject({
    method: 'POST',
    url: '/enrich',
    payload: {
      englishCanonical: 'Submit the application',
      requestedLocales: ['hi'],
      includePlainExplanation: false,
      includeActions: true,
    },
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(receivedBody, {
    englishCanonical: 'Submit the application',
    requestedLocales: ['hi'],
    includePlainExplanation: false,
    includeActions: true,
  })
  await server.close()
})

test('buildAnalyzeServer hides unexpected internal errors behind a generic 500 response', async () => {
  const server = buildAnalyzeServer({
    handleAnalyzeRequest: async () => {
      throw new Error('secret internal path')
    },
    handleEnrichRequest: async () => buildExpectedEnrichmentResult(),
  })

  const response = await server.inject({
    method: 'POST',
    url: '/analyze',
    payload: {
      marathiText: 'मजकूर',
    },
  })

  assert.equal(response.statusCode, 500)
  assert.deepEqual(response.json(), {
    detail: 'Analysis failed.',
  })
  await server.close()
})

test('getStartupFailureMessage never returns stack traces or internal error text', () => {
  assert.equal(getStartupFailureMessage(new Error('boot exploded')), 'Analyze service failed to start.')
  assert.equal(
    getStartupFailureMessage({ stack: 'stack', message: 'details' }),
    'Analyze service failed to start.'
  )
})
