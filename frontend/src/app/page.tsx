"use client"

import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'

import { AnalysisResult, translateText, uploadPDF } from '@/lib/api'


const RESULT_STORAGE_KEY = 'lokbhasha:last-result'

export default function Home() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [marathiText, setMarathiText] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const analyzeDocument = async () => {
    if (!selectedFile && !marathiText.trim()) {
      setError('Upload a PDF or paste Marathi text before running the analysis.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      let result: AnalysisResult

      if (selectedFile) {
        const uploadResult = await uploadPDF(selectedFile)
        const translationResult = await translateText(uploadResult.text)
        result = {
          ...translationResult,
          source: 'pdf',
          extractionConfidence: uploadResult.confidence,
        }
      } else {
        const translationResult = await translateText(marathiText.trim())
        result = {
          ...translationResult,
          source: 'text',
        }
      }

      window.sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(result))
      startTransition(() => router.push('/result'))
    } catch (analysisError) {
      const message = analysisError instanceof Error ? analysisError.message : 'Analysis failed.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between rounded-[2rem] border border-[var(--line)] bg-[rgba(255,250,241,0.6)] p-8 md:p-12">
          <div className="space-y-8">
            <div className="inline-flex w-fit items-center rounded-full border border-[var(--line)] bg-[rgba(255,250,241,0.85)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
              Civic language, made legible
            </div>
            <div className="space-y-4">
              <h1 className="section-title max-w-3xl text-5xl leading-none md:text-7xl">
                Translate dense Marathi circulars into clear public guidance.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--muted)] md:text-xl">
                LokBhasha extracts text from circular PDFs, preserves important government terms,
                and turns official language into readable English with actions people can follow.
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Input</p>
              <p className="mt-3 text-lg font-semibold">PDF upload or pasted Marathi text</p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Output</p>
              <p className="mt-3 text-lg font-semibold">Translation, simplification, and key actions</p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Focus</p>
              <p className="mt-3 text-lg font-semibold">Government language that ordinary people can use</p>
            </div>
          </div>
        </section>

        <section className="paper-panel rounded-[2rem] p-6 md:p-8">
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Analysis desk</p>
              <h2 className="section-title mt-3 text-4xl">Run a circular through the pipeline</h2>
            </div>

            <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--surface-strong)] p-5">
              <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Upload PDF
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                className="mt-4 block w-full text-sm text-[var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-5 file:py-3 file:font-semibold file:text-white hover:file:opacity-90"
              />
              <p className="mt-3 text-sm text-[var(--muted)]">
                {selectedFile ? `Selected: ${selectedFile.name}` : 'Digital PDFs work immediately. Scanned PDFs use OCR when available.'}
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
                onChange={(event) => setMarathiText(event.target.value)}
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
              onClick={analyzeDocument}
              disabled={isLoading}
              className="w-full rounded-full bg-[var(--ink)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:translate-y-[-1px] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Analyzing circular...' : 'Analyze circular'}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
