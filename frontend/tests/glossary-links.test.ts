import assert from 'node:assert/strict'
import test from 'node:test'

import { buildLinkedGlossaryState } from '../src/lib/glossary-links'
import type { GlossaryHit } from '../src/lib/types'


test('buildLinkedGlossaryState links Marathi glossary hits to matching English meaning phrases', () => {
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
    {
      canonicalTerm: 'मुदत',
      matchedText: 'मुदत',
      meaning: 'deadline',
      start: 10,
      end: 14,
      matchType: 'exact',
      confidence: 1,
    },
  ]

  const linkedState = buildLinkedGlossaryState({
    marathiText: 'अर्ज सादर करण्याची मुदत',
    englishCanonical: 'Submit the application before the deadline. The application must be signed.',
    glossaryHits,
  })

  assert.deepEqual(
    linkedState.links.map((link) => ({
      id: link.id,
      marathiText: link.marathiText,
      englishMeaning: link.englishMeaning,
      englishMatches: link.englishMatches.map(({ start, end, text }) => ({ start, end, text })),
    })),
    [
      {
        id: 'अर्ज::application',
        marathiText: 'अर्ज',
        englishMeaning: 'application',
        englishMatches: [
          { start: 11, end: 22, text: 'application' },
          { start: 48, end: 59, text: 'application' },
        ],
      },
      {
        id: 'मुदत::deadline',
        marathiText: 'मुदत',
        englishMeaning: 'deadline',
        englishMatches: [{ start: 34, end: 42, text: 'deadline' }],
      },
    ]
  )
})
