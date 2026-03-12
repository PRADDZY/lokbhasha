"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import type { AnalysisResult } from '@/lib/api'


const RESULT_STORAGE_KEY = 'lokbhasha:last-result'

function highlightTerms(text: string, glossaryTerms: Record<string, string>) {
  const terms = Object.keys(glossaryTerms).sort((left, right) => right.length - left.length)
  if (!terms.length) {
    return [text]
  }

  const escapedTerms = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`(${escapedTerms.join('|')})`, 'g'))

  return parts.filter(Boolean).map((part, index) => {
    if (glossaryTerms[part]) {
      return (
        <mark key={`${part}-${index}`} className="rounded-md bg-[rgba(141,79,42,0.18)] px-1.5 py-0.5 text-[var(--ink)]">
          {part}
        </mark>
      )
    }

    return <span key={`${part}-${index}`}>{part}</span>
  })
}

export default function ResultPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null)

  useEffect(() => {
    const storedValue = window.sessionStorage.getItem(RESULT_STORAGE_KEY)
    if (!storedValue) {
      return
    }

    setResult(JSON.parse(storedValue) as AnalysisResult)
  }, [])

  const glossaryEntries = useMemo(
    () => Object.entries(result?.glossary_terms ?? {}),
    [result],
  )

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="paper-panel max-w-2xl rounded-[2rem] p-10 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">No result loaded</p>
          <h1 className="section-title mt-4 text-5xl">Run an analysis first</h1>
          <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
            The results page reads the latest analysis from this browser session. Start from the upload screen.
          </p>
          <Link href="/" className="mt-8 inline-flex rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white">
            Back to upload
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col justify-between gap-6 rounded-[2rem] border border-[var(--line)] bg-[rgba(255,250,241,0.65)] p-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Analysis result</p>
            <h1 className="section-title mt-3 text-4xl md:text-6xl">Circular breakdown</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Source: {result.source === 'pdf' ? 'PDF upload' : 'Pasted Marathi text'}
              {result.extractionConfidence !== undefined ? ` · extraction confidence ${Math.round(result.extractionConfidence * 100)}%` : ''}
            </p>
          </div>
          <Link href="/" className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ink)]">
            Back to upload
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-8">
            <article className="paper-panel rounded-[2rem] p-6 md:p-8">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Original Marathi</p>
              <div className="mt-5 rounded-[1.5rem] bg-[var(--surface-strong)] p-5 text-lg leading-9 text-[var(--ink)]">
                {highlightTerms(result.marathi, result.glossary_terms)}
              </div>
            </article>

            <article className="paper-panel rounded-[2rem] p-6 md:p-8">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">English translation</p>
              <div className="mt-5 rounded-[1.5rem] bg-[var(--surface-strong)] p-5 text-lg leading-8 text-[var(--ink)]">
                {result.english}
              </div>
            </article>

            <article className="rounded-[2rem] border border-[rgba(141,79,42,0.2)] bg-[rgba(141,79,42,0.08)] p-6 md:p-8">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Plain explanation</p>
              <div className="mt-5 text-xl leading-9 text-[var(--ink)]">{result.simplified}</div>
            </article>
          </section>

          <aside className="space-y-8">
            <article className="paper-panel rounded-[2rem] p-6 md:p-8">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Key actions</p>
              <div className="mt-5 space-y-4">
                {result.actions.length ? (
                  result.actions.map((item, index) => (
                    <div key={`${item.action}-${index}`} className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                      <p className="text-base font-semibold text-[var(--ink)]">{item.action}</p>
                      {item.deadline ? <p className="mt-2 text-sm text-[var(--muted)]">Deadline: {item.deadline}</p> : null}
                      {item.requirement ? <p className="mt-1 text-sm text-[var(--muted)]">Context: {item.requirement}</p> : null}
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
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Highlighted terms</p>
              <div className="mt-5 space-y-3">
                {glossaryEntries.length ? (
                  glossaryEntries.map(([marathi, english]) => (
                    <div key={marathi} className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                      <p className="text-lg font-semibold text-[var(--ink)]">{marathi}</p>
                      <p className="mt-1 text-sm uppercase tracking-[0.16em] text-[var(--muted)]">{english}</p>
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
