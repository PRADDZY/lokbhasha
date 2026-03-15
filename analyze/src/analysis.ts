import { extractActions, simplifyEnglishText } from './english'
import { buildTerminologyHints } from './terminology'
import type {
  AnalysisCoreResult,
  AnalysisEnrichmentRequest,
  AnalysisEnrichmentResult,
  AnalysisSource,
  GlossaryHit,
  LingoClient,
} from './types'


type AnalyzeInput = {
  marathiText: string
  source: AnalysisSource
  extractionConfidence?: number
}

type AnalyzeDependencies = {
  detectGlossaryHits: (text: string) => GlossaryHit[]
  lingoClient: LingoClient
}

type EnrichmentDependencies = {
  lingoClient: LingoClient
}

export async function analyzeMarathiDocument(
  input: AnalyzeInput,
  dependencies: AnalyzeDependencies
): Promise<AnalysisCoreResult> {
  const glossaryHits = dependencies.detectGlossaryHits(input.marathiText)
  const terminologyHints = buildTerminologyHints(glossaryHits)

  const englishCanonical = await dependencies.lingoClient.localizeText(input.marathiText, {
    sourceLocale: 'mr',
    targetLocale: 'en',
    fast: true,
    ...(Object.keys(terminologyHints).length ? { hints: terminologyHints } : {}),
  })

  return {
    source: input.source,
    marathiText: input.marathiText,
    extractionConfidence: input.extractionConfidence,
    glossaryHits,
    englishCanonical,
  }
}

export async function generateAnalysisEnrichment(
  input: AnalysisEnrichmentRequest,
  dependencies: EnrichmentDependencies
): Promise<AnalysisEnrichmentResult> {
  const result: AnalysisEnrichmentResult = {}
  let simplifiedEnglish: string | null = null

  if (input.requestedLocales.length) {
    const localizedResults = await dependencies.lingoClient.batchLocalizeText(input.englishCanonical, {
      sourceLocale: 'en',
      targetLocales: input.requestedLocales,
      fast: true,
    })

    result.localizedText = Object.fromEntries(
      input.requestedLocales.map((locale, index) => [locale, localizedResults[index] ?? input.englishCanonical])
    )
  }

  if (input.includePlainExplanation || input.includeActions) {
    simplifiedEnglish = simplifyEnglishText(input.englishCanonical)
  }

  if (input.includePlainExplanation && simplifiedEnglish) {
    result.simplifiedEnglish = simplifiedEnglish
  }

  if (input.includeActions && simplifiedEnglish) {
    result.actions = extractActions(simplifiedEnglish)
  }

  return result
}
