"use client"

import Link from 'next/link'
import { useState } from 'react'

import { enrichDocument } from '@/lib/api'
import type { AnalysisSessionResult } from '@/lib/api'
import { buildLinkedGlossaryState } from '@/lib/glossary-links'
import { INDIAN_LANGUAGE_OPTIONS } from '@/lib/indian-languages'


const RESULT_STORAGE_KEY = 'lokbhasha:last-result'

type ResultsDisplayProps = {
  result: AnalysisSessionResult
}

type LinkedPartProps = {
  parts: Array<{
    type: 'text' | 'link'
    text: string
    linkId?: string
    title?: string
  }>
  activeLinkId: string | null
  onActivate: (linkId: string | null) => void
}

function mergeSessionResult(
  current: AnalysisSessionResult,
  enrichment: Partial<AnalysisSessionResult>
): AnalysisSessionResult {
  return {
    ...current,
    ...(enrichment.localizedText
      ? {
          localizedText: {
            ...(current.localizedText ?? {}),
            ...enrichment.localizedText,
          },
        }
      : {}),
    ...(enrichment.simplifiedEnglish ? { simplifiedEnglish: enrichment.simplifiedEnglish } : {}),
    ...(enrichment.actions ? { actions: enrichment.actions } : {}),
  }
}

function LinkedParts({ parts, activeLinkId, onActivate }: LinkedPartProps) {
  return parts.map((part, index) =>
    part.type === 'link' ? (
      <mark
        key={`${part.linkId}-${index}`}
        title={part.title}
        onMouseEnter={() => onActivate(part.linkId ?? null)}
        onMouseLeave={() => onActivate(null)}
        className={[
          'rounded-md px-1.5 py-0.5 text-[var(--ink)] transition-colors',
          part.linkId === activeLinkId
            ? 'bg-[rgba(196,110,46,0.34)]'
            : 'bg-[rgba(141,79,42,0.18)]',
        ].join(' ')}
      >
        {part.text}
      </mark>
    ) : (
      <span key={`${part.text}-${index}`}>{part.text}</span>
    )
  )
}

