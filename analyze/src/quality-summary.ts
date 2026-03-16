import { getLingoSetupSummary } from './lingo-setup'
import type { QualitySummary } from './types'


export function getQualitySummary(options?: {
  databasePath?: string
  snapshotPath?: string
}): QualitySummary {
  const setup = getLingoSetupSummary({
    databasePath: options?.databasePath,
    snapshotPath: options?.snapshotPath,
  })

  return {
    sourceLocale: setup.sourceLocale,
    canonicalTargetLocale: setup.canonicalTargetLocale,
    selectedTargetLocales: setup.selectedTargetLocales,
    engineStatus: setup.engine.status,
    layerStates: {
      glossary: setup.layers.glossary.status,
      brandVoices: setup.layers.brandVoices.status,
      instructions: setup.layers.instructions.status,
      aiReviewers: setup.layers.aiReviewers.status,
    },
    glossaryStatus: {
      totalTerms: setup.layers.glossary.totalTerms,
      syncState: setup.layers.glossary.status,
      lastSyncedAt: setup.layers.glossary.lastSyncedAt,
      fallbackHintsEnabled: setup.layers.glossary.fallbackMode === 'compact_request_hints',
    },
    baselineComparison: {
      available: true,
      method: 'same_localizeText_without_glossary_hints',
    },
  }
}
