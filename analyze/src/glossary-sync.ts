import { createHash } from 'node:crypto'
import fs from 'node:fs'

import { getGlossaryDatabasePath, getGlossarySyncSnapshotPath } from './config'
import { openGlossaryDatabase } from './glossary'
import type { GlossarySyncStatus, LingoGlossaryEntry } from './types'


type GlossaryRow = {
  marathi: string
  english: string
}

type GlossarySummary = {
  totalTerms: number
  customTranslationTerms: number
  nonTranslatableTerms: number
  previewEntries: LingoGlossaryEntry[]
}

type GlossarySyncSnapshot = {
  version: 1
  source: 'sqlite'
  sourceLocale: string
  targetLocale: string
  sourceHash: string
  totalTerms: number
  customTranslationTerms: number
  nonTranslatableTerms: number
  preparedAt: string
  previewEntries: LingoGlossaryEntry[]
}

const DEFAULT_SOURCE_LOCALE = 'mr'
const DEFAULT_TARGET_LOCALE = 'en'
const DEFAULT_PREVIEW_LIMIT = 5

export function mapGlossaryRowToLingoEntry(
  row: GlossaryRow,
  sourceLocale = DEFAULT_SOURCE_LOCALE,
  targetLocale = DEFAULT_TARGET_LOCALE
): LingoGlossaryEntry {
  const isNonTranslatable = row.marathi === row.english

  return {
    sourceLocale,
    targetLocale,
    sourceText: row.marathi,
    targetText: row.english,
    type: isNonTranslatable ? 'non_translatable' : 'custom_translation',
    hint: null,
  }
}

function computeFileHash(filePath: string): string {
  const hash = createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function getGlossarySummary(databasePath: string, previewLimit = DEFAULT_PREVIEW_LIMIT): GlossarySummary {
  const database = openGlossaryDatabase(databasePath)

  const totalTerms = Number(
    (database.prepare('SELECT COUNT(*) AS count FROM glossary').get() as { count: number }).count
  )
  const nonTranslatableTerms = Number(
    (
      database
        .prepare('SELECT COUNT(*) AS count FROM glossary WHERE marathi = english')
        .get() as { count: number }
    ).count
  )
  const previewRows = database
    .prepare(
      `
        SELECT marathi, english
        FROM glossary
        ORDER BY marathi
        LIMIT ?
      `
    )
    .all(previewLimit) as GlossaryRow[]

  return {
    totalTerms,
    customTranslationTerms: totalTerms - nonTranslatableTerms,
    nonTranslatableTerms,
    previewEntries: previewRows.map((row) => mapGlossaryRowToLingoEntry(row)),
  }
}

function readGlossarySyncSnapshot(snapshotPath: string): GlossarySyncSnapshot | null {
  if (!fs.existsSync(snapshotPath)) {
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as GlossarySyncSnapshot
  } catch {
    return null
  }
}

export function buildGlossarySyncSnapshot(options?: {
  databasePath?: string
  preparedAt?: string
  previewLimit?: number
}): GlossarySyncSnapshot {
  const databasePath = options?.databasePath ?? getGlossaryDatabasePath()
  const summary = getGlossarySummary(databasePath, options?.previewLimit)

  return {
    version: 1,
    source: 'sqlite',
    sourceLocale: DEFAULT_SOURCE_LOCALE,
    targetLocale: DEFAULT_TARGET_LOCALE,
    sourceHash: computeFileHash(databasePath),
    totalTerms: summary.totalTerms,
    customTranslationTerms: summary.customTranslationTerms,
    nonTranslatableTerms: summary.nonTranslatableTerms,
    preparedAt: options?.preparedAt ?? new Date().toISOString(),
    previewEntries: summary.previewEntries,
  }
}

export function getGlossarySyncStatus(options?: {
  databasePath?: string
  snapshotPath?: string
  previewLimit?: number
}): GlossarySyncStatus {
  const databasePath = options?.databasePath ?? getGlossaryDatabasePath()
  const snapshotPath = options?.snapshotPath ?? getGlossarySyncSnapshotPath()
  const summary = getGlossarySummary(databasePath, options?.previewLimit)
  const currentHash = computeFileHash(databasePath)
  const snapshot = readGlossarySyncSnapshot(snapshotPath)

  return {
    source: 'sqlite',
    sourceLocale: DEFAULT_SOURCE_LOCALE,
    targetLocale: DEFAULT_TARGET_LOCALE,
    syncState: snapshot
      ? snapshot.sourceHash === currentHash
        ? 'ready'
        : 'drift'
      : 'missing',
    totalTerms: summary.totalTerms,
    customTranslationTerms: summary.customTranslationTerms,
    nonTranslatableTerms: summary.nonTranslatableTerms,
    packageHash: currentHash,
    lastSyncedAt: snapshot?.preparedAt ?? null,
    fallbackMode: 'compact_request_hints',
    previewEntries: summary.previewEntries,
  }
}
