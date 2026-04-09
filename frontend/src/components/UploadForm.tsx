type UploadFormProps = {
  selectedFile: File | null
  marathiText: string
  error: string
  isLoading: boolean
  onFileChange: (file: File | null) => void
  onTextChange: (value: string) => void
  onAnalyze: () => void
}

export function UploadForm({
  selectedFile,
  marathiText,
  error,
  isLoading,
  onFileChange,
  onTextChange,
  onAnalyze,
}: UploadFormProps) {
  return (
    <section aria-busy={isLoading} className="paper-panel rounded-[2rem] p-6 md:p-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Upload your own</p>
          <h2 className="section-title text-4xl">Run a live document</h2>
          <p className="max-w-xl text-base leading-7 text-[var(--muted)]">
            Use the same live system for your own PDF or pasted source text. A PDF takes priority when both inputs are present.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[rgba(255,250,241,0.78)] p-5">
            <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Upload PDF
            </label>
            <input
              type="file"
              accept=".pdf"
              disabled={isLoading}
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              className="mt-4 block w-full text-sm text-[var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-5 file:py-3 file:font-semibold file:text-white hover:file:opacity-90 disabled:opacity-60"
            />
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {selectedFile
                ? `Selected PDF: ${selectedFile.name}`
                : 'PDFs are prepared in-browser before the Cloudflare analysis pass. Scanned PDFs use OCR when text is not embedded.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Paste source text
            </label>
            <textarea
              placeholder="सदर अधिसूचनेन्वये अर्ज सादर करावा..."
              rows={8}
              value={marathiText}
              disabled={isLoading}
              onChange={(event) => onTextChange(event.target.value)}
              className="mt-4 w-full rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] px-5 py-4 text-base leading-7 text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-[1.25rem] border border-[rgba(140,55,28,0.18)] bg-[rgba(190,89,48,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onAnalyze}
          disabled={isLoading}
          className="w-full rounded-full bg-[var(--ink)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:translate-y-[-1px] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Running live analysis...' : 'Analyze your document'}
        </button>
      </div>
    </section>
  )
}
