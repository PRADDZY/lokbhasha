type TermHighlightProps = {
  text: string
  glossaryTerms: Record<string, string>
}

export function TermHighlight({ text, glossaryTerms }: TermHighlightProps) {
  const terms = Object.keys(glossaryTerms).sort((left, right) => right.length - left.length)
  if (!terms.length) {
    return <>{text}</>
  }

  const escapedTerms = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`(${escapedTerms.join('|')})`, 'g'))

  return (
    <>
      {parts.filter(Boolean).map((part, index) => {
        if (glossaryTerms[part]) {
          return (
            <mark
              key={`${part}-${index}`}
              className="rounded-md bg-[rgba(141,79,42,0.18)] px-1.5 py-0.5 text-[var(--ink)]"
            >
              {part}
            </mark>
          )
        }

        return <span key={`${part}-${index}`}>{part}</span>
      })}
    </>
  )
}