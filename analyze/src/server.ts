import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { analyzeMarathiDocument, buildBaselineComparison, generateAnalysisEnrichment } from './analysis'
import {
  getAnalyzeErrorStatus,
  handleAnalyzeFormData,
  handleBaselineCompareRequest,
  handleEnrichRequest,
} from './analyze-route'
import {
  getAllowedOrigins,
  getAnalyzePort,
  getGlossaryDatabasePath,
  getGlossarySourcePath,
  getGlossarySyncSnapshotPath,
} from './config'
import { extractPdfText } from './extraction'
import { detectGlossaryHits } from './glossary'
import { getGlossarySyncStatus } from './glossary-sync'
import { getLingoSetupSummary } from './lingo-setup'
import { getQualitySummary } from './quality-summary'
import { createLingoClient } from './lingo'
import type {
  AnalysisComparisonRequest,
  AnalysisComparisonResult,
  AnalysisCoreResult,
  AnalysisEnrichmentResult,
  GlossarySyncStatus,
  LingoSetupSummary,
  QualitySummary,
} from './types'


type AnalyzeRequestHandler = (formData: FormData) => Promise<AnalysisCoreResult>
type EnrichRequestHandler = (
  body: {
    englishCanonical?: string
    requestedLocales?: string[]
    includePlainExplanation?: boolean
    includeActions?: boolean
  } | null | undefined
) => Promise<AnalysisEnrichmentResult>
type BaselineCompareRequestHandler = (
  body: Partial<AnalysisComparisonRequest> | null | undefined
) => Promise<AnalysisComparisonResult>

type GlossaryStatusRequestHandler = () => Promise<GlossarySyncStatus> | GlossarySyncStatus
type LingoSetupRequestHandler = () => Promise<LingoSetupSummary> | LingoSetupSummary
type QualitySummaryRequestHandler = () => Promise<QualitySummary> | QualitySummary

type AnalyzeServerDependencies = {
  handleAnalyzeRequest?: AnalyzeRequestHandler
  handleEnrichRequest?: EnrichRequestHandler
  handleBaselineCompareRequest?: BaselineCompareRequestHandler
  handleGlossaryStatusRequest?: GlossaryStatusRequestHandler
  handleLingoSetupRequest?: LingoSetupRequestHandler
  handleQualitySummaryRequest?: QualitySummaryRequestHandler
}

async function requestToFormData(request: FastifyRequest): Promise<FormData> {
  const formData = new FormData()

  if (request.isMultipart()) {
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        const chunks: Buffer[] = []
        for await (const chunk of part.file) {
          chunks.push(Buffer.from(chunk))
        }
        const fileBuffer = Buffer.concat(chunks)
        const fileBytes = fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength
        ) as ArrayBuffer

        formData.append(
          part.fieldname,
          new File([fileBytes], part.filename || 'upload.pdf', {
            type: part.mimetype,
          })
        )
        continue
      }

      formData.append(part.fieldname, String(part.value))
    }

    return formData
  }

  const body = request.body as { marathiText?: string } | undefined
  if (typeof body?.marathiText === 'string') {
    formData.append('marathiText', body.marathiText)
  }

  return formData
}

export function createAnalyzeRequestHandler(): AnalyzeRequestHandler {
  const lingoClient = createLingoClient()

  return (formData) =>
    handleAnalyzeFormData(formData, {
      extractPdfText,
      analyzeMarathiDocument: (input) =>
        analyzeMarathiDocument(input, {
          detectGlossaryHits: (text) =>
            detectGlossaryHits(text, { databasePath: getGlossaryDatabasePath() }),
          lingoClient,
        }),
    })
}

export function createEnrichRequestHandler(): EnrichRequestHandler {
  const lingoClient = createLingoClient()

  return (body) =>
    handleEnrichRequest(body, {
      generateAnalysisEnrichment: (input) =>
        generateAnalysisEnrichment(input, {
          lingoClient,
        }),
    })
}

export function createBaselineCompareRequestHandler(): BaselineCompareRequestHandler {
  const lingoClient = createLingoClient()

  return (body) =>
    handleBaselineCompareRequest(body, {
      buildBaselineComparison: (input) =>
        buildBaselineComparison(input, {
          detectGlossaryHits: (text) =>
            detectGlossaryHits(text, { databasePath: getGlossaryDatabasePath() }),
          lingoClient,
        }),
    })
}

export function createGlossaryStatusRequestHandler(): GlossaryStatusRequestHandler {
  return () => getGlossarySyncStatus({
    databasePath: getGlossaryDatabasePath(),
    sourcePath: getGlossarySourcePath(),
  })
}

export function createLingoSetupRequestHandler(): LingoSetupRequestHandler {
  return () =>
    getLingoSetupSummary({
      databasePath: getGlossaryDatabasePath(),
      sourcePath: getGlossarySourcePath(),
    })
}

export function createQualitySummaryRequestHandler(): QualitySummaryRequestHandler {
  return () =>
    getQualitySummary({
      databasePath: getGlossaryDatabasePath(),
      snapshotPath: getGlossarySyncSnapshotPath(),
    })
}

