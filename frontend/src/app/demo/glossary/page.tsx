import Link from 'next/link'

import { fetchGlossaryStatus, fetchLingoSetup } from '@/lib/api'


export const dynamic = 'force-dynamic'

async function loadGlossaryAdminState() {
  const [glossaryStatusResult, lingoSetupResult] = await Promise.allSettled([
    fetchGlossaryStatus(),
    fetchLingoSetup(),
  ])

  return {
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
  }
}

export default async function GlossaryDemoPage() {
  const { glossaryStatus, lingoSetup, glossaryError, setupError } = await loadGlossaryAdminState()

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="paper-panel rounded-[2rem] p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Hidden glossary route</p>
              <h1 className="section-title mt-3 text-4xl md:text-6xl">Lingo MCP glossary status</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--muted)]">
                This is a read-only glossary page for operators and demos. The active source is
                {' '}
                <code>dict/19k.json</code>
                , SQLite stays local for detection, and Lingo MCP is the management path for authoritative glossary changes.
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
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Authority</p>
              <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                {glossaryStatus?.authority === 'lingo_mcp' ? 'Lingo MCP' : 'Unavailable'}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Detection store</p>
              <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                {glossaryStatus?.detectionStore ?? 'Loading'}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Sync state</p>
              <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                {glossaryStatus?.syncState ?? 'Loading'}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Engine mode</p>
              <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                {lingoSetup?.engine.selectionMode === 'explicit' ? 'Explicit setup' : 'Default setup'}
              </p>
            </div>
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
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Authoritative engine</p>
                <p className="mt-3 text-base font-semibold text-[var(--ink)]">
                  {glossaryStatus?.authoritativeEngineName ?? 'Not recorded'}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {glossaryStatus?.authoritativeEngineId ?? 'No engine id recorded yet.'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Active source file</p>
                <p className="mt-3 text-base font-semibold text-[var(--ink)]">{glossaryStatus?.sourcePath ?? 'dict/19k.json'}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Runtime SQLite package</p>
                <p className="mt-3 text-base font-semibold text-[var(--ink)]">
                  {glossaryStatus?.runtimeArtifactPath ?? 'sqlite/glossary.sqlite3'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Prepared locally</p>
                <p className="mt-3 text-base font-semibold text-[var(--ink)]">
                  {glossaryStatus?.lastPreparedAt ?? 'Not prepared'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Last known Lingo sync</p>
                <p className="mt-3 text-base font-semibold text-[var(--ink)]">
                  {glossaryStatus?.lastSyncedAt ?? 'Not recorded'}
                </p>
              </div>
            </div>
          </article>

          <article className="paper-panel rounded-[2rem] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Glossary coverage</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Total terms</p>
                <p className="mt-3 text-base font-semibold text-[var(--ink)]">
                  {glossaryStatus ? `${glossaryStatus.totalTerms} terms` : 'Loading'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Remote glossary count</p>
                <p className="mt-3 text-base font-semibold text-[var(--ink)]">
                  {glossaryStatus?.remoteGlossaryTermCount ?? 'Not recorded'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Custom translations</p>
                <p className="mt-3 text-base font-semibold text-[var(--ink)]">
                  {glossaryStatus?.customTranslationTerms ?? 'Loading'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Fallback hints</p>
                <p className="mt-3 text-base font-semibold text-[var(--ink)]">
                  {glossaryStatus?.fallbackMode ?? 'Unavailable'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Target locales</p>
                <p className="mt-3 text-base font-semibold text-[var(--ink)]">
                  {lingoSetup ? lingoSetup.selectedTargetLocales.join(', ') : 'Loading'}
                </p>
              </div>
            </div>
          </article>
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
