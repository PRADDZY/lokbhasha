import { LingoDotDevEngine } from 'lingo.dev/sdk'

import { getLingoApiKey } from './config'
import type { LingoClient } from './types'


let cachedClient: LingoClient | null = null

export function createLingoClient(): LingoClient {
  if (cachedClient) {
    return cachedClient
  }

  const apiKey = getLingoApiKey()
  if (!apiKey) {
    throw new Error('LINGODOTDEV_API_KEY is required for translation and localization.')
  }

  const engine = new LingoDotDevEngine({ apiKey })
  cachedClient = {
    localizeText: (text, options) =>
      engine.localizeText(text, {
        sourceLocale: options.sourceLocale as never,
        targetLocale: options.targetLocale as never,
        fast: options.fast,
        hints: options.hints,
      }),
    batchLocalizeText: (text, options) =>
      engine.batchLocalizeText(text, {
        sourceLocale: options.sourceLocale as never,
        targetLocales: options.targetLocales as never,
        fast: options.fast,
      }),
  }
  return cachedClient
}
