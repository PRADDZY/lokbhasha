type AnalysisOverlayProps = {
  isPdfUpload: boolean
}

export function AnalysisOverlay({ isPdfUpload }: AnalysisOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(33,22,15,0.38)] px-4 backdrop-blur-sm">
      <div
        role="status"
        aria-live="polite"
        className="paper-panel w-full max-w-xl rounded-[2rem] border border-[rgba(255,250,241,0.25)] bg-[rgba(255,250,241,0.96)] p-8 text-center shadow-[0_24px_80px_rgba(33,22,15,0.24)]"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)]">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--accent-soft)] border-t-[var(--accent)]" />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
          Analysis in progress
        </p>
        <h3 className="section-title mt-3 text-4xl text-[var(--ink)]">Analyzing circular</h3>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">
          {isPdfUpload
            ? 'Extracting text from PDF pages before the Lingo localization pass.'
            : 'Preparing text for glossary matching before the Lingo localization pass.'}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Matching glossary terms before the Lingo localization pass.
        </p>

        <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
          <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Step 1</p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
              {isPdfUpload ? 'PDF extraction' : 'Text intake'}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Step 2</p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">Glossary detection</p>
          </div>
          <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Step 3</p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">Lingo localization</p>
          </div>
        </div>
      </div>
    </div>
  )
}
