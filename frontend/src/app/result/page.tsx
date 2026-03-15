"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { ResultsDisplay } from '@/components/ResultsDisplay'
import type { AnalysisSessionResult } from '@/lib/api'


const RESULT_STORAGE_KEY = 'lokbhasha:last-result'

export default function ResultPage() {
  const [result, setResult] = useState<AnalysisSessionResult | null>(null)

  useEffect(() => {
    const storedValue = window.sessionStorage.getItem(RESULT_STORAGE_KEY)
    if (!storedValue) {
      return
    }

    setResult(JSON.parse(storedValue) as AnalysisSessionResult)
  }, [])

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="paper-panel max-w-2xl rounded-[2rem] p-10 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">No result loaded</p>
          <h1 className="section-title mt-4 text-5xl">Run an analysis first</h1>
          <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
            The results page reads the latest analysis from this browser session. Start from the upload screen.
          </p>
          <Link href="/" className="mt-8 inline-flex rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white">
            Back to upload
          </Link>
        </div>
      </main>
    )
  }

  return <ResultsDisplay result={result} />
}
