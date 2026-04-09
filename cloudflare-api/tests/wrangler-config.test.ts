import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

test('wrangler config declares the glossary D1 binding used by the Worker API', () => {
  const configPath = path.resolve(process.cwd(), 'wrangler.toml')
  const config = readFileSync(configPath, 'utf8')

  assert.match(config, /\[\[d1_databases\]\]/, 'wrangler.toml should declare a D1 database binding')
  assert.match(config, /binding\s*=\s*"GLOSSARY_DB"/, 'wrangler.toml should bind the glossary database as GLOSSARY_DB')
  assert.match(config, /database_name\s*=\s*"lokbhasha-glossary"/, 'wrangler.toml should declare the lokbhasha glossary database name')
})
