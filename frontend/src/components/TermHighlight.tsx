import type { GlossaryHit } from '@/lib/server/types'


type TermHighlightProps = {
  text: string
  glossaryHits: GlossaryHit[]
}

export function TermHighlight({ text, glossaryHits }: TermHighlightProps) {
  const sortedHits = [...glossaryHits].sort((left, right) => left.start - right.start)
  if (!sortedHits.length) {
    return <>{text}</>
  }

  const parts: Array<{ type: 'text' | 'hit'; value: string; hit?: GlossaryHit }> = []
  let cursor = 0

  for (const hit of sortedHits) {
    if (hit.start < cursor) {
      continue
    }

    if (cursor < hit.start) {
      parts.push({ type: 'text', value: text.slice(cursor, hit.start) })
    }

    parts.push({ type: 'hit', value: text.slice(hit.start, hit.end), hit })
    cursor = hit.end
  }

  if (cursor < text.length) {
    parts.push({ type: 'text', value: text.slice(cursor) })
  }

  return parts.map((part, index) =>
    part.type === 'hit' ? (
      <mark
        key={`${part.value}-${index}`}
        title={part.hit?.meaning}
        className="rounded-md bg-[rgba(141,79,42,0.18)] px-1.5 py-0.5 text-[var(--ink)]"
      >
        {part.value}
      </mark>
    ) : (
      <span key={`${part.value}-${index}`}>{part.value}</span>
    )
  )
}
