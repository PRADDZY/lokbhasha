import fs from 'node:fs'

import {
  getGlossaryDatabasePath,
  getGlossarySourcePath,
  getGlossarySyncSnapshotPath,
} from '../src/config'
import { buildGlossarySyncSnapshot } from '../src/glossary-sync'


function getRequiredEnv(name: string): string {
  const value = (process.env[name] || '').trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function main() {
  const snapshotPath = getGlossarySyncSnapshotPath()
  const snapshot = buildGlossarySyncSnapshot({
    databasePath: getGlossaryDatabasePath(),
    sourcePath: getGlossarySourcePath(),
    engineId: getRequiredEnv('GLOSSARY_SYNC_ENGINE_ID'),
    engineName: getRequiredEnv('GLOSSARY_SYNC_ENGINE_NAME'),
    remoteGlossaryTermCount: Number.parseInt(getRequiredEnv('GLOSSARY_SYNC_REMOTE_TERM_COUNT'), 10),
    lastKnownMcpSyncAt: getRequiredEnv('GLOSSARY_SYNC_LAST_SYNCED_AT'),
  })

  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2))
  process.stdout.write(`Recorded glossary sync metadata at ${snapshotPath}\n`)
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : 'Glossary sync finalization failed.'
  console.error(message)
  process.exit(1)
}
