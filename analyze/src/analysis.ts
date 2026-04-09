import { extractActions, simplifyEnglishText } from './english'
import { buildFallbackGlossaryHints } from './terminology'
import type {
  AnalysisComparisonRequest,
  AnalysisComparisonResult,
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
  detectGlossaryHits: (text: string) => Promise<GlossaryHit[]> | GlossaryHit[]
  lingoClient: LingoClient
}

type EnrichmentDependencies = {
  lingoClient: LingoClient
}

type BaselineComparisonDependencies = {
  detectGlossaryHits: (text: string) => Promise<GlossaryHit[]> | GlossaryHit[]
  lingoClient: LingoClient
}

function readLocalizedField(
  payload: Record<string, unknown>,
  fieldName: string,
  fallbackValue: string
): string {
  const value = payload[fieldName]
  return typeof value === 'string' && value.trim() ? value : fallbackValue
}

export async function analyzeMarathiDocument(
  input: AnalyzeInput,
  dependencies: AnalyzeDependencies
): Promise<AnalysisCoreResult> {
  const glossaryHits = await dependencies.detectGlossaryHits(input.marathiText)
  const fallbackGlossaryHints = buildFallbackGlossaryHints(glossaryHits)
  const recognizedSourceLocale = await dependencies.lingoClient.recognizeLocale(input.marathiText)
  const canonicalPayload = await dependencies.lingoClient.localizeObject(
    { canonicalText: input.marathiText },
    {
      sourceLocale: 'mr',
      targetLocale: 'en',
      fast: true,
      ...(Object.keys(fallbackGlossaryHints).length ? { hints: fallbackGlossaryHints } : {}),
    }
  )
  const englishCanonical = readLocalizedField(canonicalPayload, 'canonicalText', input.marathiText)

  return {
    source: input.source,
    marathiText: input.marathiText,
    extractionConfidence: input.extractionConfidence,
    glossaryHits,
    englishCanonical,
    localizationContext: {
      provider: 'lingo.dev',
      engineSelectionMode: dependencies.lingoClient.runtime.engineSelectionMode,
      engineId: dependencies.lingoClient.runtime.engineId,
      sourceLocale: {
        configured: 'mr',
        recognized: recognizedSourceLocale,
        matchesConfigured: recognizedSourceLocale === 'mr',
      },
      canonicalStage: {
        requestShape: 'structured_object',
        method: 'localizeObject',
        sourceLocale: 'mr',
        targetLocale: 'en',
        fast: true,
        glossaryMode: Object.keys(fallbackGlossaryHints).length ? 'fallback_request_hints' : 'none',
      },
    },
  }
}

export async function generateAnalysisEnrichment(
  input: AnalysisEnrichmentRequest,
  dependencies: EnrichmentDependencies
): Promise<AnalysisEnrichmentResult> {
  const result: AnalysisEnrichmentResult = {}
  let simplifiedEnglish: string | null = null

  if (input.requestedLocales.length) {
    const localizedResults = await Promise.all(
      input.requestedLocales.map(async (locale) => {
        const localizedPayload = await dependencies.lingoClient.localizeObject(
          { localizedText: input.englishCanonical },
          {
            sourceLocale: 'en',
            targetLocale: locale,
            fast: true,
          }
        )
        return [locale, readLocalizedField(localizedPayload, 'localizedText', input.englishCanonical)] as const
      })
    )

    result.localizedText = Object.fromEntries(localizedResults)
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

export async function buildBaselineComparison(
  input: AnalysisComparisonRequest,
  dependencies: BaselineComparisonDependencies
): Promise<AnalysisComparisonResult> {
  const glossaryHits = await dependencies.detectGlossaryHits(input.marathiText)
  const fallbackGlossaryHints = buildFallbackGlossaryHints(glossaryHits)
  const baselinePayload = await dependencies.lingoClient.localizeObject(
    { canonicalText: input.marathiText },
    {
      sourceLocale: 'mr',
      targetLocale: 'en',
      fast: true,
    }
  )
  const baselineText = readLocalizedField(baselinePayload, 'canonicalText', input.englishCanonical)

  return {
    targetLocale: 'en',
    method: 'same_localizeObject_without_glossary_hints',
    baselineText,
    sameAsCurrent: baselineText === input.englishCanonical,
    glossaryMatchCount: glossaryHits.length,
    hintTermCount: Object.keys(fallbackGlossaryHints).length,
  }
}
