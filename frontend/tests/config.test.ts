import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { getGlossaryDatabasePath } from '../src/lib/server/config'


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
