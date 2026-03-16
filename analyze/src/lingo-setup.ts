import { getConfiguredTargetLocales } from './config'
import { getGlossarySyncStatus } from './glossary-sync'
import type { LingoSetupSummary } from './types'


const DEFAULT_ENGINE_NOTE = 'SDK wrapper uses the organization default engine.'

export function getLingoSetupSummary(options?: {
  databasePath?: string
  snapshotPath?: string
}): LingoSetupSummary {
  const glossaryStatus = getGlossarySyncStatus({
    databasePath: options?.databasePath,
    snapshotPath: options?.snapshotPath,
  })

  return {
    sourceLocale: 'mr',
    canonicalTargetLocale: 'en',
    selectedTargetLocales: getConfiguredTargetLocales(),
    runtimePath: ['mr->en', 'en->selectedLocales'],
    engine: {
      selectionMode: 'implicit_default',
      engineId: null,
      status: 'default_org_engine',
      note: DEFAULT_ENGINE_NOTE,
    },
    layers: {
      glossary: {
        status: glossaryStatus.syncState,
        source: glossaryStatus.source,
        sourceLocale: glossaryStatus.sourceLocale,
        targetLocale: glossaryStatus.targetLocale,
        precedence: 'highest',
        totalTerms: glossaryStatus.totalTerms,
        customTranslationTerms: glossaryStatus.customTranslationTerms,
        nonTranslatableTerms: glossaryStatus.nonTranslatableTerms,
        packageHash: glossaryStatus.packageHash,
        lastSyncedAt: glossaryStatus.lastSyncedAt,
        fallbackMode: glossaryStatus.fallbackMode,
      },
      brandVoices: {
        status: 'not_surfaced',
        supportedShape: 'one_per_target_locale',
        configuredCount: 0,
        activeInRuntime: false,
      },
      instructions: {
        status: 'not_surfaced',
        supportedShape: 'many_per_locale',
        wildcardSupported: true,
        configuredCount: 0,
        activeInRuntime: false,
      },
      aiReviewers: {
        status: 'not_surfaced',
        supportedShape: 'async_per_locale_pair',
        configuredCount: 0,
        activeInRuntime: false,
      },
    },
  }
}
