import { getConfiguredTargetLocales, getLingoEngineId } from './config'
import { getGlossarySyncStatus } from './glossary-sync'
import type { LingoSetupSummary } from './types'


const DEFAULT_ENGINE_NOTE = 'Requests use the organization default Lingo setup.'
const CONFIGURED_ENGINE_NOTE = 'Requests use the configured Lingo setup id.'

export function getLingoSetupSummary(options?: {
  databasePath?: string
  snapshotPath?: string
}): LingoSetupSummary {
  const glossaryStatus = getGlossarySyncStatus({
    databasePath: options?.databasePath,
    snapshotPath: options?.snapshotPath,
  })
  const engineId = getLingoEngineId()

  return {
    sourceLocale: 'mr',
    canonicalTargetLocale: 'en',
    selectedTargetLocales: getConfiguredTargetLocales(),
    runtimePath: ['recognize', 'mr->en', 'en->selectedLocales'],
    engine: {
      selectionMode: engineId ? 'explicit' : 'implicit_default',
      engineId,
      status: engineId ? 'configured_engine' : 'default_org_engine',
      note: engineId ? CONFIGURED_ENGINE_NOTE : DEFAULT_ENGINE_NOTE,
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
