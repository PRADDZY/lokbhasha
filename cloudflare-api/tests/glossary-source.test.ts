import assert from 'node:assert/strict'
import test from 'node:test'

import { buildD1SeedSql, type GlossarySeedPackage } from '../src/glossary-source'

test('buildD1SeedSql resolves duplicate Marathi terms with INSERT OR REPLACE semantics', () => {
  const glossaryPackage: GlossarySeedPackage = {
    sourcePath: 'dict/19k.json',
    sourceFormat: 'english_to_marathi_list',
    sourceHash: 'hash',
    totalTerms: 2,
    customTranslationTerms: 2,
    nonTranslatableTerms: 0,
    entries: [
      {
        canonicalTerm: 'देणे',
        sourceLocale: 'mr',
        targetLocale: 'en',
        sourceText: 'देणे',
        targetText: 'give',
        type: 'custom_translation',
        hint: null,
      },
      {
        canonicalTerm: 'देणे',
        sourceLocale: 'mr',
        targetLocale: 'en',
        sourceText: 'देणे',
        targetText: 'grant',
        type: 'custom_translation',
        hint: null,
      },
    ],
  }

  const sql = buildD1SeedSql(glossaryPackage, { preparedAt: '2026-04-09T12:00:00.000Z' })

  assert.match(
    sql,
    /INSERT OR REPLACE INTO glossary \(marathi, english\) VALUES/,
    'D1 seed SQL should use INSERT OR REPLACE for glossary rows'
  )
})
