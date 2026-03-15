export type GlossaryMatchType = 'exact'

export type GlossaryHit = {
  canonicalTerm: string
  matchedText: string
  meaning: string
  start: number
  end: number
  matchType: GlossaryMatchType
  confidence: number
}

export type ActionItem = {
  action: string
  deadline: string | null
  requirement: string | null
}

export type AnalysisSource = 'pdf' | 'text'

export type AnalysisCoreResult = {
  source: AnalysisSource
  marathiText: string
  extractionConfidence?: number
  glossaryHits: GlossaryHit[]
  englishCanonical: string
}

export type AnalysisEnrichmentRequest = {
  englishCanonical: string
  requestedLocales: string[]
  includePlainExplanation: boolean
  includeActions: boolean
}

export type AnalysisEnrichmentResult = {
  localizedText?: Record<string, string>
  simplifiedEnglish?: string
  actions?: ActionItem[]
}

export type LingoClient = {
  localizeText: (
    text: string,
    options: {
      sourceLocale: string
      targetLocale: string
      fast?: boolean
      hints?: Record<string, string[]>
    }
  ) => Promise<string>
  batchLocalizeText: (
    text: string,
    options: {
      sourceLocale: string
      targetLocales: string[]
      fast?: boolean
    }
  ) => Promise<string[]>
}
