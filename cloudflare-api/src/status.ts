import type { GlossarySyncStatus, LingoSetupSummary, QualitySummary } from '../../analyze/src/types'
import {
  getConfiguredBrandVoiceCount,
  getConfiguredInstructionCount,
  getConfiguredScorerCount,
  getConfiguredTargetLocales,
  getLingoEngineId,
} from './env'
import type { CloudflareApiEnv } from './env'
import { getD1GlossarySummary } from './d1-glossary'


export async function getCloudflareGlossaryStatus(env: CloudflareApiEnv): Promise<GlossarySyncStatus> {
  const summary = await getD1GlossarySummary(env.GLOSSARY_DB)
  const lastSyncedAt = env.GLOSSARY_LAST_SYNC_AT?.trim() || null
  const remoteGlossaryTermCount = env.GLOSSARY_REMOTE_TERM_COUNT
    ? Number.parseInt(env.GLOSSARY_REMOTE_TERM_COUNT, 10)
    : null
  const syncState = !lastSyncedAt
    ? 'missing'
    : remoteGlossaryTermCount === summary.totalTerms
      ? 'ready'
      : 'drift'

  return {
    source: 'government_19k',
    sourcePath: summary.sourcePath,
    sourceFormat: summary.sourceFormat,
    sourceLocale: 'mr',
    targetLocale: 'en',
    authority: 'lingo_mcp',
    detectionStore: 'd1',
    managementMode: 'mcp_only',
    syncState,
    totalTerms: summary.totalTerms,
    customTranslationTerms: summary.customTranslationTerms,
    nonTranslatableTerms: summary.nonTranslatableTerms,
    packageHash: `d1:${summary.totalTerms}`,
    runtimeArtifactPath: 'cloudflare:d1:GLOSSARY_DB',
    lastPreparedAt: summary.preparedAt,
    lastSyncedAt,
    authoritativeEngineId: env.GLOSSARY_AUTHORITATIVE_ENGINE_ID?.trim() || null,
    authoritativeEngineName: env.GLOSSARY_AUTHORITATIVE_ENGINE_NAME?.trim() || null,
    remoteGlossaryTermCount: Number.isFinite(remoteGlossaryTermCount) ? remoteGlossaryTermCount : null,
    fallbackMode: 'compact_request_hints',
    previewEntries: summary.previewEntries,
  }
}

export async function getCloudflareLingoSetup(env: CloudflareApiEnv): Promise<LingoSetupSummary> {
  const glossaryStatus = await getCloudflareGlossaryStatus(env)
  const engineId = getLingoEngineId(env)
  const brandVoiceCount = getConfiguredBrandVoiceCount(env)
  const instructionCount = getConfiguredInstructionCount(env)
  const scorerCount = getConfiguredScorerCount(env)

  return {
    sourceLocale: 'mr',
    canonicalTargetLocale: 'en',
    selectedTargetLocales: getConfiguredTargetLocales(env),
    runtimePath: ['recognize', 'mr->en', 'en->selectedLocales'],
    engine: {
      selectionMode: engineId ? 'explicit' : 'implicit_default',
      engineId,
      status: engineId ? 'configured_engine' : 'default_org_engine',
      note: engineId
        ? 'Requests use the explicitly configured Cloudflare Lingo engine.'
        : 'Requests use the organization default Lingo engine.',
    },
    layers: {
      glossary: {
        status: glossaryStatus.syncState,
        source: glossaryStatus.source,
        sourcePath: glossaryStatus.sourcePath,
        sourceFormat: glossaryStatus.sourceFormat,
        sourceLocale: glossaryStatus.sourceLocale,
        targetLocale: glossaryStatus.targetLocale,
        authority: glossaryStatus.authority,
        detectionStore: glossaryStatus.detectionStore,
        managementMode: glossaryStatus.managementMode,
        precedence: 'authoritative_in_lingo',
        totalTerms: glossaryStatus.totalTerms,
        customTranslationTerms: glossaryStatus.customTranslationTerms,
        nonTranslatableTerms: glossaryStatus.nonTranslatableTerms,
        packageHash: glossaryStatus.packageHash,
        runtimeArtifactPath: glossaryStatus.runtimeArtifactPath,
        lastPreparedAt: glossaryStatus.lastPreparedAt,
        lastSyncedAt: glossaryStatus.lastSyncedAt,
        authoritativeEngineId: glossaryStatus.authoritativeEngineId,
        authoritativeEngineName: glossaryStatus.authoritativeEngineName,
        remoteGlossaryTermCount: glossaryStatus.remoteGlossaryTermCount,
        fallbackMode: glossaryStatus.fallbackMode,
      },
      brandVoices: {
        status: brandVoiceCount > 0 ? 'ready' : 'not_surfaced',
        supportedShape: 'one_per_target_locale',
        configuredCount: brandVoiceCount,
        activeInRuntime: brandVoiceCount > 0,
      },
      instructions: {
        status: instructionCount > 0 ? 'ready' : 'not_surfaced',
        supportedShape: 'many_per_locale',
        wildcardSupported: true,
        configuredCount: instructionCount,
        activeInRuntime: instructionCount > 0,
      },
      aiReviewers: {
        status: scorerCount > 0 ? 'ready' : 'not_surfaced',
        supportedShape: 'async_per_locale_pair',
        configuredCount: scorerCount,
        activeInRuntime: scorerCount > 0,
      },
    },
  }
}

export async function getCloudflareQualitySummary(env: CloudflareApiEnv): Promise<QualitySummary> {
  const setup = await getCloudflareLingoSetup(env)

  return {
    sourceLocale: 'mr',
    canonicalTargetLocale: 'en',
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
      fallbackHintsEnabled: true,
    },
    baselineComparison: {
      available: true,
      method: 'same_localizeObject_without_glossary_hints',
    },
  }
}
