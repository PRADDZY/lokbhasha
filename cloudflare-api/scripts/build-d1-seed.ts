import fs from 'node:fs'
import path from 'node:path'

import { buildD1SeedSql, DEFAULT_GLOSSARY_SOURCE_PATH, loadGlossarySeedPackage } from '../src/glossary-source'


const OUTPUT_PATH = path.resolve(process.cwd(), 'migrations', '0001_glossary.sql')

async function main() {
  const glossaryPackage = loadGlossarySeedPackage(DEFAULT_GLOSSARY_SOURCE_PATH)
  const sql = buildD1SeedSql(glossaryPackage)
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, sql, 'utf8')
  process.stdout.write(`Wrote ${OUTPUT_PATH} with ${glossaryPackage.totalTerms} glossary rows.\n`)
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
