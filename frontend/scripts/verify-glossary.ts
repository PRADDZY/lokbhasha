import path from 'node:path'

import { getGlossaryDatabasePath } from '../src/lib/server/config'
import { openGlossaryDatabase } from '../src/lib/server/glossary'


function main() {
  const configuredPath = getGlossaryDatabasePath()
  const resolvedPath = path.resolve(configuredPath)
  const database = openGlossaryDatabase(configuredPath)

  try {
    const termCountRow = database
      .prepare('SELECT COUNT(*) AS count FROM glossary_terms')
      .get() as { count?: number } | undefined
    const metadataRow = database
      .prepare("SELECT value FROM glossary_metadata WHERE key = 'realtime_token_limit'")
      .get() as { value?: string } | undefined

    console.log(
      `Glossary database ready at ${resolvedPath} (${termCountRow?.count ?? 0} terms, realtime token limit ${metadataRow?.value ?? 'unknown'}).`
    )
  } finally {
    database.close()
  }
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : 'Glossary verification failed.'
  console.error(message)
  process.exit(1)
}
