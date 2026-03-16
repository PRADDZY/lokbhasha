import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import Database from 'better-sqlite3'

import {
  buildGlossarySyncSnapshot,
  getGlossarySyncStatus,
  mapGlossaryRowToLingoEntry,
} from '../src/glossary-sync'


const SAMPLE_GLOSSARY_SOURCE = [
  {
    word: 'Application',
    meaning: 'अर्ज',
  },
  {
    word: 'Lingo',
    meaning: 'लिंगो',
  },
]


function createTestGlossaryDatabase(filePath: string) {
  const database = new Database(filePath)
  database.exec(`
    CREATE TABLE glossary (
      marathi TEXT PRIMARY KEY,
      english TEXT NOT NULL
    );
    CREATE INDEX idx_marathi ON glossary(marathi);
  `)
  database
    .prepare('INSERT INTO glossary (marathi, english) VALUES (?, ?)')
    .run('अर्ज', 'application')
  database
    .prepare('INSERT INTO glossary (marathi, english) VALUES (?, ?)')
    .run('लिंगो', 'लिंगो')
  database.close()
}

test('mapGlossaryRowToLingoEntry maps sqlite rows into lingo glossary entries', () => {
  assert.deepEqual(
    mapGlossaryRowToLingoEntry({
      marathi: 'अर्ज',
      english: 'application',
    }),
    {
      sourceLocale: 'mr',
      targetLocale: 'en',
      sourceText: 'अर्ज',
      targetText: 'application',
      type: 'custom_translation',
      hint: null,
    }
  )

  assert.deepEqual(
    mapGlossaryRowToLingoEntry({
      marathi: 'लिंगो',
      english: 'लिंगो',
    }),
    {
      sourceLocale: 'mr',
      targetLocale: 'en',
      sourceText: 'लिंगो',
      targetText: 'लिंगो',
      type: 'non_translatable',
      hint: null,
    }
  )
})

test('getGlossarySyncStatus reports a ready lingo glossary package when snapshot matches the sqlite source', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lokbhasha-glossary-sync-'))
  const databasePath = path.join(tempDir, 'glossary.sqlite3')
  const sourcePath = path.join(tempDir, '19k.json')
  const snapshotPath = path.join(tempDir, 'lingo-glossary-sync.json')

  createTestGlossaryDatabase(databasePath)
  fs.writeFileSync(sourcePath, JSON.stringify(SAMPLE_GLOSSARY_SOURCE, null, 2))
  fs.writeFileSync(snapshotPath, JSON.stringify(buildGlossarySyncSnapshot({
    databasePath,
    sourcePath,
    preparedAt: '2026-03-16T12:00:00.000Z',
    engineId: 'eng_test',
    engineName: 'LokBhasha',
    remoteGlossaryTermCount: 2,
    lastKnownMcpSyncAt: '2026-03-16T12:10:00.000Z',
    previewLimit: 2,
  }), null, 2))

  const status = getGlossarySyncStatus({
    databasePath,
    sourcePath,
    snapshotPath,
  })

  assert.equal(status.syncState, 'ready')
  assert.equal(status.totalTerms, 2)
  assert.equal(status.customTranslationTerms, 1)
  assert.equal(status.nonTranslatableTerms, 1)
  assert.equal(status.source, 'government_19k')
  assert.equal(status.authority, 'lingo_mcp')
  assert.equal(status.detectionStore, 'sqlite')
  assert.equal(status.sourcePath, sourcePath)
  assert.equal(status.sourceFormat, 'english_to_marathi_list')
  assert.equal(status.managementMode, 'mcp_only')
  assert.equal(status.runtimeArtifactPath, databasePath)
  assert.equal(status.lastPreparedAt, '2026-03-16T12:00:00.000Z')
  assert.equal(status.lastSyncedAt, '2026-03-16T12:10:00.000Z')
  assert.equal(status.authoritativeEngineId, 'eng_test')
  assert.equal(status.authoritativeEngineName, 'LokBhasha')
  assert.equal(status.remoteGlossaryTermCount, 2)
  assert.equal(status.previewEntries.length, 2)
})

test('getGlossarySyncStatus reports drift when the sqlite source changes after the snapshot was prepared', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lokbhasha-glossary-drift-'))
  const databasePath = path.join(tempDir, 'glossary.sqlite3')
  const sourcePath = path.join(tempDir, '19k.json')
  const snapshotPath = path.join(tempDir, 'lingo-glossary-sync.json')

  createTestGlossaryDatabase(databasePath)
  fs.writeFileSync(sourcePath, JSON.stringify(SAMPLE_GLOSSARY_SOURCE, null, 2))
  fs.writeFileSync(snapshotPath, JSON.stringify(buildGlossarySyncSnapshot({
    databasePath,
    sourcePath,
    preparedAt: '2026-03-16T12:00:00.000Z',
    engineId: 'eng_test',
    engineName: 'LokBhasha',
    remoteGlossaryTermCount: 2,
    lastKnownMcpSyncAt: '2026-03-16T12:10:00.000Z',
    previewLimit: 2,
  }), null, 2))

  const database = new Database(databasePath)
  database
    .prepare('INSERT INTO glossary (marathi, english) VALUES (?, ?)')
    .run('अंतिम तारीख', 'deadline')
  database.close()

  const status = getGlossarySyncStatus({
    databasePath,
    sourcePath,
    snapshotPath,
  })

  assert.equal(status.syncState, 'drift')
  assert.equal(status.totalTerms, 3)
  assert.equal(status.lastPreparedAt, '2026-03-16T12:00:00.000Z')
  assert.equal(status.lastSyncedAt, '2026-03-16T12:10:00.000Z')
})

test('getGlossarySyncStatus reports missing when the package is prepared but no MCP sync has been recorded yet', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lokbhasha-glossary-nosync-'))
  const databasePath = path.join(tempDir, 'glossary.sqlite3')
  const sourcePath = path.join(tempDir, '19k.json')
  const snapshotPath = path.join(tempDir, 'lingo-glossary-sync.json')

  createTestGlossaryDatabase(databasePath)
  fs.writeFileSync(sourcePath, JSON.stringify(SAMPLE_GLOSSARY_SOURCE, null, 2))
  fs.writeFileSync(snapshotPath, JSON.stringify(buildGlossarySyncSnapshot({
    databasePath,
    sourcePath,
    preparedAt: '2026-03-16T12:00:00.000Z',
    previewLimit: 2,
  }), null, 2))

  const status = getGlossarySyncStatus({
    databasePath,
    sourcePath,
    snapshotPath,
  })

  assert.equal(status.syncState, 'missing')
  assert.equal(status.lastPreparedAt, '2026-03-16T12:00:00.000Z')
  assert.equal(status.lastSyncedAt, null)
})
