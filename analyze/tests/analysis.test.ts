import assert from 'node:assert/strict'
import test from 'node:test'

import { analyzeMarathiDocument, generateAnalysisEnrichment } from '../src/analysis'
import type { GlossaryHit, LingoClient } from '../src/types'


test('analyzeMarathiDocument uses glossary hints for english translation and returns only the core result', async () => {
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
      return ['आवेदन जमा करें']
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
    }
  )

  assert.deepEqual(result, {
    source: 'text',
    marathiText: 'अर्ज सादर करा',
    extractionConfidence: undefined,
    glossaryHits,
    englishCanonical: 'Submit the application',
  })
  assert.equal(lingoCalls.length, 1)
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
})

test('generateAnalysisEnrichment localizes only requested locales', async () => {
  const lingoCalls: Array<{ method: string; payload: unknown }> = []
  const lingoClient: LingoClient = {
    async localizeText() {
      throw new Error('core translation should not run during enrichment')
    },
    async batchLocalizeText(text, options) {
      lingoCalls.push({ method: 'batchLocalizeText', payload: { text, options } })
      return ['आवेदन जमा करें', 'আবেদন জমা দিন']
    },
  }

  const result = await generateAnalysisEnrichment(
    {
      englishCanonical: 'Submit the application',
      requestedLocales: ['hi', 'bn'],
      includePlainExplanation: false,
      includeActions: false,
    },
    { lingoClient }
  )

  assert.deepEqual(result, {
    localizedText: {
      hi: 'आवेदन जमा करें',
      bn: 'আবেদন জমা দিন',
    },
  })
  assert.deepEqual(lingoCalls, [
    {
      method: 'batchLocalizeText',
      payload: {
        text: 'Submit the application',
        options: {
          sourceLocale: 'en',
          targetLocales: ['hi', 'bn'],
          fast: true,
        },
      },
    },
  ])
})

test('generateAnalysisEnrichment returns explanation and actions only when requested', async () => {
  const lingoClient: LingoClient = {
    async localizeText() {
      throw new Error('core translation should not run during enrichment')
    },
    async batchLocalizeText() {
      throw new Error('locale translation should not run for explanation-only requests')
    },
  }

  const result = await generateAnalysisEnrichment(
    {
      englishCanonical: 'Eligible beneficiaries shall submit applications before the deadline.',
      requestedLocales: [],
      includePlainExplanation: true,
      includeActions: true,
    },
    { lingoClient }
  )

  assert.equal(
    result.simplifiedEnglish,
    'People who qualify must submit an application before the deadline.'
  )
  assert.deepEqual(result.actions, [
    {
      action: 'People who qualify must submit an application before the deadline',
      deadline: 'before the deadline',
      requirement: 'People who qualify must submit an application before the deadline',
    },
  ])
  assert.equal(result.localizedText, undefined)
})

test('generateAnalysisEnrichment can derive actions without returning a plain explanation', async () => {
  const lingoClient: LingoClient = {
    async localizeText() {
      throw new Error('core translation should not run during enrichment')
    },
    async batchLocalizeText() {
      throw new Error('locale translation should not run for actions-only requests')
    },
  }

  const result = await generateAnalysisEnrichment(
    {
      englishCanonical: 'Eligible beneficiaries shall submit applications before the deadline.',
      requestedLocales: [],
      includePlainExplanation: false,
      includeActions: true,
    },
    { lingoClient }
  )

  assert.equal(result.simplifiedEnglish, undefined)
  assert.deepEqual(result.actions, [
    {
      action: 'People who qualify must submit an application before the deadline',
      deadline: 'before the deadline',
      requirement: 'People who qualify must submit an application before the deadline',
    },
  ])
})
