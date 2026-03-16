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
      setError('Upload a PDF or paste source text before running the analysis.')
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
        <section className="relative overflow-hidden rounded-[2.5rem] border border-[var(--line)] bg-[rgba(255,250,241,0.74)] px-8 py-16 shadow-[0_26px_80px_rgba(52,33,21,0.14)] md:px-12 md:py-20">
          <div className="absolute right-[-4rem] top-[-5rem] h-48 w-48 rounded-full bg-[rgba(141,79,42,0.12)] blur-3xl" />
          <div className="absolute bottom-[-5rem] left-[-4rem] h-52 w-52 rounded-full bg-[rgba(115,135,92,0.12)] blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center rounded-full border border-[var(--line)] bg-[rgba(255,250,241,0.9)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
              Powered by Lingo.dev
            </div>
            <h1 className="section-title mt-8 text-5xl leading-none md:text-7xl">
              Government documents, clarified and translated.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)] md:text-xl">
              Upload a document or try the live demo. LokBhasha recognizes the source language,
              produces glossary-backed canonical translations through Lingo.dev, and generates
              multilingual outputs, summaries, or action items on demand.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="paper-panel rounded-[2rem] p-6 md:p-8">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Try the demo</p>
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
