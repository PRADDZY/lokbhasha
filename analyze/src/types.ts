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

export type LingoGlossaryEntryType = 'custom_translation' | 'non_translatable'

export type LingoGlossaryEntry = {
  sourceLocale: string
  targetLocale: string
  sourceText: string
  targetText: string
  type: LingoGlossaryEntryType
  hint: string | null
}

export type GlossarySyncState = 'ready' | 'drift' | 'missing'

export type GlossarySyncStatus = {
  source: 'sqlite'
  sourceLocale: string
  targetLocale: string
  syncState: GlossarySyncState
  totalTerms: number
  customTranslationTerms: number
  nonTranslatableTerms: number
  packageHash: string
  lastSyncedAt: string | null
  fallbackMode: 'compact_request_hints'
  previewEntries: LingoGlossaryEntry[]
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
