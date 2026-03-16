import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'


const resultsDisplayPath = path.join(process.cwd(), 'src', 'components', 'ResultsDisplay.tsx')
const homePagePath = path.join(process.cwd(), 'src', 'app', 'page.tsx')

test('ResultsDisplay is built around side-by-side original and canonical panes with opt-in controls', async () => {
  const source = await readFile(resultsDisplayPath, 'utf8')

  assert.match(source, /Original Marathi/)
  assert.match(source, /Canonical English/)
  assert.match(source, /Localization context/)
  assert.match(source, /Lingo\.dev localization/)
  assert.match(source, /Lingo setup/)
  assert.match(source, /fetchLingoSetup/)
  assert.match(source, /This shows the Lingo configuration used for this result\./)
  assert.match(source, /Only current settings are shown\. Missing fields are marked clearly\./)
  assert.match(source, /Active setup/)
  assert.match(source, /Locale coverage/)
  assert.match(source, /Brand voice/)
  assert.match(source, /Instructions/)
  assert.match(source, /AI reviewers/)
  assert.match(source, /Glossary sync/)
  assert.match(source, /Lingo glossary package/)
  assert.match(source, /Fallback request hints/)
  assert.match(source, /Source locale/)
  assert.match(source, /Canonical locale/)
  assert.match(source, /Glossary matches/)
  assert.match(source, /fetchGlossaryStatus/)
  assert.match(source, /Select Indian languages/)
  assert.match(source, /Generate translation/)
  assert.match(source, /Generate plain explanation/)
  assert.match(source, /Generate key actions/)
  assert.match(source, /buildLinkedGlossaryState/)
  assert.doesNotMatch(source, /Terminology sent to Lingo/)
})

test('ResultsDisplay derives button labels and disabled states through named helpers', async () => {
  const source = await readFile(resultsDisplayPath, 'utf8')

  assert.match(source, /const extractionConfidenceLabel =/)
  assert.match(source, /const selectedLanguageLabel =/)
  assert.match(source, /const translationDisabled =/)
  assert.match(source, /const explanationDisabled =/)
  assert.match(source, /const explanationButtonLabel =/)
  assert.match(source, /const actionsDisabled =/)
  assert.match(source, /const actionsButtonLabel =/)
  assert.doesNotMatch(source, /disabled=\{!pendingLocales\.length \|\| loadingMode !== null\}/)
  assert.doesNotMatch(source, /disabled=\{Boolean\(sessionResult\.simplifiedEnglish\) \|\| loadingMode !== null\}/)
  assert.doesNotMatch(source, /disabled=\{Boolean\(sessionResult\.actions\) \|\| loadingMode !== null\}/)
})

test('Home page copy no longer promises simplification and key actions as default output', async () => {
  const source = await readFile(homePagePath, 'utf8')

  assert.doesNotMatch(source, /Translation, simplification, and key actions/)
  assert.match(source, /Lingo\.dev/i)
  assert.match(source, /canonical English/i)
  assert.match(source, /selected Indian languages/i)
})
