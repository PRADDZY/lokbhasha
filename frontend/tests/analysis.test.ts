import assert from 'node:assert/strict'
import test from 'node:test'

import { analyzeMarathiDocument } from '../src/lib/server/analysis'
import type { GlossaryHit, LingoClient } from '../src/lib/server/types'


test('analyzeMarathiDocument uses glossary hints for english translation and localizes canonical english', async () => {
  const glossaryHits: GlossaryHit[] = [
    {
      canonicalTerm: 'अर्ज',
      matchedText: 'अर्ज',
      meaning: 'application',
      start: 0,
      end: 3,
      matchType: 'exact',
      confidence: 1,
    },
  ]

  const lingoCalls: Array<{ method: string; payload: unknown }> = []
  const lingoClient: LingoClient = {
    async localizeText(text, options) {
      lingoCalls.push({ method: 'localizeText', payload: { text, options } })
      return 'Submit the application'
    },
    async batchLocalizeText(text, options) {
      lingoCalls.push({ method: 'batchLocalizeText', payload: { text, options } })
      return ['आवेदन जमा करें', 'અરજી સબમિટ કરો']
    },
  }

  const result = await analyzeMarathiDocument(
    {
      marathiText: 'अर्ज सादर करा',
      source: 'text',
      extractionConfidence: undefined,
    },
    {
      detectGlossaryHits: () => glossaryHits,
      lingoClient,
      targetLocales: ['hi', 'gu'],
    }
  )

  assert.equal(result.englishCanonical, 'Submit the application')
  assert.deepEqual(result.localizedText, {
    hi: 'आवेदन जमा करें',
    gu: 'અરજી સબમિટ કરો',
  })
  assert.equal(lingoCalls.length, 2)
  assert.deepEqual(lingoCalls[0], {
    method: 'localizeText',
    payload: {
      text: 'अर्ज सादर करा',
      options: {
        sourceLocale: 'mr',
        targetLocale: 'en',
        fast: true,
        hints: {
          अर्ज: ['application'],
        },
      },
    },
  })
  assert.deepEqual(lingoCalls[1], {
    method: 'batchLocalizeText',
    payload: {
      text: 'Submit the application',
      options: {
        sourceLocale: 'en',
        targetLocales: ['hi', 'gu'],
        fast: true,
      },
    },
  })
  assert.equal(result.terminologyHints['अर्ज']?.[0], 'application')
})
