"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

import {
  fetchGlossaryStatus,
  fetchLingoSetup,
  fetchQualitySummary,
  runBaselineComparison,
} from '@/lib/api'
import type {
  AnalysisComparisonResult,
  AnalysisSessionResult,
  GlossarySyncStatus,
  LingoSetupSummary,
  QualitySummary,
} from '@/lib/api'
import { INDIAN_LANGUAGE_OPTIONS } from '@/lib/indian-languages'
import { readStoredResultSession } from '@/lib/result-session'

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

export default function DetailsPage() {
  const [sessionResult, setSessionResult] = useState<AnalysisSessionResult | null>(null)
  const [glossaryStatus, setGlossaryStatus] = useState<GlossarySyncStatus | null>(null)
  const [lingoSetup, setLingoSetup] = useState<LingoSetupSummary | null>(null)
  const [qualitySummary, setQualitySummary] = useState<QualitySummary | null>(null)
  const [baselineComparison, setBaselineComparison] = useState<AnalysisComparisonResult | null>(null)
  const [glossaryStatusError, setGlossaryStatusError] = useState('')
  const [lingoSetupError, setLingoSetupError] = useState('')
  const [qualitySummaryError, setQualitySummaryError] = useState('')
  const [baselineComparisonError, setBaselineComparisonError] = useState('')
  const [loadingBaseline, setLoadingBaseline] = useState(false)

  useEffect(() => {
    const storedSession = readStoredResultSession(window.sessionStorage)
    setSessionResult(storedSession.result)
  }, [])

  useEffect(() => {
    let isCancelled = false

    void fetchGlossaryStatus()
      .then((status) => {
        if (isCancelled) return
        setGlossaryStatus(status)
        setGlossaryStatusError('')
      })
      .catch((glossaryError) => {
        if (isCancelled) return
        setGlossaryStatusError(
          glossaryError instanceof Error ? glossaryError.message : 'Glossary sync status failed to load.'
        )
      })

    void fetchLingoSetup()
      .then((setup) => {
        if (isCancelled) return
        setLingoSetup(setup)
        setLingoSetupError('')
      })
      .catch((setupError) => {
        if (isCancelled) return
        setLingoSetupError(
          setupError instanceof Error ? setupError.message : 'Lingo setup failed to load.'
        )
      })

    void fetchQualitySummary()
      .then((summary) => {
        if (isCancelled) return
        setQualitySummary(summary)
        setQualitySummaryError('')
      })
      .catch((summaryError) => {
        if (isCancelled) return
        setQualitySummaryError(
          summaryError instanceof Error ? summaryError.message : 'Quality summary failed to load.'
        )
      })

    return () => {
      isCancelled = true
    }
  }, [])

  async function requestBaselineComparison() {
    if (!sessionResult) return
    setBaselineComparisonError('')
    setLoadingBaseline(true)
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
      setLoadingBaseline(false)
    }
  }

  if (!sessionResult) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="paper-panel max-w-2xl rounded-[2rem] p-10 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">No result loaded</p>
          <h1 className="section-title mt-4 text-5xl">Run an analysis first</h1>
          <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
            The details page reads the latest analysis from this browser session. Start from the upload screen.
          </p>
          <Link href="/" className="mt-8 inline-flex rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white">
            Back to upload
          </Link>
        </div>
      </main>
    )
  }

  const localizationContext = sessionResult.localizationContext
  const engineLabel = localizationContext
    ? localizationContext.engineSelectionMode === 'explicit'
      ? localizationContext.engineId || 'Configured Lingo setup'
      : 'Organization default'
    : 'Unknown'

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
        'Source',
        'Canonical',
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

  const glossarySyncStateLabel =
    glossaryStatus?.syncState === 'ready'
      ? 'Ready'
      : glossaryStatus?.syncState === 'drift'
        ? 'Drift detected'
        : glossaryStatus?.syncState === 'missing'
          ? 'Not prepared'
          : 'Loading'
  const glossaryAuthorityLabel = glossaryStatus?.authority === 'lingo_mcp' ? 'Lingo MCP' : 'Loading'
  const glossaryManagementLabel = glossaryStatus?.managementMode === 'mcp_only'
    ? 'Read-only in LokBhasha'
    : 'Unavailable'
  const fallbackModeLabel =
    glossaryStatus?.fallbackMode === 'compact_request_hints'
      ? 'Compact request hints'
      : 'Unavailable'
  const glossaryPreparedLabel = glossaryStatus?.lastPreparedAt
    ? glossaryStatus.lastPreparedAt.slice(0, 10)
    : 'Not prepared'
  const glossaryLastKnownSyncLabel = glossaryStatus?.lastSyncedAt
    ? glossaryStatus.lastSyncedAt.slice(0, 10)
    : 'Not recorded'
  const glossaryPreviewEntries = glossaryStatus?.previewEntries ?? []

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
        'Source',
        'Canonical',
        ...qualitySummary.selectedTargetLocales
          .slice(0, 3)
          .map((locale) => INDIAN_LANGUAGE_OPTIONS.find((option) => option.value === locale)?.label || locale),
        ...(qualitySummary.selectedTargetLocales.length > 3
          ? [`+${qualitySummary.selectedTargetLocales.length - 3} more`]
          : []),
      ].join(', ')
    : 'Waiting for locale readiness.'
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
  const baselineCompareButtonLabel =
    loadingBaseline
      ? 'Running baseline comparison...'
      : 'Run baseline comparison'
  const baselineChangeSummary = baselineComparison
    ? baselineComparison.sameAsCurrent
      ? `Current canonical result matches the baseline result. ${baselineComparison.glossaryMatchCount} glossary matches were found, and ${baselineComparison.hintTermCount} compact hints were ready if needed.`
      : `Glossary context changed the canonical wording. ${baselineComparison.glossaryMatchCount} glossary matches were found, and ${baselineComparison.hintTermCount} compact hints were ready if needed.`
    : ''

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col justify-between gap-6 rounded-[2rem] border border-[var(--line)] bg-[rgba(255,250,241,0.65)] p-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Behind the scenes</p>
            <h1 className="section-title mt-3 text-4xl md:text-6xl">How this result was produced</h1>
            <div className="mt-4 inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--ink)]">
              {engineLabel}
            </div>
          </div>
          <Link
            href="/result"
            className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ink)]"
          >
            Back to results
          </Link>
        </div>

        <section className="paper-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Engine configuration</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Lingo.dev setup</h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
                This shows the Lingo configuration used for this result.
                Only current settings are shown. Missing fields are marked clearly.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Active setup</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{lingoSetupLabel}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{lingoSetupDetail}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Locale coverage</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{lingoLocaleCoverageValue}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{lingoLocaleCoverageDetail}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Brand voice</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{brandVoiceValue}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{brandVoiceDetail}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Instructions</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{instructionValue}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{instructionDetail}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">AI reviewers</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{reviewerValue}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{reviewerDetail}</p>
              </div>
            </div>

            {lingoSetupError ? (
              <div className="rounded-[1.25rem] border border-[rgba(140,55,28,0.18)] bg-[rgba(190,89,48,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
                {lingoSetupError}
              </div>
            ) : null}
          </div>
        </section>

        <section className="paper-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Glossary state</p>
                <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Lingo glossary coverage</h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
                  Lingo remains the authoritative glossary layer for translation behavior, while SQLite still handles fast local term detection.
                  This panel shows whether the packaged Lingo glossary view is ready, how much coverage it has, and which fallback request hints remain enabled while runtime requests stay compact.
                </p>
              </div>
              <div className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)]">
                {glossarySyncStateLabel}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Glossary coverage</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                  {glossaryStatus ? `${glossaryStatus.totalTerms} terms` : 'Loading glossary status...'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Authority</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{glossaryAuthorityLabel}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{glossaryManagementLabel}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Fallback request hints</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{fallbackModeLabel}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Last prepared</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{glossaryPreparedLabel}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Custom translations</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                  {glossaryStatus ? glossaryStatus.customTranslationTerms : 'Loading'}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Local detection runs from the packaged SQLite artifact.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Last known Lingo sync</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{glossaryLastKnownSyncLabel}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  LokBhasha is read-only here. Use Lingo MCP for glossary management changes.
                </p>
              </div>
            </div>

            {glossaryStatusError ? (
              <div className="rounded-[1.25rem] border border-[rgba(140,55,28,0.18)] bg-[rgba(190,89,48,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
                {glossaryStatusError}
              </div>
            ) : null}

            {glossaryPreviewEntries.length ? (
              <div className="grid gap-3 md:grid-cols-2">
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
            ) : null}
          </div>
        </section>

        <section className="paper-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Quality verification</p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Quality checks</h2>
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
                  disabled={loadingBaseline}
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

            {baselineComparison ? (
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-5">
                <div className="flex flex-col gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Baseline comparison</p>
                  <h3 className="text-2xl font-semibold text-[var(--ink)]">Baseline comparison results</h3>
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
                    <p className="mt-3 text-base leading-7 text-[var(--ink)]">{baselineComparison.baselineText}</p>
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
      </div>
    </main>
  )
}
