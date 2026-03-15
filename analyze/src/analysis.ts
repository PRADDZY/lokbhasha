import { buildTerminologyHints } from './glossary'
import { extractActions, simplifyEnglishText } from './english'
import type { AnalysisResult, AnalysisSource, GlossaryHit, LingoClient } from './types'


type AnalyzeInput = {
  marathiText: string
  source: AnalysisSource
  extractionConfidence?: number
}

type AnalyzeDependencies = {
  detectGlossaryHits: (text: string) => GlossaryHit[]
  lingoClient: LingoClient
  targetLocales: string[]
}

export async function analyzeMarathiDocument(
  input: AnalyzeInput,
  dependencies: AnalyzeDependencies
): Promise<AnalysisResult> {
  const glossaryHits = dependencies.detectGlossaryHits(input.marathiText)
  const terminologyHints = buildTerminologyHints(glossaryHits)

  const englishCanonical = await dependencies.lingoClient.localizeText(input.marathiText, {
    sourceLocale: 'mr',
    targetLocale: 'en',
    fast: true,
    ...(Object.keys(terminologyHints).length ? { hints: terminologyHints } : {}),
  })

  const localizedResults = await dependencies.lingoClient.batchLocalizeText(englishCanonical, {
    sourceLocale: 'en',
    targetLocales: dependencies.targetLocales,
    fast: true,
  })

  const localizedText = Object.fromEntries(
    dependencies.targetLocales.map((locale, index) => [locale, localizedResults[index] ?? englishCanonical])
  )

  const simplifiedEnglish = simplifyEnglishText(englishCanonical)
  const actions = extractActions(simplifiedEnglish)

  return {
    source: input.source,
    marathiText: input.marathiText,
    extractionConfidence: input.extractionConfidence,
    glossaryHits,
    terminologyHints,
    englishCanonical,
    localizedText,
    simplifiedEnglish,
    actions,
  }
}
