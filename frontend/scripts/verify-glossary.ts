import path from 'node:path'

import { getGlossaryDatabasePath } from '../src/lib/server/config'
import { openGlossaryDatabase } from '../src/lib/server/glossary'


function main() {
  const configuredPath = getGlossaryDatabasePath()
  const resolvedPath = path.resolve(configuredPath)
  const database = openGlossaryDatabase(configuredPath)

  try {
    const termCountRow = database
      .prepare('SELECT COUNT(*) AS count FROM glossary')
      .get() as { count?: number } | undefined

    console.log(
      `Glossary database ready at ${resolvedPath} (${termCountRow?.count ?? 0} terms).`
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
