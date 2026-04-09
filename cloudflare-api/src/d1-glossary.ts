import { GlossaryDatabaseError } from '../../analyze/src/errors'
import type { GlossaryHit, LingoGlossaryEntry } from '../../analyze/src/types'
import type { D1LikeDatabase } from './d1-types'


const DEVANAGARI_PATTERN = /[\u0900-\u097F]+/gu
const DEFAULT_RUNTIME_TOKEN_LIMIT = 5

type TokenSpan = {
  normalized: string
  start: number
  end: number
}

type CandidateOccurrence = {
  startTokenIndex: number
  endTokenIndex: number
  start: number
  end: number
}

type GlossaryRow = {
  marathi: string
  english: string
}

type GlossaryMetaRow = {
  value: string
}

export type D1GlossarySummary = {
  totalTerms: number
  customTranslationTerms: number
  nonTranslatableTerms: number
  previewEntries: LingoGlossaryEntry[]
  sourcePath: string
  sourceFormat: 'english_to_marathi_list' | 'marathi_to_english_map'
  preparedAt: string | null
}

export function normalizeMarathiTerm(term: string): string {
  return term
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\u200c/g, '')
    .replace(/\u200d/g, '')
}

function tokenizeMarathiText(text: string): TokenSpan[] {
  const matches = text.matchAll(DEVANAGARI_PATTERN)
  return Array.from(matches, (match) => ({
    normalized: normalizeMarathiTerm(match[0]),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }))
}

async function readMetaValue(database: D1LikeDatabase, key: string): Promise<string | null> {
  const row = await database
    .prepare('SELECT value FROM glossary_meta WHERE key = ?')
    .bind(key)
    .first<GlossaryMetaRow>()

  return row?.value ?? null
}

async function assertGlossarySchema(database: D1LikeDatabase) {
  const tableRow = await database
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name = ?
      `
    )
    .bind('glossary')
    .first<{ name?: string }>()

  if (!tableRow?.name) {
    throw new GlossaryDatabaseError('Cloudflare D1 glossary binding is missing the glossary table.')
  }

  const indexRow = await database
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'index'
          AND name = ?
      `
    )
    .bind('idx_marathi')
    .first<{ name?: string }>()

  if (!indexRow?.name) {
    throw new GlossaryDatabaseError('Cloudflare D1 glossary binding is missing the idx_marathi index.')
  }
}

async function queryExactMatches(
  database: D1LikeDatabase,
  normalizedTerms: string[]
): Promise<Map<string, GlossaryRow>> {
  if (!normalizedTerms.length) {
    return new Map()
  }

  const placeholders = normalizedTerms.map(() => '?').join(', ')
  const rows = await database
    .prepare(
      `
        SELECT marathi, english
        FROM glossary
        WHERE marathi IN (${placeholders})
      `
    )
    .bind(...normalizedTerms)
    .all<GlossaryRow>()

  return new Map(rows.results.map((row) => [row.marathi, row]))
}

export async function detectGlossaryHitsFromD1(
  database: D1LikeDatabase,
  text: string
): Promise<GlossaryHit[]> {
  const normalizedText = normalizeMarathiTerm(text)
  if (!normalizedText) {
    return []
  }

  await assertGlossarySchema(database)

  const tokens = tokenizeMarathiText(text)
  if (!tokens.length) {
    return []
  }

  const occupiedTokenIndexes = new Set<number>()
  const hits: GlossaryHit[] = []

  for (let tokenLength = DEFAULT_RUNTIME_TOKEN_LIMIT; tokenLength >= 1; tokenLength -= 1) {
    const candidateMap = new Map<string, CandidateOccurrence[]>()

    for (let startTokenIndex = 0; startTokenIndex <= tokens.length - tokenLength; startTokenIndex += 1) {
      const endTokenIndex = startTokenIndex + tokenLength - 1
      const normalizedTerm = normalizeMarathiTerm(
        tokens.slice(startTokenIndex, endTokenIndex + 1).map((token) => token.normalized).join(' ')
      )
      const occurrences = candidateMap.get(normalizedTerm) ?? []
      occurrences.push({
        startTokenIndex,
        endTokenIndex,
        start: tokens[startTokenIndex].start,
        end: tokens[endTokenIndex].end,
      })
      candidateMap.set(normalizedTerm, occurrences)
    }

    const exactMatches = await queryExactMatches(database, [...candidateMap.keys()])
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
          canonicalTerm: row.marathi,
          matchedText: text.slice(occurrence.start, occurrence.end),
          meaning: row.english,
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

export async function getD1GlossarySummary(database: D1LikeDatabase): Promise<D1GlossarySummary> {
  await assertGlossarySchema(database)

  const totalTermsRow = await database
    .prepare('SELECT COUNT(*) AS count FROM glossary')
    .first<{ count: number }>()
  const nonTranslatableTermsRow = await database
    .prepare('SELECT COUNT(*) AS count FROM glossary WHERE marathi = english')
    .first<{ count: number }>()
  const previewRows = await database
    .prepare(
      `
        SELECT marathi, english
        FROM glossary
        ORDER BY marathi
        LIMIT 5
      `
    )
    .all<GlossaryRow>()

  const totalTerms = Number(totalTermsRow?.count ?? 0)
  const nonTranslatableTerms = Number(nonTranslatableTermsRow?.count ?? 0)

  return {
    totalTerms,
    customTranslationTerms: totalTerms - nonTranslatableTerms,
    nonTranslatableTerms,
    previewEntries: previewRows.results.map((row) => ({
      sourceLocale: 'mr',
      targetLocale: 'en',
      sourceText: row.marathi,
      targetText: row.english,
      type: row.marathi === row.english ? 'non_translatable' : 'custom_translation',
      hint: null,
    })),
    sourcePath: (await readMetaValue(database, 'source_path')) ?? 'dict/19k.json',
    sourceFormat: ((await readMetaValue(database, 'source_format')) ?? 'english_to_marathi_list') as
      | 'english_to_marathi_list'
      | 'marathi_to_english_map',
    preparedAt: await readMetaValue(database, 'prepared_at'),
  }
}
