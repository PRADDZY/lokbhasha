import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'


const homePagePath = path.join(process.cwd(), 'src', 'app', 'page.tsx')
const uploadFormPath = path.join(process.cwd(), 'src', 'components', 'UploadForm.tsx')

test('Home page presents balanced live-sample and upload entry points', async () => {
  const source = await readFile(homePagePath, 'utf8')
  const uploadFormSource = await readFile(uploadFormPath, 'utf8')

  assert.match(source, /Try the demo/)
  assert.match(source, /Try live sample/)
  assert.match(uploadFormSource, /Upload your own/)
  assert.match(source, /Lingo\.dev/)
  assert.match(source, /canonical English/i)
  assert.match(source, /glossary/i)
  assert.match(source, /DEMO_SAMPLE/)
})
