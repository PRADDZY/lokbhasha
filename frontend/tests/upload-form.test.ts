import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'


const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = path.dirname(currentFilePath)
const uploadFormPath = path.resolve(currentDirPath, '../src/components/UploadForm.tsx')
const analysisOverlayPath = path.resolve(currentDirPath, '../src/components/AnalysisOverlay.tsx')

test('UploadForm shows a full-screen analysis overlay for PDF processing', () => {
  const uploadFormSource = readFileSync(uploadFormPath, 'utf8')
  const overlaySource = readFileSync(analysisOverlayPath, 'utf8')

  assert.match(uploadFormSource, /AnalysisOverlay/)
  assert.match(uploadFormSource, /Lingo/i)
  assert.match(overlaySource, /Analyzing circular/i)
  assert.match(overlaySource, /Extracting Marathi text from PDF pages/i)
  assert.match(overlaySource, /Matching glossary terms before the Lingo localization pass/i)
  assert.match(overlaySource, /fixed\s+inset-0/)
})