export function buildAnalyzeServer(dependencies: AnalyzeServerDependencies = {}): FastifyInstance {
  const server = Fastify({ logger: false })
  let analyzeRequestHandler = dependencies.handleAnalyzeRequest
  let enrichRequestHandler = dependencies.handleEnrichRequest
  let baselineCompareRequestHandler = dependencies.handleBaselineCompareRequest
  let glossaryStatusRequestHandler = dependencies.handleGlossaryStatusRequest
  let lingoSetupRequestHandler = dependencies.handleLingoSetupRequest
  let qualitySummaryRequestHandler = dependencies.handleQualitySummaryRequest

  server.register(cors, {
    origin: getAllowedOrigins(),
    credentials: true,
  })
  server.register(multipart)

  server.get('/health', async () => ({ status: 'ok' }))

  server.get('/analyze', async (_, reply) => {
    return reply.code(405).send({
      detail: 'Use POST /analyze with multipart form data or Marathi text.',
    })
  })

  server.get('/enrich', async (_, reply) => {
    return reply.code(405).send({
      detail: 'Use POST /enrich with canonical English text and requested outputs.',
    })
  })

  server.get('/quality/baseline-compare', async (_, reply) => {
    return reply.code(405).send({
      detail: 'Use POST /quality/baseline-compare with Marathi text and canonical English.',
    })
  })

  server.get('/glossary-status', async (_, reply) => {
    try {
      glossaryStatusRequestHandler ??= createGlossaryStatusRequestHandler()
      const result = await glossaryStatusRequestHandler()
      return reply.send(result)
    } catch (error) {
      const status = getAnalyzeErrorStatus(error)
      const message = status === 500
        ? 'Analysis failed.'
        : error instanceof Error
          ? error.message
          : 'Analysis failed.'
      return reply.code(status).send({ detail: message })
    }
  })

  server.get('/lingo-setup', async (_, reply) => {
    try {
      lingoSetupRequestHandler ??= createLingoSetupRequestHandler()
      const result = await lingoSetupRequestHandler()
      return reply.send(result)
    } catch (error) {
      const status = getAnalyzeErrorStatus(error)
      const message = status === 500
        ? 'Analysis failed.'
        : error instanceof Error
          ? error.message
          : 'Analysis failed.'
      return reply.code(status).send({ detail: message })
    }
  })

  server.get('/quality-summary', async (_, reply) => {
    try {
      qualitySummaryRequestHandler ??= createQualitySummaryRequestHandler()
      const result = await qualitySummaryRequestHandler()
      return reply.send(result)
    } catch (error) {
      const status = getAnalyzeErrorStatus(error)
      const message = status === 500
        ? 'Analysis failed.'
        : error instanceof Error
          ? error.message
          : 'Analysis failed.'
      return reply.code(status).send({ detail: message })
    }
  })

  server.post('/analyze', async (request, reply) => {
    try {
      analyzeRequestHandler ??= createAnalyzeRequestHandler()
      const formData = await requestToFormData(request)
      const result = await analyzeRequestHandler(formData)
      return reply.send(result)
    } catch (error) {
      const status = getAnalyzeErrorStatus(error)
      const message = status === 500
        ? 'Analysis failed.'
        : error instanceof Error
          ? error.message
          : 'Analysis failed.'
      return reply.code(status).send({ detail: message })
    }
  })

  server.post('/enrich', async (request, reply) => {
    try {
      enrichRequestHandler ??= createEnrichRequestHandler()
      const result = await enrichRequestHandler(
        (request.body as {
          englishCanonical?: string
          requestedLocales?: string[]
          includePlainExplanation?: boolean
          includeActions?: boolean
        } | null) ?? null
      )
      return reply.send(result)
    } catch (error) {
      const status = getAnalyzeErrorStatus(error)
      const message = status === 500
        ? 'Analysis failed.'
        : error instanceof Error
          ? error.message
          : 'Analysis failed.'
      return reply.code(status).send({ detail: message })
    }
  })

  server.post('/quality/baseline-compare', async (request, reply) => {
    try {
      baselineCompareRequestHandler ??= createBaselineCompareRequestHandler()
      const result = await baselineCompareRequestHandler(
        (request.body as Partial<AnalysisComparisonRequest> | null) ?? null
      )
      return reply.send(result)
    } catch (error) {
      const status = getAnalyzeErrorStatus(error)
      const message = status === 500
        ? 'Analysis failed.'
        : error instanceof Error
          ? error.message
          : 'Analysis failed.'
      return reply.code(status).send({ detail: message })
    }
  })

  return server
}

export function getStartupFailureMessage(_error: unknown): string {
  return 'Analyze service failed to start.'
}

export async function startAnalyzeServer() {
  const server = buildAnalyzeServer()
  await server.listen({
    host: '0.0.0.0',
    port: getAnalyzePort(),
  })
  return server
}

const currentFilePath = fileURLToPath(import.meta.url)
const entryPointPath = process.argv[1] ? path.resolve(process.argv[1]) : ''

if (entryPointPath === currentFilePath) {
  startAnalyzeServer().catch((error) => {
    process.stderr.write(`${getStartupFailureMessage(error)}\n`)
    process.exit(1)
  })
}
