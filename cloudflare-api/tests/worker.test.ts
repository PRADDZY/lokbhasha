import assert from 'node:assert/strict'
import test from 'node:test'

import type { CloudflareApiEnv } from '../src/env'
import { createCloudflareWorker } from '../src/worker'


type GlossaryRow = {
  marathi: string
  english: string
}

function createMockDatabase(rows: GlossaryRow[]) {
  const meta = new Map<string, string>([
    ['source_path', 'dict/19k.json'],
    ['source_format', 'english_to_marathi_list'],
    ['prepared_at', '2026-04-09T12:00:00.000Z'],
  ])

  return {
    prepare(query: string) {
      let boundValues: unknown[] = []

      return {
        bind(...values: unknown[]) {
          boundValues = values
          return this
        },
        async all<Row = Record<string, unknown>>() {
          if (query.includes('WHERE marathi IN')) {
            const results = rows.filter((row) => boundValues.includes(row.marathi))
            return { results: results as Row[] }
          }

          if (query.includes('ORDER BY marathi')) {
            const results = [...rows]
              .sort((left, right) => left.marathi.localeCompare(right.marathi))
              .slice(0, 5)
            return { results: results as Row[] }
          }

          return { results: [] as Row[] }
        },
        async first<Row = Record<string, unknown>>() {
          if (query.includes("sqlite_master") && query.includes("type = 'table'")) {
            return { name: 'glossary' } as Row
          }

          if (query.includes("sqlite_master") && query.includes("type = 'index'")) {
            return { name: 'idx_marathi' } as Row
          }

          if (query.includes('COUNT(*) AS count FROM glossary WHERE marathi = english')) {
            return {
              count: rows.filter((row) => row.marathi === row.english).length,
            } as Row
          }

          if (query.includes('COUNT(*) AS count FROM glossary')) {
            return { count: rows.length } as Row
          }

          if (query.includes('SELECT value FROM glossary_meta')) {
            return { value: meta.get(String(boundValues[0])) ?? null } as Row
          }

          return null
        },
        async run() {
          return {}
        },
      }
    },
  }
}

function createEnv(overrides: Partial<CloudflareApiEnv> = {}): CloudflareApiEnv {
  return {
    GLOSSARY_DB: createMockDatabase([
      { marathi: 'अर्ज', english: 'application' },
      { marathi: 'प्रमाणपत्र', english: 'certificate' },
    ]),
    LINGODOTDEV_API_KEY: 'test-key',
    CORS_ALLOWED_ORIGINS: 'https://example.com',
    GLOSSARY_LAST_SYNC_AT: '2026-04-09T12:30:00.000Z',
    GLOSSARY_REMOTE_TERM_COUNT: '2',
    ...overrides,
  }
}

test('worker exposes health and status routes', async () => {
  const worker = createCloudflareWorker()
  const env = createEnv()

  const healthResponse = await worker.fetch(new Request('https://api.example.com/health'), env)
  assert.equal(healthResponse.status, 200)
  assert.deepEqual(await healthResponse.json(), { status: 'ok' })

  const statusResponse = await worker.fetch(new Request('https://api.example.com/glossary-status'), env)
  assert.equal(statusResponse.status, 200)
  const statusPayload = await statusResponse.json() as Record<string, unknown>
  assert.equal(statusPayload.totalTerms, 2)
  assert.equal(statusPayload.runtimeArtifactPath, 'cloudflare:d1:GLOSSARY_DB')
})

test('worker analyzes Marathi text through D1 and Lingo fetch calls', async () => {
  const lingoCalls: Array<{ url: string; payload?: Record<string, unknown> }> = []
  const worker = createCloudflareWorker({
    fetchImpl: async (input, init) => {
      const url = String(input)
      const payload = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined
      lingoCalls.push({ url, payload })

      if (url.endsWith('/process/recognize')) {
        return new Response(JSON.stringify({ locale: 'mr' }), { status: 200 })
      }

      return new Response(JSON.stringify({ data: { canonicalText: 'Submit the application' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    },
  })
  const env = createEnv()
  const formData = new FormData()
  formData.append('marathiText', 'अर्ज सादर करा')
  formData.append('source', 'text')

  const response = await worker.fetch(new Request('https://api.example.com/analyze', {
    method: 'POST',
    body: formData,
  }), env)

  assert.equal(response.status, 200)
  const payload = await response.json() as Record<string, unknown>
  assert.equal(payload.englishCanonical, 'Submit the application')
  assert.equal((payload.localizationContext as Record<string, unknown>).provider, 'lingo.dev')
  assert.equal(lingoCalls.length, 2)
})
