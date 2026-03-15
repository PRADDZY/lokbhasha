import { NextResponse } from 'next/server'

import { analyzeMarathiDocument } from '@/lib/server/analysis'
import { getAnalyzeErrorStatus, handleAnalyzeFormData } from '@/lib/server/analyze-route'
import { getGlossaryDatabasePath, getTargetLocales } from '@/lib/server/config'
import { extractPdfText } from '@/lib/server/extraction'
import { detectGlossaryHits } from '@/lib/server/glossary'
import { createLingoClient } from '@/lib/server/lingo'


export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const result = await handleAnalyzeFormData(formData, {
      extractPdfText,
      analyzeMarathiDocument: (input) =>
        analyzeMarathiDocument(
          input,
          {
            detectGlossaryHits: (text) =>
              detectGlossaryHits(text, { databasePath: getGlossaryDatabasePath() }),
            lingoClient: createLingoClient(),
            targetLocales: getTargetLocales(),
          }
        ),
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed.'
    const status = getAnalyzeErrorStatus(error)
    return NextResponse.json({ detail: message }, { status })
  }
}
