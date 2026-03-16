"use client"

import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'

import { analyzeDocument } from '@/lib/api'
import type { AnalysisCoreResult } from '@/lib/api'
import { AnalysisOverlay } from '@/components/AnalysisOverlay'
import { UploadForm } from '@/components/UploadForm'
import { DEMO_SAMPLE } from '@/lib/demo-sample'
import {
  writeStoredResultSession,
} from '@/lib/result-session'

type HomeErrorOwner = 'sample' | 'upload' | null

export default function Home() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [marathiText, setMarathiText] = useState('')
  const [error, setError] = useState('')
  const [errorOwner, setErrorOwner] = useState<HomeErrorOwner>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingOrigin, setLoadingOrigin] = useState<HomeErrorOwner>(null)

  const runAnalysis = async (
    input: {
      file?: File | null
      marathiText: string
    },
    origin: Exclude<HomeErrorOwner, null>
  ) => {
    if (origin === 'upload' && !input.file && !input.marathiText.trim()) {
      setError('Upload a PDF or paste Marathi text before running the analysis.')
      setErrorOwner('upload')
      return
    }

    setError('')
    setErrorOwner(null)
    setIsLoading(true)
    setLoadingOrigin(origin)

    try {
      const result: AnalysisCoreResult = await analyzeDocument({
        file: input.file,
        marathiText: input.marathiText,
      })

      writeStoredResultSession(
        window.sessionStorage,
        result,
        origin === 'sample'
          ? {
              sampleId: DEMO_SAMPLE.id,
              sampleTitle: DEMO_SAMPLE.title,
              suggestedLocales: DEMO_SAMPLE.suggestedLocales,
            }
          : undefined
      )
      startTransition(() => router.push('/result'))
    } catch (analysisError) {
      const message = analysisError instanceof Error ? analysisError.message : 'Analysis failed.'
      setError(message)
      setErrorOwner(origin)
    } finally {
      setIsLoading(false)
      setLoadingOrigin(null)
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
      {isLoading ? (
        <AnalysisOverlay isPdfUpload={loadingOrigin === 'upload' && Boolean(selectedFile)} />
      ) : null}

      <div className="mx-auto max-w-7xl space-y-8">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-[var(--line)] bg-[rgba(255,250,241,0.74)] p-8 shadow-[0_26px_80px_rgba(52,33,21,0.14)] md:p-12">
          <div className="absolute right-[-4rem] top-[-5rem] h-48 w-48 rounded-full bg-[rgba(141,79,42,0.12)] blur-3xl" />
          <div className="absolute bottom-[-5rem] left-[-4rem] h-52 w-52 rounded-full bg-[rgba(115,135,92,0.12)] blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-7">
              <div className="inline-flex w-fit items-center rounded-full border border-[var(--line)] bg-[rgba(255,250,241,0.9)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
                Powered by Lingo.dev
              </div>
              <div className="space-y-4">
                <h1 className="section-title max-w-4xl text-5xl leading-none md:text-7xl">
                  Marathi circulars, clarified through canonical English and careful public-language choices.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-[var(--muted)] md:text-xl">
                  LokBhasha keeps official Marathi visible, tracks glossary-backed terminology, and lets Lingo.dev carry the
                  canonical English stage before any selected locales are requested.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,250,241,0.82)] p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Public usefulness</p>
                  <p className="mt-3 text-lg font-semibold">Read the original beside the canonical result.</p>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,250,241,0.82)] p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Glossary control</p>
                  <p className="mt-3 text-lg font-semibold">Keep matched terminology visible before localization expands.</p>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,250,241,0.82)] p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Lingo quality</p>
                  <p className="mt-3 text-lg font-semibold">Recognize, localize, and extend only when the reader asks.</p>
                </div>
              </div>
            </div>

            <div className="self-end rounded-[2rem] border border-[var(--line)] bg-[rgba(255,250,241,0.82)] p-6">
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Live flow</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {['Recognize', 'Glossary', 'Canonical English', 'Selected locales'].map((step) => (
                  <div
                    key={step}
                    className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Step</p>
                    <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{step}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
                The demo path and the upload path hit the same live system, so judges and public users see the same pipeline.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="paper-panel rounded-[2rem] p-6 md:p-8">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Try live sample</p>
              <h2 className="section-title text-4xl">See the real pipeline in one click</h2>
              <p className="text-base leading-7 text-[var(--muted)]">{DEMO_SAMPLE.summary}</p>
            </div>

            <div className="mt-6 rounded-[1.6rem] border border-[var(--line)] bg-[rgba(255,250,241,0.82)] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Sample preview</p>
              <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                {DEMO_SAMPLE.title}
              </p>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                {DEMO_SAMPLE.marathiText}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {DEMO_SAMPLE.suggestedLocales.map((locale) => (
                <span
                  key={locale}
                  className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]"
                >
                  {locale}
                </span>
              ))}
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              Same live system, same result screen, and no canned output.
            </p>

            {errorOwner === 'sample' && error ? (
              <div className="mt-5 rounded-[1.25rem] border border-[rgba(140,55,28,0.18)] bg-[rgba(190,89,48,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => runAnalysis({ marathiText: DEMO_SAMPLE.marathiText }, 'sample')}
              disabled={isLoading}
              className="mt-6 w-full rounded-full bg-[var(--ink)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:translate-y-[-1px] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && loadingOrigin === 'sample' ? 'Running live sample...' : 'Try live sample'}
            </button>
          </article>

          <UploadForm
            selectedFile={selectedFile}
            marathiText={marathiText}
            error={errorOwner === 'upload' ? error : ''}
            isLoading={isLoading}
            onFileChange={setSelectedFile}
            onTextChange={setMarathiText}
            onAnalyze={() => runAnalysis({ file: selectedFile, marathiText }, 'upload')}
          />
        </section>
      </div>
    </main>
  )
}
