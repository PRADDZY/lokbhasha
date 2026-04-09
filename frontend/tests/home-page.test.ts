import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'


const homePagePath = path.join(process.cwd(), 'src', 'app', 'page.tsx')
const uploadFormPath = path.join(process.cwd(), 'src', 'components', 'UploadForm.tsx')

test('Home page uses explicit empty-submit validation copy for the upload flow', async () => {
  const source = await readFile(homePagePath, 'utf8')

  assert.match(source, /Please provide a PDF or paste text before running the analysis\./)
})

test('Upload form exposes visible alert and stable action controls for automation', async () => {
  const source = await readFile(uploadFormPath, 'utf8')

  assert.match(source, /role="alert"/)
  assert.match(source, /data-testid="upload-form-error"/)
  assert.match(source, /data-testid="analyze-document-button"/)
})
