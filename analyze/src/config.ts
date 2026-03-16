import path from 'node:path'


const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000']
const DEFAULT_ANALYZE_PORT = 5001
const DEFAULT_CONFIGURED_TARGET_LOCALES = [
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

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  return withProtocol.replace(/\/$/, '')
}

export function getAnalyzePort(): number {
  const configured = process.env.PORT || process.env.ANALYZE_PORT || String(DEFAULT_ANALYZE_PORT)
  const parsed = Number.parseInt(configured, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ANALYZE_PORT
}

export function getAllowedOrigins(): string[] {
  const configured = process.env.CORS_ALLOWED_ORIGINS?.trim()
  if (!configured) {
    return DEFAULT_ALLOWED_ORIGINS
  }

  const origins = configured
    .split(',')
    .map((origin) => normalizeBaseUrl(origin))
    .filter(Boolean)

  return origins.length ? origins : DEFAULT_ALLOWED_ORIGINS
}

export function getExtractionBackendUrl(): string {
  return normalizeBaseUrl(
    process.env.EXTRACT_BACKEND_URL ||
    process.env.BACKEND_URL ||
    'http://localhost:5000'
  )
}

export function getGlossaryDatabasePath(): string {
  return process.env.GLOSSARY_DB_PATH || path.resolve(process.cwd(), '..', 'sqlite', 'glossary.sqlite3')
}

export function getGlossarySyncSnapshotPath(): string {
  return process.env.GLOSSARY_SYNC_SNAPSHOT_PATH || path.resolve(process.cwd(), '..', 'sqlite', 'lingo-glossary-sync.json')
}

export function getLingoApiKey(): string {
  return (process.env.LINGODOTDEV_API_KEY || process.env.LINGO_DEV_API_KEY || '').trim()
}

export function getConfiguredTargetLocales(): string[] {
  const configured = (process.env.LINGODOTDEV_TARGET_LOCALES || '').trim()
  if (!configured) {
    return DEFAULT_CONFIGURED_TARGET_LOCALES
  }

  const locales = configured
    .split(',')
    .map((locale) => locale.trim())
    .filter(Boolean)

  return locales.length ? locales : DEFAULT_CONFIGURED_TARGET_LOCALES
}
