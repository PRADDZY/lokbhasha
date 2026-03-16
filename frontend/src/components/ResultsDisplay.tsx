"use client"

import Link from 'next/link'
import { useState } from 'react'

import { enrichDocument } from '@/lib/api'
import type {
  AnalysisLocalizationContext,
  AnalysisSessionResult,
} from '@/lib/api'
import { buildLinkedGlossaryState } from '@/lib/glossary-links'
import { INDIAN_LANGUAGE_OPTIONS } from '@/lib/indian-languages'
import {
  type DemoResultMetadata,
  getInitialSelectedLocales,
  writeStoredResultSession,
} from '@/lib/result-session'

type ResultsDisplayProps = {
  result: AnalysisSessionResult
  demoMetadata?: DemoResultMetadata | null
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

function resolveLocaleLabel(locale: string): string {
  if (locale === 'mr') {
    return 'Marathi (mr)'
  }

  if (locale === 'en') {
    return 'English (en)'
  }

  const option = INDIAN_LANGUAGE_OPTIONS.find((entry) => entry.value === locale)
  return option ? `${option.label} (${locale})` : locale
}

function getFallbackLocalizationContext(): AnalysisLocalizationContext {
  return {
    provider: 'lingo.dev',
    engineSelectionMode: 'implicit_default',
    engineId: null,
    sourceLocale: {
      configured: 'mr',
      recognized: 'mr',
      matchesConfigured: true,
    },
    canonicalStage: {
      requestShape: 'structured_object',
      method: 'localizeObject',
      sourceLocale: 'mr',
      targetLocale: 'en',
      fast: true,
      glossaryMode: 'none',
    },
  }
}

export function ResultsDisplay({ result, demoMetadata = null }: ResultsDisplayProps) {
  const [sessionResult, setSessionResult] = useState(result)
  const [selectedLocales, setSelectedLocales] = useState<string[]>(
    () => getInitialSelectedLocales(result, demoMetadata)
  )
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loadingMode, setLoadingMode] = useState<
    'translation' | 'explanation' | 'actions' | null
  >(null)

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
  const glossaryMatchCount = sessionResult.glossaryHits.length
  const localizationContext = sessionResult.localizationContext || getFallbackLocalizationContext()
  const sourceLabel = sessionResult.source === 'pdf' ? 'PDF upload' : 'Pasted text'
  const configuredLocaleLabel = resolveLocaleLabel(localizationContext.sourceLocale.configured)
  const recognizedSourceLabel = localizationContext.sourceLocale.matchesConfigured
    ? `${resolveLocaleLabel(localizationContext.sourceLocale.recognized)} confirmed`
    : `${resolveLocaleLabel(localizationContext.sourceLocale.recognized)} detected`
  const canonicalLocaleLabel = resolveLocaleLabel(localizationContext.canonicalStage.targetLocale)
  const canonicalStageLabel = 'Structured object request'
  const extractionConfidenceLabel =
    sessionResult.extractionConfidence === undefined
      ? ''
      : ` - extraction confidence ${Math.round(sessionResult.extractionConfidence * 100)}%`
  const sampleRouteLabel = demoMetadata ? `Live sample: ${demoMetadata.sampleTitle}` : 'Live request'
  const suggestedLocaleLabels = demoMetadata?.suggestedLocales
    ?.map((locale) => INDIAN_LANGUAGE_OPTIONS.find((option) => option.value === locale)?.label || locale)
    ?? []
  const selectedLanguageLabel =
    selectedLocales.length > 0
      ? `${selectedLocales.length} language${selectedLocales.length === 1 ? '' : 's'} selected`
      : 'Open language menu'
  const translationDisabled = pendingLocales.length === 0 || loadingMode !== null
  const translationButtonLabel =
    loadingMode === 'translation' ? 'Generating translation...' : 'Generate translation'
  const explanationReady = Boolean(sessionResult.simplifiedEnglish)
  const explanationDisabled = explanationReady || loadingMode !== null
  const explanationButtonLabel =
    loadingMode === 'explanation'
      ? 'Generating summary...'
      : explanationReady
        ? 'Summary ready'
        : 'Generate summary'
  const actionsReady = Boolean(sessionResult.actions)
  const actionsDisabled = actionsReady || loadingMode !== null
  const actionsButtonLabel =
    loadingMode === 'actions'
      ? 'Extracting action items...'
      : actionsReady
        ? 'Action items ready'
        : 'Extract action items'

  function persistResult(nextResult: AnalysisSessionResult) {
    setSessionResult(nextResult)
    writeStoredResultSession(window.sessionStorage, nextResult, demoMetadata ?? undefined)
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
      setError(enrichmentError instanceof Error ? enrichmentError.message : 'Summary failed.')
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
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">What was analyzed</p>
            <h1 className="section-title mt-3 text-4xl md:text-6xl">Original and canonical view</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Source: {sourceLabel}
              {extractionConfidenceLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{sampleRouteLabel}</p>
          </div>
          <Link
            href="/"
            className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ink)]"
          >
            Back to upload
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="paper-panel rounded-[2rem] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Source text</p>
            <p className="mt-2 text-sm text-[var(--muted)]">The source text stays visible for glossary-backed comparison.</p>
            <div className="mt-5 rounded-[1.5rem] bg-[var(--surface-strong)] p-5 text-lg leading-9 text-[var(--ink)]">
              <LinkedParts parts={linkedState.marathiParts} activeLinkId={activeLinkId} onActivate={setActiveLinkId} />
            </div>
          </article>

          <article className="paper-panel rounded-[2rem] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Canonical translation</p>
            <p className="mt-2 text-sm text-[var(--muted)]">The canonical output from the structured Lingo path.</p>
            <div className="mt-5 rounded-[1.5rem] bg-[var(--surface-strong)] p-5 text-lg leading-8 text-[var(--ink)]">
              <LinkedParts parts={linkedState.englishParts} activeLinkId={activeLinkId} onActivate={setActiveLinkId} />
            </div>
          </article>
        </div>

        {linkedState.links.length ? (
          <p className="px-2 text-sm leading-6 text-[var(--muted)]">
              Hover highlighted glossary terms to compare linked meanings across the source text and canonical translation.
          </p>
        ) : null}

        <section className="paper-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">What Lingo recognized</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Lingo.dev localization</h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
                This request validates the source locale with Lingo, sends the canonical translation stage as a structured object,
                and only generates additional languages when you explicitly ask for them.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Source locale</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{configuredLocaleLabel}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">Configured locale for the source document.</p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Recognized source</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{recognizedSourceLabel}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">Lingo source recognition runs before the canonical step.</p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Canonical locale</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{canonicalLocaleLabel}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Canonical stage</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{canonicalStageLabel}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Compact glossary hints remain {localizationContext.canonicalStage.glossaryMode === 'fallback_request_hints' ? 'attached' : 'off'}.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Glossary matches</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{glossaryMatchCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="paper-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Available outputs</p>
                <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Translations, summaries, and action items</h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
                  The canonical translation is ready. Select target languages,
                  request a plain-language summary, or extract key action items from the circular.
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
                  Translations
                </label>
                {suggestedLocaleLabels.length ? (
                  <div className="mt-4 rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Suggested locales</p>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      {suggestedLocaleLabels.join(', ')}
                    </p>
                  </div>
                ) : null}
                <details className="mt-4 rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)]">
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--ink)]">
                    {selectedLanguageLabel}
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
                  disabled={translationDisabled}
                  className="mt-4 w-full rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {translationButtonLabel}
                </button>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Plain-language summary</p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Ask for a simpler plain-language summary only when someone needs a more direct version.
                </p>
                <button
                  type="button"
                  onClick={requestPlainExplanation}
                  disabled={explanationDisabled}
                  className="mt-6 w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {explanationButtonLabel}
                </button>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Action items</p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Pull out deadline-driven action lines only if the reader needs a quick task view.
                </p>
                <button
                  type="button"
                  onClick={requestActions}
                  disabled={actionsDisabled}
                  className="mt-6 w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {actionsButtonLabel}
                </button>
              </div>
            </div>
          </div>
        </section>

        {sessionResult.simplifiedEnglish ? (
          <article className="rounded-[2rem] border border-[rgba(141,79,42,0.2)] bg-[rgba(141,79,42,0.08)] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Plain-language summary</p>
            <div className="mt-5 text-xl leading-9 text-[var(--ink)]">{sessionResult.simplifiedEnglish}</div>
          </article>
        ) : null}

        {sessionResult.actions?.length ? (
          <article className="paper-panel rounded-[2rem] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Action items</p>
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
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Lingo localized outputs</p>
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

        <section className="rounded-[2rem] border border-[var(--line)] bg-[rgba(255,250,241,0.65)] p-6 md:p-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Behind the scenes</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">How this result was produced</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Engine configuration, glossary state, and quality verification details.
              </p>
            </div>
            <Link
              href="/result/details"
              className="inline-flex rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:translate-y-[-1px] hover:opacity-95"
            >
              View details
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
