import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'


const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = path.dirname(currentFilePath)
const uploadFormPath = path.resolve(currentDirPath, '../src/components/UploadForm.tsx')
const analysisOverlayPath = path.resolve(currentDirPath, '../src/components/AnalysisOverlay.tsx')
const homePagePath = path.resolve(currentDirPath, '../src/app/page.tsx')

test('Home page owns the shared analysis overlay while UploadForm stays focused on inputs', () => {
  const uploadFormSource = readFileSync(uploadFormPath, 'utf8')
  const overlaySource = readFileSync(analysisOverlayPath, 'utf8')
  const homePageSource = readFileSync(homePagePath, 'utf8')

  assert.doesNotMatch(uploadFormSource, /AnalysisOverlay/)
  assert.match(homePageSource, /AnalysisOverlay/)
  assert.match(homePageSource, /extractPdfTextInBrowser/)
  assert.match(homePageSource, /isPdfUpload/)
  assert.match(overlaySource, /Analyzing circular/i)
  assert.match(overlaySource, /Extracting text from PDF pages/i)
  assert.match(overlaySource, /Preparing text for glossary matching/i)
  assert.match(overlaySource, /Matching glossary terms before the Lingo localization pass/i)
  assert.match(overlaySource, /fixed\s+inset-0/)
})

test('UploadForm keeps the PDF input explicitly labeled and automation-friendly', () => {
  const uploadFormSource = readFileSync(uploadFormPath, 'utf8')

  assert.match(uploadFormSource, /htmlFor="document-upload"/)
  assert.match(uploadFormSource, /id="document-upload"/)
  assert.match(uploadFormSource, /name="documentUpload"/)
  assert.match(uploadFormSource, /data-testid="document-upload-input"/)
  assert.match(uploadFormSource, /data-testid="analyze-document-button"/)
  assert.match(uploadFormSource, /aria-describedby="document-upload-status"/)
  assert.match(uploadFormSource, /id="document-upload-status"/)
  assert.match(uploadFormSource, /aria-live="polite"/)
})
