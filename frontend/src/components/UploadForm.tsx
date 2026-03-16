import { AnalysisOverlay } from './AnalysisOverlay'

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
    <>
      {isLoading ? <AnalysisOverlay isPdfUpload={Boolean(selectedFile)} /> : null}

      <section aria-busy={isLoading} className="paper-panel rounded-[2rem] p-6 md:p-8">
        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Lingo workspace</p>
            <h2 className="section-title mt-3 text-4xl">Send a circular through the Lingo pipeline</h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-[var(--muted)]">
              Lingo turns Marathi into canonical English first, then generates selected Indian languages only when you ask for them.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {['Extract', 'Translate', 'Localize'].map((step) => (
              <div
                key={step}
                className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)]"
              >
                {step}
              </div>
            ))}
          </div>

          <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--surface-strong)] p-5">
            <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Upload PDF
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              className="mt-4 block w-full text-sm text-[var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-5 file:py-3 file:font-semibold file:text-white hover:file:opacity-90"
            />
            <p className="mt-3 text-sm text-[var(--muted)]">
              {selectedFile
                ? `Selected: ${selectedFile.name}`
                : 'Digital PDFs work immediately. Scanned PDFs use OCR when available.'}
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm uppercase tracking-[0.24em] text-[var(--muted)]">
            <span className="h-px flex-1 bg-[var(--line)]" />
            or
            <span className="h-px flex-1 bg-[var(--line)]" />
          </div>

          <div>
            <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Paste Marathi text
            </label>
            <textarea
              placeholder="सदर अधिसूचनेन्वये अर्ज सादर करावा..."
              rows={8}
              value={marathiText}
              onChange={(event) => onTextChange(event.target.value)}
              className="mt-4 w-full rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] px-5 py-4 text-base leading-7 text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
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
            {isLoading ? 'Lingo is translating...' : 'Translate with Lingo'}
          </button>
        </div>
      </section>
    </>
  )
}
