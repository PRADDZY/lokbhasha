"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { fetchGlossaryStatus, fetchLingoSetup } from '@/lib/api'
import type { GlossarySyncStatus, LingoSetupSummary } from '@/lib/types'


type GlossaryAdminState = {
  glossaryStatus: GlossarySyncStatus | null
  lingoSetup: LingoSetupSummary | null
  glossaryError: string
  setupError: string
}

function GlossaryStatusCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{value}</p>
    </div>
  )
}

export default function GlossaryDemoPage() {
  const [state, setState] = useState<GlossaryAdminState>({
    glossaryStatus: null,
    lingoSetup: null,
    glossaryError: '',
    setupError: '',
  })

  useEffect(() => {
    let cancelled = false

    async function loadGlossaryAdminState() {
      const [glossaryStatusResult, lingoSetupResult] = await Promise.allSettled([
        fetchGlossaryStatus(),
        fetchLingoSetup(),
      ])

      if (cancelled) {
        return
      }

      setState({
        glossaryStatus: glossaryStatusResult.status === 'fulfilled' ? glossaryStatusResult.value : null,
        lingoSetup: lingoSetupResult.status === 'fulfilled' ? lingoSetupResult.value : null,
        glossaryError:
          glossaryStatusResult.status === 'rejected'
            ? glossaryStatusResult.reason instanceof Error
              ? glossaryStatusResult.reason.message
              : 'Glossary status failed to load.'
            : '',
        setupError:
          lingoSetupResult.status === 'rejected'
            ? lingoSetupResult.reason instanceof Error
              ? lingoSetupResult.reason.message
              : 'Lingo setup failed to load.'
            : '',
      })
    }

    void loadGlossaryAdminState()

    return () => {
      cancelled = true
    }
  }, [])

  const { glossaryStatus, lingoSetup, glossaryError, setupError } = state

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="paper-panel rounded-[2rem] p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Hidden glossary route</p>
              <h1 className="section-title mt-3 text-4xl md:text-6xl">Lingo MCP glossary status</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--muted)]">
                This is a read-only glossary page for operators and demos. The active source is{' '}
                <code>dict/19k.json</code>, SQLite stays local for detection, and Lingo MCP is the management path for authoritative glossary changes.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ink)]"
            >
              Back to home
            </Link>
          </div>
        </section>

        <section className="paper-panel rounded-[2rem] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Management mode</p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Read-only in LokBhasha</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            LokBhasha does not create glossary entries here. It prepares the local detection package, surfaces drift, and points operators
            to Lingo MCP for glossary changes and sync operations.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <GlossaryStatusCard label="Authority" value={glossaryStatus?.authority === 'lingo_mcp' ? 'Lingo MCP' : 'Unavailable'} />
            <GlossaryStatusCard label="Detection store" value={glossaryStatus?.detectionStore ?? 'Loading'} />
            <GlossaryStatusCard label="Sync state" value={glossaryStatus?.syncState ?? 'Loading'} />
            <GlossaryStatusCard
              label="Engine mode"
              value={lingoSetup?.engine.selectionMode === 'explicit' ? 'Explicit setup' : 'Default setup'}
            />
          </div>

          {glossaryError ? (
            <div className="mt-4 rounded-[1.25rem] border border-[rgba(140,55,28,0.18)] bg-[rgba(190,89,48,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
              {glossaryError}
            </div>
          ) : null}

          {setupError ? (
            <div className="mt-4 rounded-[1.25rem] border border-[rgba(140,55,28,0.18)] bg-[rgba(190,89,48,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
              {setupError}
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="paper-panel rounded-[2rem] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Source and package</p>
            <div className="mt-5 space-y-4">
              <GlossaryStatusCard label="Authoritative engine" value={glossaryStatus?.authoritativeEngineName ?? 'Not recorded'} />
              <GlossaryStatusCard label="Active source file" value={glossaryStatus?.sourcePath ?? 'dict/19k.json'} />
              <GlossaryStatusCard
                label="Runtime glossary binding"
                value={glossaryStatus?.runtimeArtifactPath ?? 'cloudflare:d1:GLOSSARY_DB'}
              />
              <GlossaryStatusCard label="Prepared locally" value={glossaryStatus?.lastPreparedAt ?? 'Not prepared'} />
              <GlossaryStatusCard label="Last known Lingo sync" value={glossaryStatus?.lastSyncedAt ?? 'Not recorded'} />
            </div>
          </article>

          <article className="paper-panel rounded-[2rem] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Glossary coverage</p>
            <div className="mt-5 space-y-4">
              <GlossaryStatusCard label="Total terms" value={glossaryStatus ? `${glossaryStatus.totalTerms} terms` : 'Loading'} />
              <GlossaryStatusCard label="Remote glossary count" value={String(glossaryStatus?.remoteGlossaryTermCount ?? 'Not recorded')} />
              <GlossaryStatusCard label="Custom translations" value={String(glossaryStatus?.customTranslationTerms ?? 'Loading')} />
              <GlossaryStatusCard label="Fallback hints" value={glossaryStatus?.fallbackMode ?? 'Unavailable'} />
              <GlossaryStatusCard label="Target locales" value={lingoSetup ? lingoSetup.selectedTargetLocales.join(', ') : 'Loading'} />
            </div>
          </article>
        </section>

        <section className="paper-panel rounded-[2rem] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Engine layers</p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Brand voices, instructions and reviewers</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            These layers are configured on the Lingo dashboard and applied automatically by the SDK during translation.
            Status reflects the currently deployed environment configuration.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <GlossaryStatusCard
              label="Brand voices"
              value={lingoSetup?.layers.brandVoices.status === 'ready' ? 'Active' : 'Not configured'}
            />
            <GlossaryStatusCard
              label="Custom instructions"
              value={lingoSetup?.layers.instructions.status === 'ready' ? 'Active' : 'Not configured'}
            />
            <GlossaryStatusCard
              label="AI reviewers"
              value={lingoSetup?.layers.aiReviewers.status === 'ready' ? 'Active' : 'Not configured'}
            />
          </div>
        </section>

        <section className="paper-panel rounded-[2rem] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Preview entries</p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Prepared terms</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(glossaryStatus?.previewEntries ?? []).map((entry) => (
              <div
                key={`${entry.sourceText}-${entry.targetText}`}
                className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4"
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
        </section>
      </div>
    </main>
  )
}
