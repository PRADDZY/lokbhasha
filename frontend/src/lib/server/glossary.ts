import Database from 'better-sqlite3'
import path from 'node:path'

import type { GlossaryHit } from './types'


const DEVANAGARI_PATTERN = /[\u0900-\u097F]+/gu
const WHITESPACE_PATTERN = /\s+/g
const DEFAULT_RUNTIME_TOKEN_LIMIT = 5
const DATABASES_BY_PATH = new Map<string, Database.Database>()

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

function getGlossaryDatabase(databasePath: string) {
  const resolvedPath = path.resolve(databasePath)
  const existingDatabase = DATABASES_BY_PATH.get(resolvedPath)
  if (existingDatabase) {
    return existingDatabase
  }

  const database = new Database(resolvedPath, { readonly: true })
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
  const database = getGlossaryDatabase(databasePath)
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
