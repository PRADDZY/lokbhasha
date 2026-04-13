import type { ActionItem } from './types'


const REPLACEMENTS = new Map<string, string>([
  ['shall', 'must'],
  ['eligible beneficiaries', 'people who qualify'],
  ['submit applications', 'submit an application'],
  ['in accordance with', 'under'],
  ['prior to', 'before'],
  ['hereby', 'now'],
])

const ACTION_PATTERN = /\b(submit|submitted|apply|register|visit|contact|provide|attach|affix|pay|collect|report)\b/i
const DEADLINE_PATTERN = /\b(?:deadline|before|by|on or before)\b[^.\n]*/i

export function simplifyEnglishText(englishText: string): string {
  let simplified = englishText.trim()
  for (const [source, target] of REPLACEMENTS) {
    simplified = simplified.split(source).join(target)
    simplified = simplified
      .split(source.charAt(0).toUpperCase() + source.slice(1))
      .join(target.charAt(0).toUpperCase() + target.slice(1))
  }

  return simplified
}

export function extractActions(englishText: string): ActionItem[] {
  const sentences = englishText
    .split(/[.\n]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  return sentences.flatMap((sentence) => {
    if (!ACTION_PATTERN.test(sentence)) {
      return []
    }

    const deadlineMatch = sentence.match(DEADLINE_PATTERN)
    return [
      {
        action: sentence,
        deadline: deadlineMatch?.[0] ?? null,
        requirement: sentence,
      },
    ]
  })
}
