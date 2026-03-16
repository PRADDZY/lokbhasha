"use client"

import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'

import { analyzeDocument } from '@/lib/api'
import type { AnalysisCoreResult } from '@/lib/api'
import { UploadForm } from '@/components/UploadForm'


const RESULT_STORAGE_KEY = 'lokbhasha:last-result'

export default function Home() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [marathiText, setMarathiText] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const runAnalysis = async () => {
    if (!selectedFile && !marathiText.trim()) {
      setError('Upload a PDF or paste Marathi text before running the analysis.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const result: AnalysisCoreResult = await analyzeDocument({
        file: selectedFile,
        marathiText,
      })

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
              Powered by Lingo.dev
            </div>
            <div className="space-y-4">
              <h1 className="section-title max-w-3xl text-5xl leading-none md:text-7xl">
                Lingo turns Marathi government circulars into canonical English and localized public guidance.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--muted)] md:text-xl">
                LokBhasha extracts Marathi from circular PDFs, keeps important glossary terms visible,
                and sends the document through Lingo.dev for canonical English before any selected Indian languages are generated.
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
              <p className="mt-3 text-lg font-semibold">Original text beside canonical English</p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Locales</p>
              <p className="mt-3 text-lg font-semibold">Selected Indian languages on demand</p>
            </div>
          </div>
        </section>

        <UploadForm
          selectedFile={selectedFile}
          marathiText={marathiText}
          error={error}
          isLoading={isLoading}
          onFileChange={setSelectedFile}
          onTextChange={setMarathiText}
          onAnalyze={runAnalysis}
        />
      </div>
    </main>
  )
}
