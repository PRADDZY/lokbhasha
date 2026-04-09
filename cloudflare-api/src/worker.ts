import {
  analyzeMarathiDocument,
  buildBaselineComparison,
  generateAnalysisEnrichment,
} from '../../analyze/src/analysis'
import {
  getAnalyzeErrorStatus,
  handleAnalyzeFormData,
  handleBaselineCompareRequest,
  handleEnrichRequest,
} from '../../analyze/src/analyze-route'
import type {
  AnalysisComparisonRequest,
  AnalysisComparisonResult,
  AnalysisCoreResult,
  AnalysisEnrichmentResult,
  GlossarySyncStatus,
  LingoSetupSummary,
  QualitySummary,
} from '../../analyze/src/types'
import { getAllowedOrigins } from './env'
import type { CloudflareApiEnv } from './env'
import { detectGlossaryHitsFromD1 } from './d1-glossary'
import { createCloudflareLingoClient } from './lingo-client'
import {
  getCloudflareGlossaryStatus,
  getCloudflareLingoSetup,
  getCloudflareQualitySummary,
} from './status'


type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null

type WorkerHandlerDependencies = {
  fetchImpl?: typeof fetch
}

function buildCorsHeaders(origin: string | null, env: CloudflareApiEnv): Headers {
  const headers = new Headers()
  const allowedOrigins = getAllowedOrigins(env)
  const allowAllOrigins = allowedOrigins.includes('*')
  const allowedOrigin = origin && (allowAllOrigins || allowedOrigins.includes(origin))
    ? origin
    : allowedOrigins[0] ?? '*'

  headers.set('access-control-allow-origin', allowedOrigin)
  headers.set('access-control-allow-methods', 'GET,POST,OPTIONS')
  headers.set('access-control-allow-headers', 'content-type')
  headers.set('access-control-max-age', '86400')
  return headers
}

function jsonResponse(
  request: Request,
  env: CloudflareApiEnv,
  payload: JsonValue,
  init?: ResponseInit
): Response {
  const headers = buildCorsHeaders(request.headers.get('origin'), env)
  headers.set('content-type', 'application/json')
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value)
    })
  }

  return new Response(JSON.stringify(payload), {
    status: init?.status ?? 200,
    headers,
  })
}

async function handleWorkerAnalyze(
  request: Request,
  env: CloudflareApiEnv,
  dependencies: WorkerHandlerDependencies
): Promise<AnalysisCoreResult> {
  const formData = await request.formData()
  const lingoClient = createCloudflareLingoClient(env, dependencies.fetchImpl)

  return handleAnalyzeFormData(formData, {
    extractPdfText: async () => {
      throw new Error('Upload PDFs through the Cloudflare frontend so they can be extracted in-browser.')
    },
    analyzeMarathiDocument: (input) =>
      analyzeMarathiDocument(input, {
        detectGlossaryHits: (text) => detectGlossaryHitsFromD1(env.GLOSSARY_DB, text),
        lingoClient,
      }),
  })
}

async function handleWorkerEnrich(
  request: Request,
  env: CloudflareApiEnv,
  dependencies: WorkerHandlerDependencies
): Promise<AnalysisEnrichmentResult> {
  const body = (await request.json().catch(() => null)) as
    | {
        englishCanonical?: string
        requestedLocales?: string[]
        includePlainExplanation?: boolean
        includeActions?: boolean
      }
    | null
  const lingoClient = createCloudflareLingoClient(env, dependencies.fetchImpl)

  return handleEnrichRequest(body, {
    generateAnalysisEnrichment: (input) =>
      generateAnalysisEnrichment(input, {
        lingoClient,
      }),
  })
}

async function handleWorkerBaselineCompare(
  request: Request,
  env: CloudflareApiEnv,
  dependencies: WorkerHandlerDependencies
): Promise<AnalysisComparisonResult> {
  const body = (await request.json().catch(() => null)) as Partial<AnalysisComparisonRequest> | null
  const lingoClient = createCloudflareLingoClient(env, dependencies.fetchImpl)

  return handleBaselineCompareRequest(body, {
    buildBaselineComparison: (input) =>
      buildBaselineComparison(input, {
        detectGlossaryHits: (text) => detectGlossaryHitsFromD1(env.GLOSSARY_DB, text),
        lingoClient,
      }),
  })
}

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/'
}

