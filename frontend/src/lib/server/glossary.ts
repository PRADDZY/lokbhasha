import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

import type { GlossaryHit } from './types'


const DEVANAGARI_PATTERN = /[\u0900-\u097F]+/gu
const WHITESPACE_PATTERN = /\s+/g
const DEFAULT_RUNTIME_TOKEN_LIMIT = 5
const DATABASES_BY_PATH = new Map<string, Database.Database>()
const REQUIRED_GLOSSARY_TABLES = ['glossary_terms', 'glossary_metadata'] as const

type TokenSpan = {
  text: string
  normalized: string
  start: number
  end: number
}

type CandidateOccurrence = {
  normalizedTerm: string
  startTokenIndex: number
  endTokenIndex: number
  start: number
  end: number
}

type GlossaryRow = {
  marathi_term: string
  normalized_term: string
  english_term: string
}

export class GlossaryDatabaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GlossaryDatabaseError'
  }
}

export function normalizeMarathiTerm(term: string): string {
  return term
    .trim()
    .replace(WHITESPACE_PATTERN, ' ')
    .split('\u200c')
    .join('')
    .split('\u200d')
    .join('')
}

function tokenizeMarathiText(text: string): TokenSpan[] {
  const matches = text.matchAll(DEVANAGARI_PATTERN)
  return Array.from(matches, (match) => ({
    text: match[0],
    normalized: normalizeMarathiTerm(match[0]),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }))
}

function assertGlossarySchema(database: Database.Database, databasePath: string) {
  const rows = database
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN (${REQUIRED_GLOSSARY_TABLES.map(() => '?').join(', ')})
      `
    )
    .all(...REQUIRED_GLOSSARY_TABLES) as Array<{ name: string }>
  const tableNames = new Set(rows.map((row) => row.name))
  const missingTables = REQUIRED_GLOSSARY_TABLES.filter((tableName) => !tableNames.has(tableName))
  if (missingTables.length) {
    throw new GlossaryDatabaseError(
      `Glossary database at ${databasePath} is missing required glossary schema: ${missingTables.join(', ')}.`
    )
  }

  const metadataRow = database
    .prepare("SELECT value FROM glossary_metadata WHERE key = 'realtime_token_limit'")
    .get() as { value?: string } | undefined
  if (!metadataRow?.value) {
    throw new GlossaryDatabaseError(
      `Glossary database at ${databasePath} is missing required glossary metadata: realtime_token_limit.`
    )
  }
}

export function openGlossaryDatabase(databasePath: string) {
  const resolvedPath = path.resolve(databasePath)
  const existingDatabase = DATABASES_BY_PATH.get(resolvedPath)
  if (existingDatabase) {
    return existingDatabase
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new GlossaryDatabaseError(
      `Glossary database not found at ${resolvedPath}. Set GLOSSARY_DB_PATH to a valid SQLite glossary artifact.`
    )
  }

  let database: Database.Database
  try {
    database = new Database(resolvedPath, { readonly: true })
  } catch {
    throw new GlossaryDatabaseError(
      `Glossary database at ${resolvedPath} could not be opened. Ensure GLOSSARY_DB_PATH points to a readable SQLite file.`
    )
  }

  try {
    assertGlossarySchema(database, resolvedPath)
  } catch (error) {
    database.close()
    throw error
  }

  DATABASES_BY_PATH.set(resolvedPath, database)
  return database
}

function getRuntimeTokenLimit(database: Database.Database): number {
  const row = database
    .prepare("SELECT value FROM glossary_metadata WHERE key = 'realtime_token_limit'")
    .get() as { value?: string } | undefined
  const parsedLimit = Number.parseInt(row?.value ?? '', 10)
  return Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_RUNTIME_TOKEN_LIMIT
}

function queryExactMatches(
  database: Database.Database,
  normalizedTerms: string[]
): Map<string, GlossaryRow> {
  if (!normalizedTerms.length) {
    return new Map()
  }

  const placeholders = normalizedTerms.map(() => '?').join(', ')
  const rows = database
    .prepare(
      `
        SELECT marathi_term, normalized_term, english_term
        FROM glossary_terms
        WHERE is_realtime = 1
          AND normalized_term IN (${placeholders})
      `
    )
    .all(...normalizedTerms) as GlossaryRow[]

  return new Map(rows.map((row) => [row.normalized_term, row]))
}

export function detectGlossaryHits(
  text: string,
  options?: {
    databasePath?: string
  }
): GlossaryHit[] {
  const normalizedText = normalizeMarathiTerm(text)
  if (!normalizedText) {
    return []
  }

  const databasePath = options?.databasePath ?? path.resolve(process.cwd(), '..', 'dict', 'glossary.sqlite3')
  const database = openGlossaryDatabase(databasePath)
  const tokens = tokenizeMarathiText(text)
  if (!tokens.length) {
    return []
  }

  const runtimeTokenLimit = Math.max(1, getRuntimeTokenLimit(database))
  const occupiedTokenIndexes = new Set<number>()
  const hits: GlossaryHit[] = []

  for (let tokenLength = runtimeTokenLimit; tokenLength >= 1; tokenLength -= 1) {
    const candidateMap = new Map<string, CandidateOccurrence[]>()

    for (let startTokenIndex = 0; startTokenIndex <= tokens.length - tokenLength; startTokenIndex += 1) {
      const endTokenIndex = startTokenIndex + tokenLength - 1
      const normalizedTerm = normalizeMarathiTerm(
        tokens.slice(startTokenIndex, endTokenIndex + 1).map((token) => token.text).join(' ')
      )
      const occurrences = candidateMap.get(normalizedTerm) ?? []
      occurrences.push({
        normalizedTerm,
        startTokenIndex,
        endTokenIndex,
        start: tokens[startTokenIndex].start,
        end: tokens[endTokenIndex].end,
      })
      candidateMap.set(normalizedTerm, occurrences)
    }

    const exactMatches = queryExactMatches(database, [...candidateMap.keys()])
    for (const [normalizedTerm, occurrences] of candidateMap) {
      const row = exactMatches.get(normalizedTerm)
      if (!row) {
        continue
      }

      for (const occurrence of occurrences) {
        let overlapsExistingHit = false
        for (let tokenIndex = occurrence.startTokenIndex; tokenIndex <= occurrence.endTokenIndex; tokenIndex += 1) {
          if (occupiedTokenIndexes.has(tokenIndex)) {
            overlapsExistingHit = true
            break
          }
        }

        if (overlapsExistingHit) {
          continue
        }

        for (let tokenIndex = occurrence.startTokenIndex; tokenIndex <= occurrence.endTokenIndex; tokenIndex += 1) {
          occupiedTokenIndexes.add(tokenIndex)
        }

        hits.push({
          canonicalTerm: row.marathi_term,
          matchedText: text.slice(occurrence.start, occurrence.end),
          meaning: row.english_term,
          start: occurrence.start,
          end: occurrence.end,
          matchType: 'exact',
          confidence: 1,
        })
      }
    }
  }

  return hits.sort((left, right) => left.start - right.start)
}

export function buildTerminologyHints(
  glossaryHits: GlossaryHit[],
  maxHints = 12
): Record<string, string[]> {
  const hints = new Map<string, string[]>()

  for (const hit of glossaryHits) {
    if (hints.has(hit.canonicalTerm)) {
      continue
    }

    hints.set(hit.canonicalTerm, [hit.meaning])
    if (hints.size >= maxHints) {
      break
    }
  }

  return Object.fromEntries(hints)
}
