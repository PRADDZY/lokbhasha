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
export type GlossaryAuthority = 'lingo_mcp'
export type GlossaryDetectionStore = 'sqlite'
export type GlossaryManagementMode = 'mcp_only'
export type GlossarySourceKind = 'government_19k'
export type GlossarySourceFormat = 'english_to_marathi_list' | 'marathi_to_english_map'

export type GlossarySyncStatus = {
  source: GlossarySourceKind
  sourcePath: string
  sourceFormat: GlossarySourceFormat
  sourceLocale: string
  targetLocale: string
  authority: GlossaryAuthority
  detectionStore: GlossaryDetectionStore
  managementMode: GlossaryManagementMode
  syncState: GlossarySyncState
  totalTerms: number
  customTranslationTerms: number
  nonTranslatableTerms: number
  packageHash: string
  runtimeArtifactPath: string
  lastPreparedAt: string | null
  lastSyncedAt: string | null
  authoritativeEngineId: string | null
  authoritativeEngineName: string | null
  remoteGlossaryTermCount: number | null
  fallbackMode: 'compact_request_hints'
  previewEntries: LingoGlossaryEntry[]
}

export type LingoSetupLayerStatus = 'ready' | 'not_surfaced'

export type LingoEngineSelectionMode = 'implicit_default' | 'explicit'

export type AnalysisLocalizationContext = {
  provider: 'lingo.dev'
  engineSelectionMode: LingoEngineSelectionMode
  engineId: string | null
  sourceLocale: {
    configured: 'mr'
    recognized: string
    matchesConfigured: boolean
  }
  canonicalStage: {
    requestShape: 'structured_object'
    method: 'localizeObject'
    sourceLocale: 'mr'
    targetLocale: 'en'
    fast: true
    glossaryMode: 'fallback_request_hints' | 'none'
  }
}

export type LingoSetupSummary = {
  sourceLocale: string
  canonicalTargetLocale: string
  selectedTargetLocales: string[]
  runtimePath: ['recognize', 'mr->en', 'en->selectedLocales']
  engine: {
    selectionMode: LingoEngineSelectionMode
    engineId: string | null
    status: 'default_org_engine' | 'configured_engine'
    note: string
  }
  layers: {
    glossary: {
      status: GlossarySyncState
      source: GlossarySourceKind
      sourcePath: string
      sourceFormat: GlossarySourceFormat
      sourceLocale: string
      targetLocale: string
      authority: GlossaryAuthority
      detectionStore: GlossaryDetectionStore
      managementMode: GlossaryManagementMode
      precedence: 'authoritative_in_lingo'
      totalTerms: number
      customTranslationTerms: number
      nonTranslatableTerms: number
      packageHash: string
      runtimeArtifactPath: string
      lastPreparedAt: string | null
      lastSyncedAt: string | null
      authoritativeEngineId: string | null
      authoritativeEngineName: string | null
      remoteGlossaryTermCount: number | null
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

export type AnalysisComparisonMethod = 'same_localizeObject_without_glossary_hints'

export type AnalysisComparisonRequest = {
  marathiText: string
  englishCanonical: string
}

export type AnalysisComparisonResult = {
  targetLocale: 'en'
  method: AnalysisComparisonMethod
  baselineText: string
  sameAsCurrent: boolean
  glossaryMatchCount: number
  hintTermCount: number
}

export type QualitySummary = {
  sourceLocale: string
  canonicalTargetLocale: string
  selectedTargetLocales: string[]
  engineStatus: LingoSetupSummary['engine']['status']
  layerStates: {
    glossary: GlossarySyncState
    brandVoices: LingoSetupLayerStatus
    instructions: LingoSetupLayerStatus
    aiReviewers: LingoSetupLayerStatus
  }
  glossaryStatus: {
    totalTerms: number
    syncState: GlossarySyncState
    lastSyncedAt: string | null
    fallbackHintsEnabled: boolean
  }
  baselineComparison: {
    available: true
    method: AnalysisComparisonMethod
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
  localizationContext: AnalysisLocalizationContext
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
