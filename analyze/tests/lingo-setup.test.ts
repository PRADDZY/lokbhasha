import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import Database from 'better-sqlite3'

import { buildGlossarySyncSnapshot } from '../src/glossary-sync'
import { getLingoSetupSummary } from '../src/lingo-setup'


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
  const snapshotPath = path.join(tempDir, 'lingo-glossary-sync.json')

  createTestGlossaryDatabase(databasePath)
  fs.writeFileSync(snapshotPath, JSON.stringify(buildGlossarySyncSnapshot({
    databasePath,
    preparedAt: '2026-03-16T12:00:00.000Z',
    previewLimit: 2,
  }), null, 2))

  const summary = getLingoSetupSummary({
    databasePath,
    snapshotPath,
  })

  assert.equal(summary.sourceLocale, 'mr')
  assert.equal(summary.canonicalTargetLocale, 'en')
  assert.deepEqual(summary.runtimePath, ['mr->en', 'en->selectedLocales'])
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
  assert.equal(summary.layers.glossary.status, 'ready')
  assert.equal(summary.layers.glossary.totalTerms, 2)
  assert.equal(summary.layers.brandVoices.configuredCount, 0)
  assert.equal(summary.layers.instructions.configuredCount, 0)
  assert.equal(summary.layers.aiReviewers.configuredCount, 0)
})
