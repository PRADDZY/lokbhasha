import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'


const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = path.dirname(currentFilePath)
const layoutPath = path.resolve(currentDirPath, '../src/app/layout.tsx')

test('RootLayout imports globals.css so the Cloudflare-hosted app keeps its styling', () => {
  const source = readFileSync(layoutPath, 'utf8')
  assert.match(source, /import\s+['"]\.\/globals\.css['"]/)
})
