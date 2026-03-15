"use client"

import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'

import { AnalysisResult, analyzeDocument } from '@/lib/api'
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
      const result: AnalysisResult = await analyzeDocument({
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
