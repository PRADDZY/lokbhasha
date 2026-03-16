import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { getGlossaryDatabasePath, getGlossarySourcePath } from '../src/config'


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
