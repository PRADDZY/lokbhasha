import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { analyzeMarathiDocument } from './analysis'
import { getAnalyzeErrorStatus, handleAnalyzeFormData } from './analyze-route'
import { getAllowedOrigins, getAnalyzePort, getGlossaryDatabasePath, getTargetLocales } from './config'
import { extractPdfText } from './extraction'
import { detectGlossaryHits } from './glossary'
import { createLingoClient } from './lingo'
import type { AnalysisResult } from './types'


type AnalyzeRequestHandler = (formData: FormData) => Promise<AnalysisResult>

type AnalyzeServerDependencies = {
  handleAnalyzeRequest?: AnalyzeRequestHandler
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
  const targetLocales = getTargetLocales()

  return (formData) =>
    handleAnalyzeFormData(formData, {
      extractPdfText,
      analyzeMarathiDocument: (input) =>
        analyzeMarathiDocument(input, {
          detectGlossaryHits: (text) =>
            detectGlossaryHits(text, { databasePath: getGlossaryDatabasePath() }),
          lingoClient,
          targetLocales,
        }),
    })
}

export function buildAnalyzeServer(dependencies: AnalyzeServerDependencies = {}): FastifyInstance {
  const server = Fastify({ logger: false })
  const handleAnalyzeRequest = dependencies.handleAnalyzeRequest ?? createAnalyzeRequestHandler()

  server.register(cors, {
    origin: getAllowedOrigins(),
    credentials: true,
  })
  server.register(multipart)

  server.get('/health', async () => ({ status: 'ok' }))

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
    console.error(error)
    process.exit(1)
  })
}
