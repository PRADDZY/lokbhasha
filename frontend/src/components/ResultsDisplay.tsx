import Link from 'next/link'

import type { AnalysisResult } from '@/lib/api'

import { TermHighlight } from './TermHighlight'


type ResultsDisplayProps = {
  result: AnalysisResult
}

export function ResultsDisplay({ result }: ResultsDisplayProps) {
  const glossaryEntries = Object.entries(result.terminologyHints ?? {})
  const localizedEntries = Object.entries(result.localizedText ?? {})

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col justify-between gap-6 rounded-[2rem] border border-[var(--line)] bg-[rgba(255,250,241,0.65)] p-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Analysis result</p>
            <h1 className="section-title mt-3 text-4xl md:text-6xl">Circular breakdown</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Source: {result.source === 'pdf' ? 'PDF upload' : 'Pasted Marathi text'}
              {result.extractionConfidence !== undefined
                ? ` · extraction confidence ${Math.round(result.extractionConfidence * 100)}%`
                : ''}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ink)]"
          >
            Back to upload
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-8">
            <article className="paper-panel rounded-[2rem] p-6 md:p-8">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Original Marathi</p>
              <div className="mt-5 rounded-[1.5rem] bg-[var(--surface-strong)] p-5 text-lg leading-9 text-[var(--ink)]">
                <TermHighlight text={result.marathiText} glossaryHits={result.glossaryHits} />
              </div>
            </article>

            <article className="paper-panel rounded-[2rem] p-6 md:p-8">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Canonical English</p>
              <div className="mt-5 rounded-[1.5rem] bg-[var(--surface-strong)] p-5 text-lg leading-8 text-[var(--ink)]">
                {result.englishCanonical}
              </div>
            </article>

            <article className="rounded-[2rem] border border-[rgba(141,79,42,0.2)] bg-[rgba(141,79,42,0.08)] p-6 md:p-8">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Plain explanation</p>
              <div className="mt-5 text-xl leading-9 text-[var(--ink)]">{result.simplifiedEnglish}</div>
            </article>

            <article className="paper-panel rounded-[2rem] p-6 md:p-8">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Localized outputs</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {localizedEntries.length ? (
                  localizedEntries.map(([locale, localizedText]) => (
                    <div
                      key={locale}
                      className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{locale}</p>
                      <p className="mt-3 text-base leading-7 text-[var(--ink)]">{localizedText}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">
                    No target locales are configured yet.
                  </p>
                )}
              </div>
            </article>
          </section>

          <aside className="space-y-8">
            <article className="paper-panel rounded-[2rem] p-6 md:p-8">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Key actions</p>
              <div className="mt-5 space-y-4">
                {result.actions.length ? (
                  result.actions.map((item, index) => (
                    <div
                      key={`${item.action}-${index}`}
                      className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4"
                    >
                      <p className="text-base font-semibold text-[var(--ink)]">{item.action}</p>
                      {item.deadline ? (
                        <p className="mt-2 text-sm text-[var(--muted)]">Deadline: {item.deadline}</p>
                      ) : null}
                      {item.requirement ? (
                        <p className="mt-1 text-sm text-[var(--muted)]">Context: {item.requirement}</p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">
                    No explicit action phrases were detected yet.
                  </p>
                )}
              </div>
            </article>

            <article className="paper-panel rounded-[2rem] p-6 md:p-8">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Terminology sent to Lingo</p>
              <div className="mt-5 space-y-3">
                {glossaryEntries.length ? (
                  glossaryEntries.map(([marathi, englishSuggestions]) => (
                    <div
                      key={marathi}
                      className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4"
                    >
                      <p className="text-lg font-semibold text-[var(--ink)]">{marathi}</p>
                      <p className="mt-1 text-sm uppercase tracking-[0.16em] text-[var(--muted)]">
                        {englishSuggestions.join(' · ')}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">
                    No glossary terms were detected for this text.
                  </p>
                )}
              </div>
            </article>
          </aside>
        </div>
      </div>
    </main>
  )
}
