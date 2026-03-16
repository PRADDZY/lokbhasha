import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import Database from 'better-sqlite3'

import { buildGlossarySyncSnapshot } from '../src/glossary-sync'
import { getLingoSetupSummary } from '../src/lingo-setup'


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

test('getLingoSetupSummary reports the default setup alongside glossary-backed readiness', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lokbhasha-lingo-setup-'))
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

  const summary = getLingoSetupSummary({
    databasePath,
    sourcePath,
    snapshotPath,
  })

  assert.equal(summary.sourceLocale, 'mr')
  assert.equal(summary.canonicalTargetLocale, 'en')
  assert.deepEqual(summary.runtimePath, ['recognize', 'mr->en', 'en->selectedLocales'])
  assert.deepEqual(summary.selectedTargetLocales, [
    'as',
    'bn',
    'brx',
    'doi',
    'gu',
    'hi',
    'kn',
    'ks',
    'kok',
    'mai',
    'ml',
    'mni',
    'ne',
    'or',
    'pa',
    'sa',
    'sat',
    'sd',
    'ta',
    'te',
    'ur',
  ])
  assert.equal(summary.engine.status, 'default_org_engine')
  assert.equal(summary.engine.note, 'Requests use the organization default Lingo setup.')
  assert.equal(summary.layers.glossary.status, 'ready')
  assert.equal(summary.layers.glossary.source, 'government_19k')
  assert.equal(summary.layers.glossary.authority, 'lingo_mcp')
  assert.equal(summary.layers.glossary.detectionStore, 'sqlite')
  assert.equal(summary.layers.glossary.managementMode, 'mcp_only')
  assert.equal(summary.layers.glossary.precedence, 'authoritative_in_lingo')
  assert.equal(summary.layers.glossary.sourcePath, sourcePath)
  assert.equal(summary.layers.glossary.sourceFormat, 'english_to_marathi_list')
  assert.equal(summary.layers.glossary.runtimeArtifactPath, databasePath)
  assert.equal(summary.layers.glossary.lastPreparedAt, '2026-03-16T12:00:00.000Z')
  assert.equal(summary.layers.glossary.lastSyncedAt, null)
  assert.equal(summary.layers.glossary.totalTerms, 2)
  assert.equal(summary.layers.brandVoices.configuredCount, 0)
  assert.equal(summary.layers.instructions.configuredCount, 0)
  assert.equal(summary.layers.aiReviewers.configuredCount, 0)
})
