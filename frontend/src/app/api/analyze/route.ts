import { NextResponse } from 'next/server'

import { analyzeMarathiDocument } from '@/lib/server/analysis'
import { getGlossaryDatabasePath, getTargetLocales } from '@/lib/server/config'
import { extractPdfText } from '@/lib/server/extraction'
import { detectGlossaryHits } from '@/lib/server/glossary'
import { createLingoClient } from '@/lib/server/lingo'


export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const uploadedFile = formData.get('file')
    const marathiText = String(formData.get('marathiText') || '').trim()

    let source: 'pdf' | 'text' = 'text'
    let extractionConfidence: number | undefined
    let sourceText = marathiText

    if (uploadedFile instanceof File && uploadedFile.size > 0) {
      const extracted = await extractPdfText(uploadedFile)
      source = 'pdf'
      extractionConfidence = extracted.confidence
      sourceText = extracted.text.trim()
    }

    if (!sourceText) {
      return NextResponse.json(
        { detail: 'Upload a PDF or provide Marathi text before analyzing.' },
        { status: 400 }
      )
    }

    const result = await analyzeMarathiDocument(
      {
        marathiText: sourceText,
        source,
        extractionConfidence,
      },
      {
        detectGlossaryHits: (text) =>
          detectGlossaryHits(text, { databasePath: getGlossaryDatabasePath() }),
        lingoClient: createLingoClient(),
        targetLocales: getTargetLocales(),
      }
    )

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed.'
    return NextResponse.json({ detail: message }, { status: 500 })
  }
}
