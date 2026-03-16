import fs from 'node:fs'

import {
  getGlossaryDatabasePath,
  getGlossarySourcePath,
  getGlossarySyncSnapshotPath,
} from '../src/config'
import { buildGlossarySyncSnapshot } from '../src/glossary-sync'


const databasePath = getGlossaryDatabasePath()
const sourcePath = getGlossarySourcePath()
const snapshotPath = getGlossarySyncSnapshotPath()
const snapshot = buildGlossarySyncSnapshot({ databasePath, sourcePath })

fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2))
process.stdout.write(`Prepared Lingo glossary snapshot at ${snapshotPath}\n`)
