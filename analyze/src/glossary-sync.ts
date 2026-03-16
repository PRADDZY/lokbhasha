import { createHash } from 'node:crypto'
import fs from 'node:fs'

import { getGlossaryDatabasePath, getGlossarySourcePath, getGlossarySyncSnapshotPath } from './config'
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
  version: 2
  source: 'government_19k'
  sourcePath: string
  sourceFormat: 'english_to_marathi_list' | 'marathi_to_english_map'
  sourceLocale: string
  targetLocale: string
  authority: 'lingo_mcp'
  detectionStore: 'sqlite'
  managementMode: 'mcp_only'
  sourceHash: string
  packageHash: string
  runtimeArtifactPath: string
  totalTerms: number
  customTranslationTerms: number
  nonTranslatableTerms: number
  preparedAt: string
  lastKnownMcpSyncAt: string | null
  engineId: string | null
  engineName: string | null
  remoteGlossaryTermCount: number | null
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

function detectSourceFormat(sourcePath: string): 'english_to_marathi_list' | 'marathi_to_english_map' {
  const payload = JSON.parse(fs.readFileSync(sourcePath, 'utf8')) as unknown

  if (Array.isArray(payload)) {
    return 'english_to_marathi_list'
  }

  return 'marathi_to_english_map'
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
  sourcePath?: string
  preparedAt?: string
  lastKnownMcpSyncAt?: string | null
  engineId?: string | null
  engineName?: string | null
  remoteGlossaryTermCount?: number | null
  previewLimit?: number
}): GlossarySyncSnapshot {
  const databasePath = options?.databasePath ?? getGlossaryDatabasePath()
  const sourcePath = options?.sourcePath ?? getGlossarySourcePath()
  const summary = getGlossarySummary(databasePath, options?.previewLimit)
  const resolvedDatabasePath = fs.realpathSync(databasePath)
  const resolvedSourcePath = fs.realpathSync(sourcePath)

  return {
    version: 2,
    source: 'government_19k',
    sourcePath: resolvedSourcePath,
    sourceFormat: detectSourceFormat(resolvedSourcePath),
    sourceLocale: DEFAULT_SOURCE_LOCALE,
    targetLocale: DEFAULT_TARGET_LOCALE,
    authority: 'lingo_mcp',
    detectionStore: 'sqlite',
    managementMode: 'mcp_only',
    sourceHash: computeFileHash(resolvedSourcePath),
    packageHash: computeFileHash(resolvedDatabasePath),
    runtimeArtifactPath: resolvedDatabasePath,
    totalTerms: summary.totalTerms,
    customTranslationTerms: summary.customTranslationTerms,
    nonTranslatableTerms: summary.nonTranslatableTerms,
    preparedAt: options?.preparedAt ?? new Date().toISOString(),
    lastKnownMcpSyncAt: options?.lastKnownMcpSyncAt ?? null,
    engineId: options?.engineId ?? null,
    engineName: options?.engineName ?? null,
    remoteGlossaryTermCount: options?.remoteGlossaryTermCount ?? null,
    previewEntries: summary.previewEntries,
  }
}

export function getGlossarySyncStatus(options?: {
  databasePath?: string
  sourcePath?: string
  snapshotPath?: string
  previewLimit?: number
}): GlossarySyncStatus {
  const databasePath = options?.databasePath ?? getGlossaryDatabasePath()
  const sourcePath = options?.sourcePath ?? getGlossarySourcePath()
  const snapshotPath = options?.snapshotPath ?? getGlossarySyncSnapshotPath()
  const summary = getGlossarySummary(databasePath, options?.previewLimit)
  const resolvedDatabasePath = fs.realpathSync(databasePath)
  const resolvedSourcePath = fs.realpathSync(sourcePath)
  const currentPackageHash = computeFileHash(resolvedDatabasePath)
  const currentSourceHash = computeFileHash(resolvedSourcePath)
  const snapshot = readGlossarySyncSnapshot(snapshotPath)
  const snapshotMatchesLocal = Boolean(
    snapshot &&
    snapshot.sourceHash === currentSourceHash &&
    snapshot.packageHash === currentPackageHash
  )
  const hasRecordedMcpSync = Boolean(snapshot?.lastKnownMcpSyncAt)
  const remoteCountMatches = snapshot?.remoteGlossaryTermCount === summary.totalTerms
  const syncState = !snapshot
    ? 'missing'
    : !snapshotMatchesLocal
      ? 'drift'
      : !hasRecordedMcpSync
        ? 'missing'
        : remoteCountMatches
          ? 'ready'
          : 'drift'

  return {
    source: 'government_19k',
    sourcePath: resolvedSourcePath,
    sourceFormat: detectSourceFormat(resolvedSourcePath),
    sourceLocale: DEFAULT_SOURCE_LOCALE,
    targetLocale: DEFAULT_TARGET_LOCALE,
    authority: 'lingo_mcp',
    detectionStore: 'sqlite',
    managementMode: 'mcp_only',
    syncState,
    totalTerms: summary.totalTerms,
    customTranslationTerms: summary.customTranslationTerms,
    nonTranslatableTerms: summary.nonTranslatableTerms,
    packageHash: currentPackageHash,
    runtimeArtifactPath: resolvedDatabasePath,
    lastPreparedAt: snapshot?.preparedAt ?? null,
    lastSyncedAt: snapshot?.lastKnownMcpSyncAt ?? null,
    authoritativeEngineId: snapshot?.engineId ?? null,
    authoritativeEngineName: snapshot?.engineName ?? null,
    remoteGlossaryTermCount: snapshot?.remoteGlossaryTermCount ?? null,
    fallbackMode: 'compact_request_hints',
    previewEntries: summary.previewEntries,
  }
}
