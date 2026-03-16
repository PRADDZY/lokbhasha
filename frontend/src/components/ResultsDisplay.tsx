"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

import {
  enrichDocument,
  fetchGlossaryStatus,
  fetchLingoSetup,
  fetchQualitySummary,
  runBaselineComparison,
} from '@/lib/api'
import type {
  AnalysisComparisonResult,
  AnalysisLocalizationContext,
  AnalysisSessionResult,
  GlossarySyncStatus,
  LingoSetupSummary,
  QualitySummary,
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
  const [glossaryStatus, setGlossaryStatus] = useState<GlossarySyncStatus | null>(null)
  const [lingoSetup, setLingoSetup] = useState<LingoSetupSummary | null>(null)
  const [qualitySummary, setQualitySummary] = useState<QualitySummary | null>(null)
  const [baselineComparison, setBaselineComparison] = useState<AnalysisComparisonResult | null>(null)
  const [selectedLocales, setSelectedLocales] = useState<string[]>(
    () => getInitialSelectedLocales(result, demoMetadata)
  )
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loadingMode, setLoadingMode] = useState<
    'translation' | 'explanation' | 'actions' | 'baseline' | null
  >(null)
  const [glossaryStatusError, setGlossaryStatusError] = useState('')
  const [lingoSetupError, setLingoSetupError] = useState('')
  const [qualitySummaryError, setQualitySummaryError] = useState('')
  const [baselineComparisonError, setBaselineComparisonError] = useState('')

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
  const sourceLabel = sessionResult.source === 'pdf' ? 'PDF upload' : 'Pasted Marathi text'
  const configuredLocaleLabel = resolveLocaleLabel(localizationContext.sourceLocale.configured)
  const recognizedSourceLabel = localizationContext.sourceLocale.matchesConfigured
    ? `${resolveLocaleLabel(localizationContext.sourceLocale.recognized)} confirmed`
    : `${resolveLocaleLabel(localizationContext.sourceLocale.recognized)} detected`
  const canonicalLocaleLabel = resolveLocaleLabel(localizationContext.canonicalStage.targetLocale)
  const canonicalStageLabel = 'Structured object request'
  const engineLabel = localizationContext.engineSelectionMode === 'explicit'
    ? localizationContext.engineId || 'Configured Lingo setup'
    : 'Organization default'
  const localizedLocaleLabel =
    localizedEntries.length > 0 ? localizedEntries.map(([label]) => label).join(', ') : 'Generate when needed'
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
      ? 'Generating explanation...'
      : explanationReady
        ? 'Plain explanation ready'
        : 'Generate plain explanation'
  const actionsReady = Boolean(sessionResult.actions)
  const actionsDisabled = actionsReady || loadingMode !== null
  const actionsButtonLabel =
    loadingMode === 'actions'
      ? 'Generating actions...'
      : actionsReady
        ? 'Key actions ready'
        : 'Generate key actions'
  const glossarySyncStateLabel =
    glossaryStatus?.syncState === 'ready'
      ? 'Ready'
      : glossaryStatus?.syncState === 'drift'
        ? 'Drift detected'
        : glossaryStatus?.syncState === 'missing'
          ? 'Not prepared'
          : 'Loading'
  const fallbackModeLabel =
    glossaryStatus?.fallbackMode === 'compact_request_hints'
      ? 'Compact request hints'
      : 'Unavailable'
  const glossaryAuthorityLabel = glossaryStatus?.authority === 'lingo_mcp' ? 'Lingo MCP' : 'Loading'
  const glossaryManagementLabel = glossaryStatus?.managementMode === 'mcp_only'
    ? 'Read-only in LokBhasha'
    : 'Unavailable'
  const glossaryPreparedLabel = glossaryStatus?.lastPreparedAt
    ? glossaryStatus.lastPreparedAt.slice(0, 10)
    : 'Not prepared'
  const glossaryLastKnownSyncLabel = glossaryStatus?.lastSyncedAt
    ? glossaryStatus.lastSyncedAt.slice(0, 10)
    : 'Not recorded'
  const glossaryPreviewEntries = glossaryStatus?.previewEntries ?? []
  const lingoSetupLabel =
    lingoSetup?.engine.status === 'default_org_engine'
      ? 'Default setup'
      : 'Explicit setup'
  const lingoSetupDetail = lingoSetup?.engine.note ?? 'No explicit setup selected'
  const lingoLocaleCoverageValue = lingoSetup
    ? `${lingoSetup.selectedTargetLocales.length + 2} locales`
    : 'Loading setup...'
  const lingoLocaleCoverageDetail = lingoSetup
    ? [
        'Marathi',
        'English',
        ...lingoSetup.selectedTargetLocales
          .slice(0, 2)
          .map((locale) => INDIAN_LANGUAGE_OPTIONS.find((option) => option.value === locale)?.label || locale),
        ...(lingoSetup.selectedTargetLocales.length > 2
          ? [`+${lingoSetup.selectedTargetLocales.length - 2} more`]
          : []),
      ].join(', ')
    : 'No locale list found'
  const brandVoiceValue = lingoSetup
    ? lingoSetup.layers.brandVoices.configuredCount > 0
      ? 'Present'
      : 'Not provided'
    : 'Loading'
  const brandVoiceDetail = lingoSetup
    ? lingoSetup.layers.brandVoices.configuredCount > 0
      ? 'Brand voice is included'
      : 'No brand voice attached'
    : 'No brand voice attached'
  const instructionValue = lingoSetup
    ? `${lingoSetup.layers.instructions.configuredCount} instructions`
    : 'Loading'
  const instructionDetail = lingoSetup
    ? lingoSetup.layers.instructions.configuredCount > 0
      ? 'Included in this setup'
      : 'No extra instructions added'
    : 'No extra instructions added'
  const reviewerValue = lingoSetup
    ? lingoSetup.layers.aiReviewers.configuredCount > 0
      ? `${lingoSetup.layers.aiReviewers.configuredCount} reviewers`
      : 'No reviewers listed'
    : 'Loading'
  const reviewerDetail = lingoSetup
    ? lingoSetup.layers.aiReviewers.configuredCount > 0
      ? 'Reviewer names are listed'
      : 'No reviewer names found'
    : 'No reviewer names found'
  const reviewerStatusValue = qualitySummary
    ? qualitySummary.layerStates.aiReviewers === 'ready'
      ? 'Ready'
      : 'Not surfaced'
    : 'Loading'
  const reviewerStatusDetail = qualitySummary
    ? qualitySummary.layerStates.aiReviewers === 'ready'
      ? 'AI reviewers are surfaced for this setup.'
      : 'No AI reviewer status is surfaced yet.'
    : 'Waiting for quality summary.'
  const qualityGlossaryCoverageValue = qualitySummary
    ? `${qualitySummary.glossaryStatus.totalTerms} terms`
    : 'Loading quality summary...'
  const qualityGlossaryCoverageDetail = qualitySummary
    ? qualitySummary.glossaryStatus.lastSyncedAt
      ? `Last known Lingo sync ${qualitySummary.glossaryStatus.lastSyncedAt.slice(0, 10)}`
      : 'Local package is prepared separately from MCP sync.'
    : 'Waiting for quality summary.'
  const localeReadinessValue = qualitySummary
    ? `${qualitySummary.selectedTargetLocales.length + 2} locales ready`
    : 'Loading'
  const localeReadinessDetail = qualitySummary
    ? [
        'Marathi',
        'English',
        ...qualitySummary.selectedTargetLocales
          .slice(0, 3)
          .map((locale) => INDIAN_LANGUAGE_OPTIONS.find((option) => option.value === locale)?.label || locale),
        ...(qualitySummary.selectedTargetLocales.length > 3
          ? [`+${qualitySummary.selectedTargetLocales.length - 3} more`]
          : []),
      ].join(', ')
    : 'Waiting for locale readiness.'
  const baselineComparisonReady = Boolean(baselineComparison)
  const baselineCompareDisabled = loadingMode !== null
  const baselineCompareButtonLabel =
    loadingMode === 'baseline'
      ? 'Running baseline comparison...'
      : 'Run baseline comparison'
  const baselineComparisonValue = baselineComparison
    ? baselineComparison.sameAsCurrent
      ? 'No wording change'
      : 'Wording changed'
    : 'Ready to compare'
  const baselineComparisonDetail = baselineComparison
    ? baselineComparison.sameAsCurrent
      ? 'Current canonical result matches the baseline result.'
      : 'Glossary context changed the canonical wording.'
    : 'Baseline uses the same request without glossary hints.'
  const baselineChangeSummary = baselineComparison
    ? baselineComparison.sameAsCurrent
      ? `Current canonical result matches the baseline result. ${baselineComparison.glossaryMatchCount} glossary matches were found, and ${baselineComparison.hintTermCount} compact hints were ready if needed.`
      : `Glossary context changed the canonical wording. ${baselineComparison.glossaryMatchCount} glossary matches were found, and ${baselineComparison.hintTermCount} compact hints were ready if needed.`
    : ''

  useEffect(() => {
    let isCancelled = false

    void fetchGlossaryStatus()
      .then((status) => {
        if (isCancelled) {
          return
        }

        setGlossaryStatus(status)
        setGlossaryStatusError('')
      })
      .catch((glossaryError) => {
        if (isCancelled) {
          return
        }

        setGlossaryStatusError(
          glossaryError instanceof Error ? glossaryError.message : 'Glossary sync status failed to load.'
        )
      })

    void fetchLingoSetup()
      .then((setup) => {
        if (isCancelled) {
          return
        }

        setLingoSetup(setup)
        setLingoSetupError('')
      })
      .catch((setupError) => {
        if (isCancelled) {
          return
        }

        setLingoSetupError(
          setupError instanceof Error ? setupError.message : 'Lingo setup failed to load.'
        )
      })

    void fetchQualitySummary()
      .then((summary) => {
        if (isCancelled) {
          return
        }

        setQualitySummary(summary)
        setQualitySummaryError('')
      })
      .catch((summaryError) => {
        if (isCancelled) {
          return
        }

        setQualitySummaryError(
          summaryError instanceof Error ? summaryError.message : 'Quality summary failed to load.'
        )
      })

    return () => {
      isCancelled = true
    }
  }, [])

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

  async function requestBaselineComparison() {
    setBaselineComparisonError('')
    setLoadingMode('baseline')
    try {
      const comparison = await runBaselineComparison({
        marathiText: sessionResult.marathiText,
        englishCanonical: sessionResult.englishCanonical,
      })
      setBaselineComparison(comparison)
    } catch (comparisonError) {
      setBaselineComparisonError(
        comparisonError instanceof Error ? comparisonError.message : 'Baseline comparison failed.'
      )
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
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Original Marathi</p>
            <p className="mt-2 text-sm text-[var(--muted)]">The source text stays visible for glossary-backed comparison.</p>
            <div className="mt-5 rounded-[1.5rem] bg-[var(--surface-strong)] p-5 text-lg leading-9 text-[var(--ink)]">
              <LinkedParts parts={linkedState.marathiParts} activeLinkId={activeLinkId} onActivate={setActiveLinkId} />
            </div>
          </article>

          <article className="paper-panel rounded-[2rem] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Canonical English</p>
            <p className="mt-2 text-sm text-[var(--muted)]">What canonical English came out of the structured Lingo path.</p>
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

        <section className="paper-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">What Lingo recognized</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Lingo.dev localization</h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
                This request validates the source locale with Lingo, sends the canonical English stage as a structured object,
                and only generates additional languages when you explicitly ask for them.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Active engine</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{engineLabel}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {localizationContext.engineSelectionMode === 'explicit'
                    ? 'A configured Lingo setup id is attached to this request.'
                    : 'The organization default Lingo setup handled this request.'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Generated locales</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{localizedLocaleLabel}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Glossary matches</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{glossaryMatchCount}</p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Lingo setup</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--ink)]">Read-only setup summary</h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                  This shows the Lingo configuration used for this result.
                </p>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                  Only current settings are shown. Missing fields are marked clearly.
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Active setup</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{lingoSetupLabel}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{lingoSetupDetail}</p>
                </div>
                <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Locale coverage</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{lingoLocaleCoverageValue}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{lingoLocaleCoverageDetail}</p>
                </div>
                <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Brand voice</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{brandVoiceValue}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{brandVoiceDetail}</p>
                </div>
                <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Instructions</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{instructionValue}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{instructionDetail}</p>
                </div>
                <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">AI reviewers</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{reviewerValue}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{reviewerDetail}</p>
                </div>
              </div>

              {lingoSetupError ? (
                <div className="mt-4 rounded-[1.25rem] border border-[rgba(140,55,28,0.18)] bg-[rgba(190,89,48,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
                  {lingoSetupError}
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">What glossary matched</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[var(--ink)]">Lingo glossary package</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                    Lingo remains the authoritative glossary layer for translation behavior, while SQLite still handles fast local term detection.
                    This panel shows whether the packaged Lingo glossary view is ready, how much coverage it has, and which fallback request hints remain enabled while runtime requests stay compact.
                  </p>
                </div>
                <div className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)]">
                  {glossarySyncStateLabel}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Glossary coverage</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                    {glossaryStatus ? `${glossaryStatus.totalTerms} terms` : 'Loading glossary status...'}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Authority</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{glossaryAuthorityLabel}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{glossaryManagementLabel}</p>
                </div>
                <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Fallback request hints</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{fallbackModeLabel}</p>
                </div>
                <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Last prepared</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{glossaryPreparedLabel}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Custom translations</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                    {glossaryStatus ? glossaryStatus.customTranslationTerms : 'Loading'}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Local detection runs from the packaged SQLite artifact.
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Last known Lingo sync</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{glossaryLastKnownSyncLabel}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    LokBhasha is read-only here. Use Lingo MCP for glossary management changes.
                  </p>
                </div>
              </div>

              {glossaryStatusError ? (
                <div className="mt-4 rounded-[1.25rem] border border-[rgba(140,55,28,0.18)] bg-[rgba(190,89,48,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
                  {glossaryStatusError}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {glossaryPreviewEntries.map((entry) => (
                  <div
                    key={`${entry.sourceText}-${entry.targetText}`}
                    className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{entry.type}</p>
                    <p className="mt-3 text-base font-semibold text-[var(--ink)]">
                      {entry.sourceText} {'->'} {entry.targetText}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {entry.sourceLocale} to {entry.targetLocale}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="paper-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Quality check</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Quality check</h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
                Review status, glossary coverage, locale readiness, and a direct comparison with a baseline result.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Reviewer status</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{reviewerStatusValue}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{reviewerStatusDetail}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Glossary coverage</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{qualityGlossaryCoverageValue}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{qualityGlossaryCoverageDetail}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Locale readiness</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{localeReadinessValue}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{localeReadinessDetail}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Baseline comparison</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{baselineComparisonValue}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{baselineComparisonDetail}</p>
                <button
                  type="button"
                  onClick={requestBaselineComparison}
                  disabled={baselineCompareDisabled}
                  className="mt-4 w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {baselineCompareButtonLabel}
                </button>
              </div>
            </div>

            {qualitySummaryError ? (
              <div className="rounded-[1.25rem] border border-[rgba(140,55,28,0.18)] bg-[rgba(190,89,48,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
                {qualitySummaryError}
              </div>
            ) : null}

            {baselineComparisonError ? (
              <div className="rounded-[1.25rem] border border-[rgba(140,55,28,0.18)] bg-[rgba(190,89,48,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
                {baselineComparisonError}
              </div>
            ) : null}

            {baselineComparisonReady ? (
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-5">
                <div className="flex flex-col gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Baseline comparison</p>
                  <h3 className="text-2xl font-semibold text-[var(--ink)]">Canonical vs baseline</h3>
                  <p className="text-sm text-[var(--muted)]">
                    Baseline uses the same request without glossary hints.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Current canonical result</p>
                    <p className="mt-3 text-base leading-7 text-[var(--ink)]">{sessionResult.englishCanonical}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Baseline result without glossary hints</p>
                    <p className="mt-3 text-base leading-7 text-[var(--ink)]">{baselineComparison?.baselineText}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">What changed</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{baselineChangeSummary}</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="paper-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">What you can generate next</p>
                <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Generate only what you need</h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
                  Keep the main comparison stable, then request selected Indian languages, a plain explanation, or key actions only when useful.
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
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Plain explanation</p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Ask for a simpler English explanation only when someone needs a more direct version.
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
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Key actions</p>
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
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">3. Plain-language English</p>
            <div className="mt-5 text-xl leading-9 text-[var(--ink)]">{sessionResult.simplifiedEnglish}</div>
          </article>
        ) : null}

        {sessionResult.actions?.length ? (
          <article className="paper-panel rounded-[2rem] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">4. Key actions</p>
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
      </div>
    </main>
  )
}
