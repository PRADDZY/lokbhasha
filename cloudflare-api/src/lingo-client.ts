import { LingoConfigurationError } from '../../analyze/src/errors'
import type { LingoClient } from '../../analyze/src/types'
import { getLingoApiKey, getLingoEngineId } from './env'
import type { CloudflareApiEnv } from './env'


const DEFAULT_LINGO_API_URL = 'https://engine.lingo.dev'

type FetchLike = typeof fetch

function buildHeaders(apiKey: string): HeadersInit {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>
}

export function createCloudflareLingoClient(
  env: CloudflareApiEnv,
  fetchImpl: FetchLike = fetch
): LingoClient {
  const apiKey = getLingoApiKey(env)
  if (!apiKey) {
    throw new LingoConfigurationError('LINGODOTDEV_API_KEY is required for translation and localization.')
  }

  const engineId = getLingoEngineId(env)
  const headers = buildHeaders(apiKey)

  return {
    runtime: {
      engineSelectionMode: engineId ? 'explicit' : 'implicit_default',
      engineId,
    },
    async recognizeLocale(text: string) {
      const response = await fetchImpl(`${DEFAULT_LINGO_API_URL}/process/recognize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error(`Error recognizing locale: ${response.status} ${response.statusText}`)
      }

      const payload = await readJson(response)
      const locale = payload.locale
      return typeof locale === 'string' ? locale : 'mr'
    },
    async localizeObject(payload, options) {
      const response = await fetchImpl(`${DEFAULT_LINGO_API_URL}/process/localize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          params: { fast: options.fast ?? false },
          sourceLocale: options.sourceLocale,
          targetLocale: options.targetLocale,
          data: payload,
          ...(options.hints ? { hints: options.hints } : {}),
          ...(engineId ? { engineId } : {}),
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Lingo localization failed with ${response.status}.`)
      }

      const jsonResponse = await readJson(response)
      const data = jsonResponse.data
      return (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
    },
  }
}
