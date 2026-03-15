import type { GlossaryHit } from './types'


type TextPart = {
  type: 'text' | 'link'
  text: string
  linkId?: string
  title?: string
}

type EnglishMatch = {
  start: number
  end: number
  text: string
}

type GlossaryLink = {
  id: string
  marathiText: string
  marathiStart: number
  marathiEnd: number
  englishMeaning: string
  englishMatches: EnglishMatch[]
}

export type LinkedGlossaryState = {
  links: GlossaryLink[]
  marathiParts: TextPart[]
  englishParts: TextPart[]
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildParts(
  text: string,
  ranges: Array<{ start: number; end: number; linkId: string; title?: string }>
): TextPart[] {
  if (!ranges.length) {
    return [{ type: 'text', text }]
  }

  const parts: TextPart[] = []
  let cursor = 0

  for (const range of ranges.sort((left, right) => left.start - right.start)) {
    if (range.start < cursor) {
      continue
    }

    if (cursor < range.start) {
      parts.push({
        type: 'text',
        text: text.slice(cursor, range.start),
      })
    }

    parts.push({
      type: 'link',
      text: text.slice(range.start, range.end),
      linkId: range.linkId,
      title: range.title,
    })
    cursor = range.end
  }

  if (cursor < text.length) {
    parts.push({
      type: 'text',
      text: text.slice(cursor),
    })
  }

  return parts
}

export function buildLinkedGlossaryState(input: {
  marathiText: string
  englishCanonical: string
  glossaryHits: GlossaryHit[]
}): LinkedGlossaryState {
  const uniqueLinks = new Map<string, GlossaryLink>()

  for (const hit of input.glossaryHits) {
    const englishMeaning = hit.meaning.trim()
    const id = `${hit.canonicalTerm}::${englishMeaning.toLowerCase()}`
    const existing = uniqueLinks.get(id)

    if (existing) {
      continue
    }

    const englishMatches: EnglishMatch[] = []
    if (englishMeaning) {
      const matcher = new RegExp(escapeRegExp(englishMeaning), 'gi')
      for (const match of input.englishCanonical.matchAll(matcher)) {
        if (typeof match.index !== 'number') {
          continue
        }

        englishMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
        })
      }
    }

    uniqueLinks.set(id, {
      id,
      marathiText: hit.matchedText,
      marathiStart: hit.start,
      marathiEnd: hit.end,
      englishMeaning,
      englishMatches,
    })
  }

  const links = [...uniqueLinks.values()]
  const marathiParts = buildParts(
    input.marathiText,
    links.map((link) => ({
      start: link.marathiStart,
      end: link.marathiEnd,
      linkId: link.id,
      title: link.englishMeaning,
    }))
  )
  const englishParts = buildParts(
    input.englishCanonical,
    links.flatMap((link) =>
      link.englishMatches.map((match) => ({
        start: match.start,
        end: match.end,
        linkId: link.id,
        title: link.marathiText,
      }))
    )
  )

  return {
    links,
    marathiParts,
    englishParts,
  }
}
