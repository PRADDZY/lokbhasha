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

export type LingoSetupLayerStatus = 'ready' | 'not_surfaced'

export type LingoSetupSummary = {
  sourceLocale: string
  canonicalTargetLocale: string
  selectedTargetLocales: string[]
  runtimePath: ['mr->en', 'en->selectedLocales']
  engine: {
    selectionMode: 'implicit_default'
    engineId: null
    status: 'default_org_engine'
    note: string
  }
  layers: {
    glossary: {
      status: GlossarySyncState
      source: 'sqlite'
      sourceLocale: string
      targetLocale: string
      precedence: 'highest'
      totalTerms: number
      customTranslationTerms: number
      nonTranslatableTerms: number
      packageHash: string
      lastSyncedAt: string | null
      fallbackMode: 'compact_request_hints'
    }
    brandVoices: {
      status: LingoSetupLayerStatus
      supportedShape: 'one_per_target_locale'
      configuredCount: number
      activeInRuntime: boolean
    }
    instructions: {
      status: LingoSetupLayerStatus
      supportedShape: 'many_per_locale'
      wildcardSupported: boolean
      configuredCount: number
      activeInRuntime: boolean
    }
    aiReviewers: {
      status: LingoSetupLayerStatus
      supportedShape: 'async_per_locale_pair'
      configuredCount: number
      activeInRuntime: boolean
    }
  }
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

export type AnalysisSessionResult = AnalysisCoreResult & AnalysisEnrichmentResult
