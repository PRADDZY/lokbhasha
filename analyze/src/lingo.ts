import { LingoDotDevEngine } from 'lingo.dev/sdk'

import { getLingoApiKey, getLingoEngineId } from './config'
import { LingoConfigurationError } from './errors'
import type { LingoClient } from './types'


let cachedClient: LingoClient | null = null

export function createLingoClient(): LingoClient {
  if (cachedClient) {
    return cachedClient
  }

  const apiKey = getLingoApiKey()
  if (!apiKey) {
    throw new LingoConfigurationError('LINGODOTDEV_API_KEY is required for translation and localization.')
  }

  const engineId = getLingoEngineId()
  const engine = new LingoDotDevEngine({
    apiKey,
    ...(engineId ? { engineId } : {}),
  })
  cachedClient = {
    runtime: {
      engineSelectionMode: engineId ? 'explicit' : 'implicit_default',
      engineId,
    },
    recognizeLocale: (text) => engine.recognizeLocale(text) as Promise<string>,
    localizeObject: (payload, options) =>
      engine.localizeObject(payload, {
        sourceLocale: options.sourceLocale as never,
        targetLocale: options.targetLocale as never,
        fast: options.fast,
        hints: options.hints,
      }) as Promise<Record<string, unknown>>,
  }
  return cachedClient
}
