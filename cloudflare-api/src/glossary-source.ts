import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { LingoGlossaryEntry } from '../../analyze/src/types'


const ROOT_DIR = path.resolve(process.cwd(), '..')
export const DEFAULT_GLOSSARY_SOURCE_PATH = path.resolve(ROOT_DIR, 'dict', '19k.json')
const DEFAULT_SOURCE_LOCALE = 'mr'
const DEFAULT_TARGET_LOCALE = 'en'

type DictionaryListEntry = {
  word?: string
  meaning?: string
}

type DictionaryMapEntry = {
  mr?: string
  en?: string
}

export type NormalizedGlossaryEntry = LingoGlossaryEntry & {
  canonicalTerm: string
}

export type GlossarySeedPackage = {
  sourcePath: string
  sourceFormat: 'english_to_marathi_list' | 'marathi_to_english_map'
  sourceHash: string
  totalTerms: number
  customTranslationTerms: number
  nonTranslatableTerms: number
  entries: NormalizedGlossaryEntry[]
}

function normalizeTerm(term: string): string {
  return term
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\u200c/g, '')
    .replace(/\u200d/g, '')
}

function extractPrimaryMeaning(englishText: string): string {
  if (!englishText) {
    return ''
  }

  return englishText.split(';', 1)[0]?.trim().toLowerCase() ?? ''
}

function parseListEntry(entry: DictionaryListEntry): NormalizedGlossaryEntry | null {
  const sourceText = normalizeTerm(entry.meaning || '')
  const targetText = extractPrimaryMeaning(entry.word || '')
  if (!sourceText || !targetText) {
    return null
  }

  const type = sourceText === targetText ? 'non_translatable' : 'custom_translation'
  return {
    canonicalTerm: sourceText,
    sourceLocale: DEFAULT_SOURCE_LOCALE,
    targetLocale: DEFAULT_TARGET_LOCALE,
    sourceText,
    targetText,
    type,
    hint: null,
  }
}

function parseMapEntry(entryKey: string, entry: DictionaryMapEntry): NormalizedGlossaryEntry | null {
  const sourceText = normalizeTerm(entry.mr || entryKey)
  const targetText = extractPrimaryMeaning(entry.en || '')
  if (!sourceText || !targetText) {
    return null
  }

  const type = sourceText === targetText ? 'non_translatable' : 'custom_translation'
  return {
    canonicalTerm: sourceText,
    sourceLocale: DEFAULT_SOURCE_LOCALE,
    targetLocale: DEFAULT_TARGET_LOCALE,
    sourceText,
    targetText,
    type,
    hint: null,
  }
}

function readSourcePayload(sourcePath: string): unknown {
  return JSON.parse(fs.readFileSync(sourcePath, 'utf8')) as unknown
}

function computeHash(sourcePath: string): string {
  return createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex')
}

export function loadGlossarySeedPackage(sourcePath = DEFAULT_GLOSSARY_SOURCE_PATH): GlossarySeedPackage {
  const resolvedSourcePath = path.resolve(sourcePath)
  const payload = readSourcePayload(resolvedSourcePath)

  let entries: NormalizedGlossaryEntry[] = []
  let sourceFormat: 'english_to_marathi_list' | 'marathi_to_english_map' = 'english_to_marathi_list'

  if (Array.isArray(payload)) {
    entries = payload
      .map((entry) => parseListEntry(entry as DictionaryListEntry))
      .filter((entry): entry is NormalizedGlossaryEntry => entry !== null)
    sourceFormat = 'english_to_marathi_list'
  } else if (payload && typeof payload === 'object') {
    entries = Object.entries(payload as Record<string, DictionaryMapEntry>)
      .map(([entryKey, entry]) => parseMapEntry(entryKey, entry))
      .filter((entry): entry is NormalizedGlossaryEntry => entry !== null)
    sourceFormat = 'marathi_to_english_map'
  } else {
    throw new Error('Glossary source must be a JSON list or object.')
  }

  const nonTranslatableTerms = entries.filter((entry) => entry.type === 'non_translatable').length
  return {
    sourcePath: resolvedSourcePath,
    sourceFormat,
    sourceHash: computeHash(resolvedSourcePath),
    totalTerms: entries.length,
    customTranslationTerms: entries.length - nonTranslatableTerms,
    nonTranslatableTerms,
    entries,
  }
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''")
}

export function buildD1SeedSql(
  glossaryPackage: GlossarySeedPackage,
  options?: {
    preparedAt?: string
    sourceLabel?: string
  }
): string {
  const preparedAt = options?.preparedAt ?? new Date().toISOString()
  const metadataEntries = [
    ['source', 'government_19k'],
    ['source_path', options?.sourceLabel ?? 'dict/19k.json'],
    ['source_format', glossaryPackage.sourceFormat],
    ['source_locale', DEFAULT_SOURCE_LOCALE],
    ['target_locale', DEFAULT_TARGET_LOCALE],
    ['source_hash', glossaryPackage.sourceHash],
    ['prepared_at', preparedAt],
    ['total_terms', String(glossaryPackage.totalTerms)],
    ['custom_translation_terms', String(glossaryPackage.customTranslationTerms)],
    ['non_translatable_terms', String(glossaryPackage.nonTranslatableTerms)],
  ] as const

  const statements = [
    'PRAGMA foreign_keys = OFF;',
    'DROP TABLE IF EXISTS glossary;',
    'DROP TABLE IF EXISTS glossary_meta;',
    'CREATE TABLE glossary (marathi TEXT PRIMARY KEY, english TEXT NOT NULL);',
    'CREATE INDEX idx_marathi ON glossary(marathi);',
    'CREATE TABLE glossary_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);',
  ]

  for (const entry of glossaryPackage.entries) {
    statements.push(
      `INSERT INTO glossary (marathi, english) VALUES ('${escapeSqlString(entry.sourceText)}', '${escapeSqlString(entry.targetText)}');`
    )
  }

  for (const [key, value] of metadataEntries) {
    statements.push(
      `INSERT INTO glossary_meta (key, value) VALUES ('${escapeSqlString(key)}', '${escapeSqlString(value)}');`
    )
  }

  return `${statements.join('\n')}\n`
}
