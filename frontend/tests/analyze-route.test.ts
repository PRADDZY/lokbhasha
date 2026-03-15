import assert from 'node:assert/strict'
import test from 'node:test'

import { handleAnalyzeFormData } from '../src/lib/server/analyze-route'
import type { AnalysisResult } from '../src/lib/server/types'


function buildExpectedResult(): AnalysisResult {
  return {
    source: 'text',
    marathiText: 'अर्ज सादर करा',
    glossaryHits: [],
    terminologyHints: {},
    englishCanonical: 'Submit the application',
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

  const expected = buildExpectedResult()
  const result = await handleAnalyzeFormData(formData, {
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
    ...buildExpectedResult(),
    source: 'pdf' as const,
    extractionConfidence: 0.88,
    marathiText: 'सदर अर्ज',
  }

  const result = await handleAnalyzeFormData(formData, {
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
      handleAnalyzeFormData(formData, {
        analyzeMarathiDocument: async () => buildExpectedResult(),
        extractPdfText: async () => ({
          text: 'unused',
          confidence: 0.5,
        }),
      }),
    /Upload a PDF or provide Marathi text before analyzing\./
  )
})
