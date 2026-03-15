import path from 'node:path'


const DEFAULT_TARGET_LOCALES = ['hi', 'gu']

export function getExtractionBackendUrl(): string {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:5000'
  ).replace(/\/$/, '')
}

export function getGlossaryDatabasePath(): string {
  return process.env.GLOSSARY_DB_PATH || path.resolve(process.cwd(), '..', 'sqlite', 'glossary.sqlite3')
}

export function getTargetLocales(): string[] {
  const configuredLocales = process.env.LINGODOTDEV_TARGET_LOCALES || process.env.LINGO_DEV_TARGET_LOCALES
  if (!configuredLocales) {
    return DEFAULT_TARGET_LOCALES
  }

  const locales = configuredLocales
    .split(',')
    .map((locale) => locale.trim())
    .filter(Boolean)

  return locales.length ? locales : DEFAULT_TARGET_LOCALES
}

export function getLingoApiKey(): string {
  return (
    process.env.LINGODOTDEV_API_KEY ||
    process.env.LINGO_DEV_API_KEY ||
    ''
  ).trim()
}
