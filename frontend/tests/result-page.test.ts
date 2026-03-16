import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'


const resultPagePath = path.join(process.cwd(), 'src', 'app', 'result', 'page.tsx')

test('Result page reads demo metadata alongside the stored result and passes it into ResultsDisplay', async () => {
  const source = await readFile(resultPagePath, 'utf8')

  assert.match(source, /readStoredResultSession/)
  assert.match(source, /demoMetadata/)
  assert.match(source, /setDemoMetadata/)
  assert.match(source, /<ResultsDisplay result=\{result\} demoMetadata=\{demoMetadata\} \/>/)
  assert.match(source, /show a clean empty state/i)
})