function maybeBuildStaticResponse(
  request: Request,
  env: CloudflareApiEnv,
  method: string,
  pathname: string
): Response | null {
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(request.headers.get('origin'), env),
    })
  }

  if (method === 'GET' && pathname === '/health') {
    return jsonResponse(request, env, { status: 'ok' })
  }

  if (method === 'GET' && pathname === '/analyze') {
    return jsonResponse(
      request,
      env,
      { detail: 'Use POST /analyze with extracted Marathi text or browser-prepared PDF content.' },
      { status: 405 }
    )
  }

  if (method === 'GET' && pathname === '/enrich') {
    return jsonResponse(
      request,
      env,
      { detail: 'Use POST /enrich with canonical English text and requested outputs.' },
      { status: 405 }
    )
  }

  if (method === 'GET' && pathname === '/quality/baseline-compare') {
    return jsonResponse(
      request,
      env,
      { detail: 'Use POST /quality/baseline-compare with Marathi text and canonical English.' },
      { status: 405 }
    )
  }

  if (method === 'GET' && pathname === '/extract') {
    return jsonResponse(
      request,
      env,
      { detail: 'Use the Cloudflare frontend for PDF extraction. The API accepts browser-prepared text.' },
      { status: 405 }
    )
  }

  return null
}

async function routeDynamicRequest(
  request: Request,
  env: CloudflareApiEnv,
  dependencies: WorkerHandlerDependencies
): Promise<Response> {
  const method = request.method.toUpperCase()
  const pathname = normalizePath(new URL(request.url).pathname)

  try {
    if (method === 'GET' && pathname === '/glossary-status') {
      const result: GlossarySyncStatus = await getCloudflareGlossaryStatus(env)
      return jsonResponse(request, env, result)
    }

    if (method === 'GET' && pathname === '/lingo-setup') {
      const result: LingoSetupSummary = await getCloudflareLingoSetup(env)
      return jsonResponse(request, env, result)
    }

    if (method === 'GET' && pathname === '/quality-summary') {
      const result: QualitySummary = await getCloudflareQualitySummary(env)
      return jsonResponse(request, env, result)
    }

    if (method === 'POST' && pathname === '/analyze') {
      const result = await handleWorkerAnalyze(request, env, dependencies)
      return jsonResponse(request, env, result)
    }

    if (method === 'POST' && pathname === '/enrich') {
      const result = await handleWorkerEnrich(request, env, dependencies)
      return jsonResponse(request, env, result)
    }

    if (method === 'POST' && pathname === '/quality/baseline-compare') {
      const result = await handleWorkerBaselineCompare(request, env, dependencies)
      return jsonResponse(request, env, result)
    }

    if (method === 'POST' && pathname === '/extract') {
      return jsonResponse(
        request,
        env,
        { detail: 'Upload PDFs through the Cloudflare frontend so they can be extracted in-browser.' },
        { status: 501 }
      )
    }
  } catch (error) {
    const status = getAnalyzeErrorStatus(error)
    const detail = status === 500
      ? 'Analysis failed.'
      : error instanceof Error
        ? error.message
        : 'Analysis failed.'
    return jsonResponse(request, env, { detail }, { status })
  }

  return jsonResponse(request, env, { detail: 'Not found.' }, { status: 404 })
}

export function createCloudflareWorker(dependencies: WorkerHandlerDependencies = {}) {
  return {
    async fetch(request: Request, env: CloudflareApiEnv): Promise<Response> {
      const pathname = normalizePath(new URL(request.url).pathname)
      const staticResponse = maybeBuildStaticResponse(request, env, request.method.toUpperCase(), pathname)
      if (staticResponse) {
        return staticResponse
      }

      return routeDynamicRequest(request, env, dependencies)
    },
  }
}

export default createCloudflareWorker()
