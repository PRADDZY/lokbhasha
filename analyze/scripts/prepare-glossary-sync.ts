import fs from 'node:fs'

import { getGlossaryDatabasePath, getGlossarySyncSnapshotPath } from '../src/config'
import { buildGlossarySyncSnapshot } from '../src/glossary-sync'


const databasePath = getGlossaryDatabasePath()
const snapshotPath = getGlossarySyncSnapshotPath()
const snapshot = buildGlossarySyncSnapshot({ databasePath })

fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2))
process.stdout.write(`Prepared Lingo glossary snapshot at ${snapshotPath}\n`)
