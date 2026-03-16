import type { GlossaryHit } from './types'


export function buildFallbackGlossaryHints(
  glossaryHits: GlossaryHit[],
  maxHints = 12
): Record<string, string[]> {
  const hints = new Map<string, string[]>()

  for (const hit of glossaryHits) {
    if (hints.has(hit.canonicalTerm)) {
      continue
    }

    hints.set(hit.canonicalTerm, [hit.meaning])
    if (hints.size >= maxHints) {
      break
    }
  }

  return Object.fromEntries(hints)
}