export function ResultsDisplay({ result }: ResultsDisplayProps) {
  const [sessionResult, setSessionResult] = useState(result)
  const [selectedLocales, setSelectedLocales] = useState<string[]>(
    Object.keys(result.localizedText ?? {})
  )
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loadingMode, setLoadingMode] = useState<'translation' | 'explanation' | 'actions' | null>(null)

  const linkedState = buildLinkedGlossaryState({
    marathiText: sessionResult.marathiText,
    englishCanonical: sessionResult.englishCanonical,
    glossaryHits: sessionResult.glossaryHits,
  })
  const loadedLocales = sessionResult.localizedText ?? {}
  const pendingLocales = selectedLocales.filter((locale) => !loadedLocales[locale])
  const localizedEntries = INDIAN_LANGUAGE_OPTIONS
    .filter((option) => loadedLocales[option.value])
    .map((option) => [option.label, loadedLocales[option.value] as string] as const)

  function persistResult(nextResult: AnalysisSessionResult) {
    setSessionResult(nextResult)
    window.sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(nextResult))
  }

  async function requestTranslations() {
    if (!pendingLocales.length) {
      return
    }

    setError('')
    setLoadingMode('translation')
    try {
      const enrichment = await enrichDocument({
        englishCanonical: sessionResult.englishCanonical,
        requestedLocales: pendingLocales,
        includePlainExplanation: false,
        includeActions: false,
      })
      persistResult(mergeSessionResult(sessionResult, enrichment))
    } catch (enrichmentError) {
      setError(enrichmentError instanceof Error ? enrichmentError.message : 'Translation failed.')
    } finally {
      setLoadingMode(null)
    }
  }

  async function requestPlainExplanation() {
    setError('')
    setLoadingMode('explanation')
    try {
      const enrichment = await enrichDocument({
        englishCanonical: sessionResult.englishCanonical,
        requestedLocales: [],
        includePlainExplanation: true,
        includeActions: false,
      })
      persistResult(mergeSessionResult(sessionResult, enrichment))
    } catch (enrichmentError) {
      setError(enrichmentError instanceof Error ? enrichmentError.message : 'Explanation failed.')
    } finally {
      setLoadingMode(null)
    }
  }

  async function requestActions() {
    setError('')
    setLoadingMode('actions')
    try {
      const enrichment = await enrichDocument({
        englishCanonical: sessionResult.englishCanonical,
        requestedLocales: [],
        includePlainExplanation: false,
        includeActions: true,
      })
      persistResult(mergeSessionResult(sessionResult, enrichment))
    } catch (enrichmentError) {
      setError(enrichmentError instanceof Error ? enrichmentError.message : 'Action extraction failed.')
    } finally {
      setLoadingMode(null)
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col justify-between gap-6 rounded-[2rem] border border-[var(--line)] bg-[rgba(255,250,241,0.65)] p-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Analysis result</p>
            <h1 className="section-title mt-3 text-4xl md:text-6xl">Original and canonical view</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Source: {sessionResult.source === 'pdf' ? 'PDF upload' : 'Pasted Marathi text'}
              {sessionResult.extractionConfidence !== undefined
                ? ` · extraction confidence ${Math.round(sessionResult.extractionConfidence * 100)}%`
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

        <section className="paper-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Optional follow-up outputs</p>
                <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Generate only what you need</h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
                  Keep the main comparison stable, then request extra language output, a plain explanation, or key actions only when useful.
                </p>
              </div>

              {error ? (
                <div className="rounded-[1.25rem] border border-[rgba(140,55,28,0.18)] bg-[rgba(190,89,48,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <label className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Select Indian languages
                </label>
                <details className="mt-4 rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)]">
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--ink)]">
                    {selectedLocales.length
                      ? `${selectedLocales.length} language${selectedLocales.length === 1 ? '' : 's'} selected`
                      : 'Open language menu'}
                  </summary>
                  <div className="grid max-h-72 gap-2 overflow-y-auto border-t border-[var(--line)] px-4 py-4 md:grid-cols-2">
                    {INDIAN_LANGUAGE_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center gap-3 text-sm text-[var(--ink)]">
                        <input
                          type="checkbox"
                          checked={selectedLocales.includes(option.value)}
                          onChange={(event) => {
                            setSelectedLocales((current) =>
                              event.target.checked
                                ? [...current, option.value]
                                : current.filter((locale) => locale !== option.value)
                            )
                          }}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </details>
                <button
                  type="button"
                  onClick={requestTranslations}
                  disabled={!pendingLocales.length || loadingMode !== null}
                  className="mt-4 w-full rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {loadingMode === 'translation' ? 'Generating translation...' : 'Generate translation'}
                </button>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Plain explanation</p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Ask for a simpler English explanation only when someone needs a more direct version.
                </p>
                <button
                  type="button"
                  onClick={requestPlainExplanation}
                  disabled={Boolean(sessionResult.simplifiedEnglish) || loadingMode !== null}
                  className="mt-6 w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {loadingMode === 'explanation'
                    ? 'Generating explanation...'
                    : sessionResult.simplifiedEnglish
                      ? 'Plain explanation ready'
                      : 'Generate plain explanation'}
                </button>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Key actions</p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Pull out deadline-driven action lines only if the reader needs a quick task view.
                </p>
                <button
                  type="button"
                  onClick={requestActions}
                  disabled={Boolean(sessionResult.actions) || loadingMode !== null}
                  className="mt-6 w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {loadingMode === 'actions'
                    ? 'Generating actions...'
                    : sessionResult.actions
                      ? 'Key actions ready'
                      : 'Generate key actions'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <article className="paper-panel rounded-[2rem] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Original Marathi</p>
            <div className="mt-5 rounded-[1.5rem] bg-[var(--surface-strong)] p-5 text-lg leading-9 text-[var(--ink)]">
              <LinkedParts parts={linkedState.marathiParts} activeLinkId={activeLinkId} onActivate={setActiveLinkId} />
            </div>
          </article>

          <article className="paper-panel rounded-[2rem] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Canonical English</p>
            <div className="mt-5 rounded-[1.5rem] bg-[var(--surface-strong)] p-5 text-lg leading-8 text-[var(--ink)]">
              <LinkedParts parts={linkedState.englishParts} activeLinkId={activeLinkId} onActivate={setActiveLinkId} />
            </div>
          </article>
        </div>

        {linkedState.links.length ? (
          <p className="px-2 text-sm leading-6 text-[var(--muted)]">
            Hover highlighted glossary terms to compare linked meanings across the original text and canonical English.
          </p>
        ) : null}

        {sessionResult.simplifiedEnglish ? (
          <article className="rounded-[2rem] border border-[rgba(141,79,42,0.2)] bg-[rgba(141,79,42,0.08)] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Plain explanation</p>
            <div className="mt-5 text-xl leading-9 text-[var(--ink)]">{sessionResult.simplifiedEnglish}</div>
          </article>
        ) : null}

        {sessionResult.actions?.length ? (
          <article className="paper-panel rounded-[2rem] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Key actions</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {sessionResult.actions.map((item, index) => (
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
              ))}
            </div>
          </article>
        ) : null}

        {localizedEntries.length ? (
          <article className="paper-panel rounded-[2rem] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Localized outputs</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {localizedEntries.map(([label, localizedText]) => (
                <div
                  key={label}
                  className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
                  <p className="mt-3 text-base leading-7 text-[var(--ink)]">{localizedText}</p>
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </div>
    </main>
  )
}
