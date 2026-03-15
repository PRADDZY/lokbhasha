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
      marathiMatches: link.marathiMatches.map(({ start, end, text }) => ({ start, end, text })),
      englishMatches: link.englishMatches.map(({ start, end, text }) => ({ start, end, text })),
    })),
    [
      {
        id: 'अर्ज::application',
        marathiText: 'अर्ज',
        englishMeaning: 'application',
        marathiMatches: [{ start: 0, end: 3, text: 'अर्ज' }],
        englishMatches: [
          { start: 11, end: 22, text: 'application' },
          { start: 48, end: 59, text: 'application' },
        ],
      },
      {
        id: 'मुदत::deadline',
        marathiText: 'मुदत',
        englishMeaning: 'deadline',
        marathiMatches: [{ start: 10, end: 14, text: 'मुदत' }],
        englishMatches: [{ start: 34, end: 42, text: 'deadline' }],
      },
    ]
  )
})

test('buildLinkedGlossaryState keeps every Marathi occurrence linked for repeated glossary terms', () => {
  const linkedState = buildLinkedGlossaryState({
    marathiText: 'अर्ज तपासा आणि अर्ज सादर करा',
    englishCanonical: 'Review the application and submit the application.',
    glossaryHits: [
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
        canonicalTerm: 'अर्ज',
        matchedText: 'अर्ज',
        meaning: 'application',
        start: 15,
        end: 18,
        matchType: 'exact',
        confidence: 1,
      },
    ],
  })

  assert.deepEqual(linkedState.links[0]?.marathiMatches, [
    { start: 0, end: 3, text: 'अर्ज' },
    { start: 15, end: 18, text: 'अर्ज' },
  ])
  assert.equal(linkedState.marathiParts.filter((part) => part.type === 'link').length, 2)
})
