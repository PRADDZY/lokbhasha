import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { getGlossaryDatabasePath, getGlossarySourcePath, getConfiguredBrandVoiceCount, getConfiguredInstructionCount, getConfiguredScorerCount } from '../src/config'


test('getGlossaryDatabasePath defaults to the repo tracked sqlite glossary', () => {
  const originalValue = process.env.GLOSSARY_DB_PATH
  delete process.env.GLOSSARY_DB_PATH

  try {
    assert.equal(
      getGlossaryDatabasePath(),
      path.resolve(process.cwd(), '..', 'sqlite', 'glossary.sqlite3')
    )
  } finally {
    if (originalValue === undefined) {
      delete process.env.GLOSSARY_DB_PATH
    } else {
      process.env.GLOSSARY_DB_PATH = originalValue
    }
  }
})

test('getGlossaryDatabasePath respects an explicit environment override', () => {
  const originalValue = process.env.GLOSSARY_DB_PATH
  process.env.GLOSSARY_DB_PATH = '/tmp/custom-glossary.sqlite3'

  try {
    assert.equal(getGlossaryDatabasePath(), '/tmp/custom-glossary.sqlite3')
  } finally {
    if (originalValue === undefined) {
      delete process.env.GLOSSARY_DB_PATH
    } else {
      process.env.GLOSSARY_DB_PATH = originalValue
    }
  }
})

test('getGlossarySourcePath defaults to the 19k glossary source in dict', () => {
  const originalValue = process.env.GLOSSARY_SOURCE_PATH
  delete process.env.GLOSSARY_SOURCE_PATH

  try {
    assert.equal(
      getGlossarySourcePath(),
      path.resolve(process.cwd(), '..', 'dict', '19k.json')
    )
  } finally {
    if (originalValue === undefined) {
      delete process.env.GLOSSARY_SOURCE_PATH
    } else {
      process.env.GLOSSARY_SOURCE_PATH = originalValue
    }
  }
})

test('getGlossarySourcePath respects an explicit environment override', () => {
  const originalValue = process.env.GLOSSARY_SOURCE_PATH
  process.env.GLOSSARY_SOURCE_PATH = '/tmp/custom-government-glossary.json'

  try {
    assert.equal(getGlossarySourcePath(), '/tmp/custom-government-glossary.json')
  } finally {
    if (originalValue === undefined) {
      delete process.env.GLOSSARY_SOURCE_PATH
    } else {
      process.env.GLOSSARY_SOURCE_PATH = originalValue
    }
  }
})

test('getConfiguredBrandVoiceCount defaults to 0 when unset', () => {
  const original = process.env.LINGO_BRAND_VOICE_COUNT
  delete process.env.LINGO_BRAND_VOICE_COUNT

  try {
    assert.equal(getConfiguredBrandVoiceCount(), 0)
  } finally {
    if (original === undefined) {
      delete process.env.LINGO_BRAND_VOICE_COUNT
    } else {
      process.env.LINGO_BRAND_VOICE_COUNT = original
    }
  }
})

test('getConfiguredBrandVoiceCount reads the environment variable', () => {
  const original = process.env.LINGO_BRAND_VOICE_COUNT
  process.env.LINGO_BRAND_VOICE_COUNT = '2'

  try {
    assert.equal(getConfiguredBrandVoiceCount(), 2)
  } finally {
    if (original === undefined) {
      delete process.env.LINGO_BRAND_VOICE_COUNT
    } else {
      process.env.LINGO_BRAND_VOICE_COUNT = original
    }
  }
})

test('getConfiguredBrandVoiceCount falls back to 0 for invalid values', () => {
  const original = process.env.LINGO_BRAND_VOICE_COUNT
  process.env.LINGO_BRAND_VOICE_COUNT = 'not-a-number'

  try {
    assert.equal(getConfiguredBrandVoiceCount(), 0)
  } finally {
    if (original === undefined) {
      delete process.env.LINGO_BRAND_VOICE_COUNT
    } else {
      process.env.LINGO_BRAND_VOICE_COUNT = original
    }
  }
})

test('getConfiguredInstructionCount defaults to 0 when unset', () => {
  const original = process.env.LINGO_INSTRUCTION_COUNT
  delete process.env.LINGO_INSTRUCTION_COUNT

  try {
    assert.equal(getConfiguredInstructionCount(), 0)
  } finally {
    if (original === undefined) {
      delete process.env.LINGO_INSTRUCTION_COUNT
    } else {
      process.env.LINGO_INSTRUCTION_COUNT = original
    }
  }
})

test('getConfiguredInstructionCount reads the environment variable', () => {
  const original = process.env.LINGO_INSTRUCTION_COUNT
  process.env.LINGO_INSTRUCTION_COUNT = '3'

  try {
    assert.equal(getConfiguredInstructionCount(), 3)
  } finally {
    if (original === undefined) {
      delete process.env.LINGO_INSTRUCTION_COUNT
    } else {
      process.env.LINGO_INSTRUCTION_COUNT = original
    }
  }
})

test('getConfiguredScorerCount defaults to 0 when unset', () => {
  const original = process.env.LINGO_SCORER_COUNT
  delete process.env.LINGO_SCORER_COUNT

  try {
    assert.equal(getConfiguredScorerCount(), 0)
  } finally {
    if (original === undefined) {
      delete process.env.LINGO_SCORER_COUNT
    } else {
      process.env.LINGO_SCORER_COUNT = original
    }
  }
})

test('getConfiguredScorerCount reads the environment variable', () => {
  const original = process.env.LINGO_SCORER_COUNT
  process.env.LINGO_SCORER_COUNT = '1'

  try {
    assert.equal(getConfiguredScorerCount(), 1)
  } finally {
    if (original === undefined) {
      delete process.env.LINGO_SCORER_COUNT
    } else {
      process.env.LINGO_SCORER_COUNT = original
    }
  }
})
