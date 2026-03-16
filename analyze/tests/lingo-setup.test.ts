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
    engineId: 'eng_test',
    engineName: 'LokBhasha',
    remoteGlossaryTermCount: 2,
    lastKnownMcpSyncAt: '2026-03-16T12:10:00.000Z',
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
  assert.equal(summary.layers.glossary.lastSyncedAt, '2026-03-16T12:10:00.000Z')
  assert.equal(summary.layers.glossary.authoritativeEngineId, 'eng_test')
  assert.equal(summary.layers.glossary.authoritativeEngineName, 'LokBhasha')
  assert.equal(summary.layers.glossary.remoteGlossaryTermCount, 2)
  assert.equal(summary.layers.glossary.totalTerms, 2)
  assert.equal(summary.layers.brandVoices.configuredCount, 0)
  assert.equal(summary.layers.brandVoices.status, 'not_surfaced')
  assert.equal(summary.layers.brandVoices.activeInRuntime, false)
  assert.equal(summary.layers.instructions.configuredCount, 0)
  assert.equal(summary.layers.instructions.status, 'not_surfaced')
  assert.equal(summary.layers.instructions.activeInRuntime, false)
  assert.equal(summary.layers.aiReviewers.configuredCount, 0)
  assert.equal(summary.layers.aiReviewers.status, 'not_surfaced')
  assert.equal(summary.layers.aiReviewers.activeInRuntime, false)
})

test('getLingoSetupSummary flips layer status to ready when env var counts are set', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lokbhasha-lingo-setup-layers-'))
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

  const origBV = process.env.LINGO_BRAND_VOICE_COUNT
  const origInst = process.env.LINGO_INSTRUCTION_COUNT
  const origScorer = process.env.LINGO_SCORER_COUNT

  process.env.LINGO_BRAND_VOICE_COUNT = '1'
  process.env.LINGO_INSTRUCTION_COUNT = '2'
  process.env.LINGO_SCORER_COUNT = '1'

  try {
    const summary = getLingoSetupSummary({
      databasePath,
      sourcePath,
      snapshotPath,
    })

    assert.equal(summary.layers.brandVoices.status, 'ready')
    assert.equal(summary.layers.brandVoices.configuredCount, 1)
    assert.equal(summary.layers.brandVoices.activeInRuntime, true)
    assert.equal(summary.layers.instructions.status, 'ready')
    assert.equal(summary.layers.instructions.configuredCount, 2)
    assert.equal(summary.layers.instructions.activeInRuntime, true)
    assert.equal(summary.layers.instructions.wildcardSupported, true)
    assert.equal(summary.layers.aiReviewers.status, 'ready')
    assert.equal(summary.layers.aiReviewers.configuredCount, 1)
    assert.equal(summary.layers.aiReviewers.activeInRuntime, true)
  } finally {
    if (origBV === undefined) { delete process.env.LINGO_BRAND_VOICE_COUNT } else { process.env.LINGO_BRAND_VOICE_COUNT = origBV }
    if (origInst === undefined) { delete process.env.LINGO_INSTRUCTION_COUNT } else { process.env.LINGO_INSTRUCTION_COUNT = origInst }
    if (origScorer === undefined) { delete process.env.LINGO_SCORER_COUNT } else { process.env.LINGO_SCORER_COUNT = origScorer }
  }
})
