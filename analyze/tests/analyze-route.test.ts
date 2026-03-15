import assert from 'node:assert/strict'
import test from 'node:test'

import { GlossaryDatabaseError } from '../src/errors'
import * as analyzeRoute from '../src/analyze-route'
import type { AnalysisCoreResult, AnalysisEnrichmentResult } from '../src/types'


function buildExpectedCoreResult(): AnalysisCoreResult {
  return {
    source: 'text',
    marathiText: 'अर्ज सादर करा',
    glossaryHits: [],
    englishCanonical: 'Submit the application',
  }
}

function buildExpectedEnrichmentResult(): AnalysisEnrichmentResult {
  return {
    localizedText: {
      hi: 'आवेदन जमा करें',
    },
    simplifiedEnglish: 'Submit the application',
    actions: [],
  }
}

test('handleAnalyzeFormData analyzes pasted Marathi text', async () => {
  const formData = new FormData()
  formData.set('marathiText', 'अर्ज सादर करा')

  const expected = buildExpectedCoreResult()
  const result = await analyzeRoute.handleAnalyzeFormData(formData, {
    analyzeMarathiDocument: async (input) => {
      assert.equal(input.source, 'text')
      assert.equal(input.marathiText, 'अर्ज सादर करा')
      return expected
    },
    extractPdfText: async () => {
      throw new Error('should not extract pdf for text-only requests')
    },
  })

  assert.deepEqual(result, expected)
})

test('handleAnalyzeFormData extracts pdf content before analysis', async () => {
  const formData = new FormData()
  formData.set('file', new File(['%PDF-sample'], 'circular.pdf', { type: 'application/pdf' }))

  const expected = {
    ...buildExpectedCoreResult(),
    source: 'pdf' as const,
    extractionConfidence: 0.88,
    marathiText: 'सदर अर्ज',
  }

  const result = await analyzeRoute.handleAnalyzeFormData(formData, {
    analyzeMarathiDocument: async (input) => {
      assert.equal(input.source, 'pdf')
      assert.equal(input.extractionConfidence, 0.88)
      assert.equal(input.marathiText, 'सदर अर्ज')
      return expected
    },
    extractPdfText: async () => ({
      text: 'सदर अर्ज',
      confidence: 0.88,
    }),
  })

  assert.deepEqual(result, expected)
})

test('handleAnalyzeFormData rejects empty requests', async () => {
  const formData = new FormData()

  await assert.rejects(
    () =>
      analyzeRoute.handleAnalyzeFormData(formData, {
        analyzeMarathiDocument: async () => buildExpectedCoreResult(),
        extractPdfText: async () => ({
          text: 'unused',
          confidence: 0.5,
        }),
      }),
    /Upload a PDF or provide Marathi text before analyzing\./
  )
})

test('handleEnrichRequest returns only the requested optional outputs', async () => {
  const expected = buildExpectedEnrichmentResult()

  const result = await analyzeRoute.handleEnrichRequest(
    {
      englishCanonical: 'Submit the application',
      requestedLocales: ['hi'],
      includePlainExplanation: true,
      includeActions: true,
    },
    {
      generateAnalysisEnrichment: async (input) => {
        assert.equal(input.englishCanonical, 'Submit the application')
        assert.deepEqual(input.requestedLocales, ['hi'])
        assert.equal(input.includePlainExplanation, true)
        assert.equal(input.includeActions, true)
        return expected
      },
    }
  )

  assert.deepEqual(result, expected)
})

test('handleEnrichRequest rejects requests with no optional outputs selected', async () => {
  await assert.rejects(
    () =>
      analyzeRoute.handleEnrichRequest(
        {
          englishCanonical: 'Submit the application',
          requestedLocales: [],
          includePlainExplanation: false,
          includeActions: false,
        },
        {
          generateAnalysisEnrichment: async () => buildExpectedEnrichmentResult(),
        }
      ),
    /Request at least one optional output before generating enrichments\./
  )
})

test('handleEnrichRequest rejects requests without canonical english text', async () => {
  await assert.rejects(
    () =>
      analyzeRoute.handleEnrichRequest(
        {
          englishCanonical: '   ',
          requestedLocales: ['hi'],
          includePlainExplanation: false,
          includeActions: false,
        },
        {
          generateAnalysisEnrichment: async () => buildExpectedEnrichmentResult(),
        }
      ),
    /Provide canonical English text before generating enrichments\./
  )
})

test('getAnalyzeErrorStatus maps request validation failures to bad request', () => {
  assert.equal(
    analyzeRoute.getAnalyzeErrorStatus(new Error('Upload a PDF or provide Marathi text before analyzing.')),
    400
  )
  assert.equal(
    analyzeRoute.getAnalyzeErrorStatus(
      new Error('Request at least one optional output before generating enrichments.')
    ),
    400
  )
  assert.equal(
    analyzeRoute.getAnalyzeErrorStatus(new Error('Provide canonical English text before generating enrichments.')),
    400
  )
})

test('getAnalyzeErrorStatus maps glossary and lingo dependency failures to service unavailable', () => {
  assert.equal(analyzeRoute.getAnalyzeErrorStatus(new GlossaryDatabaseError('missing glossary')), 503)
  assert.equal(
    analyzeRoute.getAnalyzeErrorStatus(
      new Error('LINGODOTDEV_API_KEY is required for translation and localization.')
    ),
    503
  )
})

test('getAnalyzeErrorStatus maps extraction dependency failures to service unavailable', () => {
  assert.equal(analyzeRoute.getAnalyzeErrorStatus(new Error('PDF extraction failed.')), 503)
  assert.equal(
    analyzeRoute.getAnalyzeErrorStatus(new Error('Extraction service returned an invalid response.')),
    503
  )
})

test('getAnalyzeErrorStatus keeps unexpected failures as internal errors', () => {
  assert.equal(analyzeRoute.getAnalyzeErrorStatus(new Error('Unexpected failure.')), 500)
})
