import assert from 'node:assert/strict'
import test from 'node:test'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'

import { detectGlossaryHits } from '../src/lib/server/glossary'


const TERM_APPLICATION = '\u0905\u0930\u094d\u091c'
const TERM_MEDICAL_HISTORY = '\u0935\u0948\u0926\u094d\u092f\u0915\u0940\u092f \u092a\u0942\u0930\u094d\u0935\u0935\u0943\u0924\u094d\u0924'
const TEXT_APPLICATION = '\u0938\u0926\u0930 \u0905\u0930\u094d\u091c \u0938\u093e\u0926\u0930 \u0915\u0930\u093e'
const TEXT_MEDICAL_HISTORY = '\u0935\u0948\u0926\u094d\u092f\u0915\u0940\u092f \u092a\u0942\u0930\u094d\u0935\u0935\u0943\u0924\u094d\u0924 \u0938\u093e\u0926\u0930 \u0915\u0930\u093e'

function createTempGlossary() {
  const databasePath = path.join(os.tmpdir(), `lokbhasha-glossary-${Date.now()}-${Math.random()}.sqlite3`)
  const database = new Database(databasePath)
  database.exec(`
    CREATE TABLE glossary (
      marathi TEXT PRIMARY KEY,
      english TEXT NOT NULL
    );

    CREATE INDEX idx_marathi ON glossary(marathi);
  `)

  return { database, databasePath }
}

test('detectGlossaryHits returns structured exact matches with offsets', () => {
  const { database, databasePath } = createTempGlossary()
  database.prepare(`
    INSERT INTO glossary (marathi, english) VALUES (?, ?)
  `).run(TERM_APPLICATION, 'application')
  database.close()

  const hits = detectGlossaryHits(TEXT_APPLICATION, { databasePath })

  assert.equal(hits.length, 1)
  assert.deepEqual(hits[0], {
    canonicalTerm: TERM_APPLICATION,
    matchedText: TERM_APPLICATION,
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
    INSERT INTO glossary (marathi, english) VALUES (?, ?)
  `)
  insertTerm.run('\u092a\u0942\u0930\u094d\u0935\u0935\u0943\u0924\u094d\u0924', 'history')
  insertTerm.run(TERM_MEDICAL_HISTORY, 'medical history')
  database.close()

  const hits = detectGlossaryHits(TEXT_MEDICAL_HISTORY, { databasePath })

  assert.equal(hits.length, 1)
  assert.equal(hits[0]?.canonicalTerm, TERM_MEDICAL_HISTORY)
  assert.equal(hits[0]?.meaning, 'medical history')
})

test('detectGlossaryHits throws a clear error when the glossary database is missing', () => {
  const missingDatabasePath = path.join(
    os.tmpdir(),
    `lokbhasha-missing-glossary-${Date.now()}-${Math.random()}.sqlite3`
  )

  assert.throws(
    () => detectGlossaryHits(TEXT_APPLICATION, { databasePath: missingDatabasePath }),
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
    () => detectGlossaryHits(TEXT_APPLICATION, { databasePath: invalidDatabasePath }),
    /missing required glossary schema/
  )
})

test('detectGlossaryHits throws a clear error when the glossary index is missing', () => {
  const invalidDatabasePath = path.join(
    os.tmpdir(),
    `lokbhasha-invalid-glossary-index-${Date.now()}-${Math.random()}.sqlite3`
  )
  const database = new Database(invalidDatabasePath)
  database.exec(`
    CREATE TABLE glossary (
      marathi TEXT PRIMARY KEY,
      english TEXT NOT NULL
    );
  `)
  database.close()

  assert.throws(
    () => detectGlossaryHits(TEXT_APPLICATION, { databasePath: invalidDatabasePath }),
    /missing required glossary index/
  )
})
