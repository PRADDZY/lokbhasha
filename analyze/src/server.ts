import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { analyzeMarathiDocument, generateAnalysisEnrichment } from './analysis'
import { getAnalyzeErrorStatus, handleAnalyzeFormData, handleEnrichRequest } from './analyze-route'
import { getAllowedOrigins, getAnalyzePort, getGlossaryDatabasePath } from './config'
import { extractPdfText } from './extraction'
import { detectGlossaryHits } from './glossary'
import { createLingoClient } from './lingo'
import type { AnalysisCoreResult, AnalysisEnrichmentResult } from './types'


type AnalyzeRequestHandler = (formData: FormData) => Promise<AnalysisCoreResult>
type EnrichRequestHandler = (
  body: {
    englishCanonical?: string
    requestedLocales?: string[]
    includePlainExplanation?: boolean
    includeActions?: boolean
  } | null | undefined
) => Promise<AnalysisEnrichmentResult>

type AnalyzeServerDependencies = {
  handleAnalyzeRequest?: AnalyzeRequestHandler
  handleEnrichRequest?: EnrichRequestHandler
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

export function buildAnalyzeServer(dependencies: AnalyzeServerDependencies = {}): FastifyInstance {
  const server = Fastify({ logger: false })
  const handleAnalyzeRequest = dependencies.handleAnalyzeRequest ?? createAnalyzeRequestHandler()
  const enrichRequestHandler = dependencies.handleEnrichRequest ?? createEnrichRequestHandler()

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

  server.post('/analyze', async (request, reply) => {
    try {
      const formData = await requestToFormData(request)
      const result = await handleAnalyzeRequest(formData)
      return reply.send(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed.'
      const status = getAnalyzeErrorStatus(error)
      return reply.code(status).send({ detail: message })
    }
  })

  server.post('/enrich', async (request, reply) => {
    try {
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
      const message = error instanceof Error ? error.message : 'Analysis failed.'
      const status = getAnalyzeErrorStatus(error)
      return reply.code(status).send({ detail: message })
    }
  })

  return server
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
    const message = error instanceof Error ? error.stack ?? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exit(1)
  })
}
