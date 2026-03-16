import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'


const resultsDisplayPath = path.join(process.cwd(), 'src', 'components', 'ResultsDisplay.tsx')
const homePagePath = path.join(process.cwd(), 'src', 'app', 'page.tsx')

test('ResultsDisplay keeps the side-by-side view and shows explicit Lingo provenance for the canonical stage', async () => {
  const source = await readFile(resultsDisplayPath, 'utf8')

  assert.match(source, /What was analyzed/)
  assert.match(source, /What Lingo recognized/)
  assert.match(source, /What glossary matched/)
  assert.match(source, /What you can generate next/)
  assert.match(source, /Original Marathi/)
  assert.match(source, /Canonical English/)
  assert.match(source, /What Lingo recognized/)
  assert.match(source, /Lingo\.dev localization/)
  assert.match(source, /Recognized source/)
  assert.match(source, /Canonical stage/)
  assert.match(source, /Structured object request/)
  assert.match(source, /Active engine/)
  assert.match(source, /localizationContext/)
  assert.match(source, /configuredLocaleLabel/)
  assert.match(source, /recognizedSourceLabel/)
  assert.match(source, /canonicalStageLabel/)
  assert.match(source, /engineLabel/)
  assert.match(source, /Source locale/)
  assert.match(source, /Generated locales/)
  assert.match(source, /Glossary matches/)
  assert.match(source, /Lingo setup/)
  assert.match(source, /authoritative/i)
  assert.match(source, /SQLite still handles fast local term detection/i)
  assert.match(source, /Quality check/)
  assert.match(source, /Select Indian languages/)
  assert.match(source, /Suggested locales/)
  assert.match(source, /Generate translation/)
  assert.match(source, /Generate plain explanation/)
  assert.match(source, /Generate key actions/)
  assert.match(source, /buildLinkedGlossaryState/)
  assert.doesNotMatch(source, /Terminology sent to Lingo/)
})

test('ResultsDisplay derives localization labels through named helpers instead of inline assumptions', async () => {
  const source = await readFile(resultsDisplayPath, 'utf8')

  assert.match(source, /demoMetadata/)
  assert.match(source, /getInitialSelectedLocales/)
  assert.match(source, /const extractionConfidenceLabel =/)
  assert.match(source, /const configuredLocaleLabel =/)
  assert.match(source, /const recognizedSourceLabel =/)
  assert.match(source, /const canonicalStageLabel =/)
  assert.match(source, /const engineLabel =/)
  assert.match(source, /const selectedLanguageLabel =/)
  assert.match(source, /const translationDisabled =/)
  assert.match(source, /const explanationDisabled =/)
  assert.match(source, /const actionsDisabled =/)
  assert.doesNotMatch(source, /const sourceLocaleLabel = 'Marathi \(mr\)'/)
  assert.doesNotMatch(source, /const canonicalLocaleLabel = 'English \(en\)'/)
})

test('Home page copy no longer promises simplification and key actions as default output', async () => {
  const source = await readFile(homePagePath, 'utf8')

  assert.doesNotMatch(source, /Translation, simplification, and key actions/)
  assert.match(source, /Lingo\.dev/i)
  assert.match(source, /canonical English/i)
  assert.match(source, /selected locales/i)
})
