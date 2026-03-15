import assert from 'node:assert/strict'
import test from 'node:test'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'

import { detectGlossaryHits } from '../src/lib/server/glossary'


function createTempGlossary() {
  const databasePath = path.join(os.tmpdir(), `lokbhasha-glossary-${Date.now()}-${Math.random()}.sqlite3`)
  const database = new Database(databasePath)
  database.exec(`
    CREATE TABLE glossary_terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marathi_term TEXT NOT NULL,
      normalized_term TEXT NOT NULL UNIQUE,
      english_term TEXT NOT NULL,
      token_count INTEGER NOT NULL,
      first_token TEXT NOT NULL,
      prefix_key TEXT NOT NULL,
      is_realtime INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE glossary_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX idx_glossary_terms_runtime_lookup
      ON glossary_terms(is_realtime, token_count, first_token, prefix_key);
  `)
  database.prepare(`
    INSERT INTO glossary_metadata (key, value)
    VALUES ('realtime_token_limit', '4')
  `).run()

  return { database, databasePath }
}

test('detectGlossaryHits returns structured exact matches with offsets', () => {
  const { database, databasePath } = createTempGlossary()
  database.prepare(`
    INSERT INTO glossary_terms (
      marathi_term,
      normalized_term,
      english_term,
      token_count,
      first_token,
      prefix_key,
      is_realtime
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('अर्ज', 'अर्ज', 'application', 1, 'अर्ज', 'अर्ज', 1)
  database.close()

  const hits = detectGlossaryHits('सदर अर्ज सादर करा', { databasePath })

  assert.equal(hits.length, 1)
  assert.deepEqual(hits[0], {
    canonicalTerm: 'अर्ज',
    matchedText: 'अर्ज',
    meaning: 'application',
    start: 4,
    end: 8,
    matchType: 'exact',
    confidence: 1,
  })
})

test('detectGlossaryHits prefers longer multiword glossary terms', () => {
  const { database, databasePath } = createTempGlossary()
  const insertTerm = database.prepare(`
    INSERT INTO glossary_terms (
      marathi_term,
      normalized_term,
      english_term,
      token_count,
      first_token,
      prefix_key,
      is_realtime
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  insertTerm.run('पूर्ववृत्त', 'पूर्ववृत्त', 'history', 1, 'पूर्ववृत्त', 'पूर्व', 1)
  insertTerm.run('वैद्यकीय पूर्ववृत्त', 'वैद्यकीय पूर्ववृत्त', 'medical history', 2, 'वैद्यकीय', 'वैद्', 1)
  database.close()

  const hits = detectGlossaryHits('वैद्यकीय पूर्ववृत्त सादर करा', { databasePath })

  assert.equal(hits.length, 1)
  assert.equal(hits[0]?.canonicalTerm, 'वैद्यकीय पूर्ववृत्त')
  assert.equal(hits[0]?.meaning, 'medical history')
})

test('detectGlossaryHits throws a clear error when the glossary database is missing', () => {
  const missingDatabasePath = path.join(
    os.tmpdir(),
    `lokbhasha-missing-glossary-${Date.now()}-${Math.random()}.sqlite3`
  )

  assert.throws(
    () => detectGlossaryHits('अर्ज सादर करा', { databasePath: missingDatabasePath }),
    /Glossary database not found/
  )
})

test('detectGlossaryHits throws a clear error when the glossary schema is invalid', () => {
  const invalidDatabasePath = path.join(
    os.tmpdir(),
    `lokbhasha-invalid-glossary-${Date.now()}-${Math.random()}.sqlite3`
  )
  const database = new Database(invalidDatabasePath)
  database.exec(`
    CREATE TABLE unrelated_table (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT NOT NULL
    );
  `)
  database.close()

  assert.throws(
    () => detectGlossaryHits('अर्ज सादर करा', { databasePath: invalidDatabasePath }),
    /missing required glossary schema/
  )
})
