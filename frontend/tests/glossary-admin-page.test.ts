import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'


const glossaryAdminPagePath = path.join(process.cwd(), 'src', 'app', 'demo', 'glossary', 'page.tsx')

test('Glossary admin demo route exists and stays read-only', async () => {
  await access(glossaryAdminPagePath)
  const source = await readFile(glossaryAdminPagePath, 'utf8')

  assert.match(source, /Lingo MCP/i)
  assert.match(source, /read-only/i)
  assert.match(source, /fetchGlossaryStatus/)
  assert.match(source, /fetchLingoSetup/)
  assert.match(source, /19k\.json/)
  assert.match(source, /authoritative engine/i)
  assert.match(source, /remote glossary count/i)
  assert.match(source, /brand voices/i)
  assert.match(source, /custom instructions/i)
  assert.match(source, /ai reviewers/i)
  assert.match(source, /engine layers/i)
  assert.doesNotMatch(source, /create glossary entry/i)
  assert.doesNotMatch(source, /delete glossary entry/i)
})
