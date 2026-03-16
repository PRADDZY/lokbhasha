import assert from 'node:assert/strict'
import test from 'node:test'

import { analyzeMarathiDocument, buildBaselineComparison, generateAnalysisEnrichment } from '../src/analysis'
import type { GlossaryHit, LingoClient } from '../src/types'


test('analyzeMarathiDocument recognizes the source locale and localizes canonical english through a structured object request', async () => {
  const glossaryHits: GlossaryHit[] = [
    {
      canonicalTerm: 'arj',
      matchedText: 'arj',
      meaning: 'application',
      start: 0,
      end: 3,
      matchType: 'exact',
      confidence: 1,
    },
  ]

  const lingoCalls: Array<{ method: string; payload: unknown }> = []
  const lingoClient: LingoClient = {
    runtime: {
      engineSelectionMode: 'explicit',
      engineId: 'engine_demo_123',
    },
    async recognizeLocale(text) {
      lingoCalls.push({ method: 'recognizeLocale', payload: { text } })
      return 'mr'
    },
    async localizeObject(payload, options) {
      lingoCalls.push({ method: 'localizeObject', payload: { payload, options } })
      return {
        canonicalText: 'Submit the application',
      }
    },
  }

  const result = await analyzeMarathiDocument(
    {
      marathiText: 'arj sadar kara',
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
    marathiText: 'arj sadar kara',
    extractionConfidence: undefined,
    glossaryHits,
    englishCanonical: 'Submit the application',
    localizationContext: {
      provider: 'lingo.dev',
      engineSelectionMode: 'explicit',
      engineId: 'engine_demo_123',
      sourceLocale: {
        configured: 'mr',
        recognized: 'mr',
        matchesConfigured: true,
      },
      canonicalStage: {
        requestShape: 'structured_object',
        method: 'localizeObject',
        sourceLocale: 'mr',
        targetLocale: 'en',
        fast: true,
        glossaryMode: 'fallback_request_hints',
      },
    },
  })
  assert.deepEqual(lingoCalls, [
    {
      method: 'recognizeLocale',
      payload: {
        text: 'arj sadar kara',
      },
    },
    {
      method: 'localizeObject',
      payload: {
        payload: {
          canonicalText: 'arj sadar kara',
        },
        options: {
          sourceLocale: 'mr',
          targetLocale: 'en',
          fast: true,
          hints: {
            arj: ['application'],
          },
        },
      },
    },
  ])
})

test('generateAnalysisEnrichment localizes only requested locales with per-locale structured object requests', async () => {
  const lingoCalls: Array<{ method: string; payload: unknown }> = []
  const lingoClient: LingoClient = {
    runtime: {
      engineSelectionMode: 'implicit_default',
      engineId: null,
    },
    async recognizeLocale() {
      throw new Error('source recognition should not run during enrichment')
    },
    async localizeObject(payload, options) {
      lingoCalls.push({ method: 'localizeObject', payload: { payload, options } })
      if (options.targetLocale === 'hi') {
        return { localizedText: 'Hindi output' }
      }
      return { localizedText: 'Bangla output' }
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
      hi: 'Hindi output',
      bn: 'Bangla output',
    },
  })
  assert.deepEqual(lingoCalls, [
    {
      method: 'localizeObject',
      payload: {
        payload: {
          localizedText: 'Submit the application',
        },
        options: {
          sourceLocale: 'en',
          targetLocale: 'hi',
          fast: true,
        },
      },
    },
    {
      method: 'localizeObject',
      payload: {
        payload: {
          localizedText: 'Submit the application',
        },
        options: {
          sourceLocale: 'en',
          targetLocale: 'bn',
          fast: true,
        },
      },
    },
  ])
})

test('generateAnalysisEnrichment returns explanation and actions only when requested', async () => {
  const lingoClient: LingoClient = {
    runtime: {
      engineSelectionMode: 'implicit_default',
      engineId: null,
    },
    async recognizeLocale() {
      throw new Error('core translation should not run during enrichment')
    },
    async localizeObject() {
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
    runtime: {
      engineSelectionMode: 'implicit_default',
      engineId: null,
    },
    async recognizeLocale() {
      throw new Error('core translation should not run during enrichment')
    },
    async localizeObject() {
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

test('buildBaselineComparison reruns the same structured localization request without glossary hints', async () => {
  const glossaryHits: GlossaryHit[] = [
    {
      canonicalTerm: 'arj',
      matchedText: 'arj',
      meaning: 'application',
      start: 0,
      end: 3,
      matchType: 'exact',
      confidence: 1,
    },
    {
      canonicalTerm: 'sadar',
      matchedText: 'sadar',
      meaning: 'submit',
      start: 5,
      end: 9,
      matchType: 'exact',
      confidence: 1,
    },
  ]

  const lingoCalls: Array<{ method: string; payload: unknown }> = []
  const lingoClient: LingoClient = {
    runtime: {
      engineSelectionMode: 'implicit_default',
      engineId: null,
    },
    async recognizeLocale() {
      throw new Error('source recognition should not run during baseline comparison')
    },
    async localizeObject(payload, options) {
      lingoCalls.push({ method: 'localizeObject', payload: { payload, options } })
      return {
        canonicalText: 'Send the application',
      }
    },
  }

  const result = await buildBaselineComparison(
    {
      marathiText: 'arj sadar kara',
      englishCanonical: 'Submit the application',
    },
    {
      detectGlossaryHits: () => glossaryHits,
      lingoClient,
    }
  )

  assert.deepEqual(result, {
    targetLocale: 'en',
    method: 'same_localizeObject_without_glossary_hints',
    baselineText: 'Send the application',
    sameAsCurrent: false,
    glossaryMatchCount: 2,
    hintTermCount: 2,
  })
  assert.deepEqual(lingoCalls, [
    {
      method: 'localizeObject',
      payload: {
        payload: {
          canonicalText: 'arj sadar kara',
        },
        options: {
          sourceLocale: 'mr',
          targetLocale: 'en',
          fast: true,
        },
      },
    },
  ])
})
