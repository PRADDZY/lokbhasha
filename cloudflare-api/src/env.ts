import type { D1LikeDatabase } from './d1-types'


export type CloudflareApiEnv = {
  GLOSSARY_DB: D1LikeDatabase
  CORS_ALLOWED_ORIGINS?: string
  LINGODOTDEV_API_KEY?: string
  LINGODOTDEV_ENGINE_ID?: string
  LINGODOTDEV_TARGET_LOCALES?: string
  LINGO_BRAND_VOICE_COUNT?: string
  LINGO_INSTRUCTION_COUNT?: string
  LINGO_SCORER_COUNT?: string
  GLOSSARY_SOURCE_PATH?: string
  GLOSSARY_SOURCE_FORMAT?: 'english_to_marathi_list' | 'marathi_to_english_map'
  GLOSSARY_LAST_SYNC_AT?: string
  GLOSSARY_REMOTE_TERM_COUNT?: string
  GLOSSARY_AUTHORITATIVE_ENGINE_ID?: string
  GLOSSARY_AUTHORITATIVE_ENGINE_NAME?: string
}

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000']
const DEFAULT_TARGET_LOCALES = [
  'as',
  'bn',
  'brx',
  'doi',
  'gu',
  'hi',
  'kn',
  'ks',
  'kok',
  'mai',
  'ml',
  'mni',
  'ne',
  'or',
  'pa',
  'sa',
  'sat',
  'sd',
  'ta',
  'te',
  'ur',
]

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) {
    return ''
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return withProtocol.replace(/\/$/, '')
}

export function getAllowedOrigins(env: CloudflareApiEnv): string[] {
  const configured = env.CORS_ALLOWED_ORIGINS?.trim()
  if (!configured) {
    return DEFAULT_ALLOWED_ORIGINS
  }

  const origins = configured
    .split(',')
    .map((origin) => normalizeBaseUrl(origin))
    .filter(Boolean)

  return origins.length ? origins : DEFAULT_ALLOWED_ORIGINS
}

export function getConfiguredTargetLocales(env: CloudflareApiEnv): string[] {
  const configured = (env.LINGODOTDEV_TARGET_LOCALES || '').trim()
  if (!configured) {
    return DEFAULT_TARGET_LOCALES
  }

  const locales = configured
    .split(',')
    .map((locale) => locale.trim())
    .filter(Boolean)

  return locales.length ? locales : DEFAULT_TARGET_LOCALES
}

export function getConfiguredBrandVoiceCount(env: CloudflareApiEnv): number {
  const parsed = Number.parseInt(env.LINGO_BRAND_VOICE_COUNT || '0', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function getConfiguredInstructionCount(env: CloudflareApiEnv): number {
  const parsed = Number.parseInt(env.LINGO_INSTRUCTION_COUNT || '0', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function getConfiguredScorerCount(env: CloudflareApiEnv): number {
  const parsed = Number.parseInt(env.LINGO_SCORER_COUNT || '0', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function getLingoApiKey(env: CloudflareApiEnv): string {
  return (env.LINGODOTDEV_API_KEY || '').trim()
}

export function getLingoEngineId(env: CloudflareApiEnv): string | null {
  const configured = (env.LINGODOTDEV_ENGINE_ID || '').trim()
  return configured || null
}
