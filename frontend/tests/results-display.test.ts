import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'


const resultsDisplayPath = path.join(process.cwd(), 'src', 'components', 'ResultsDisplay.tsx')
const homePagePath = path.join(process.cwd(), 'src', 'app', 'page.tsx')
const detailsPagePath = path.join(process.cwd(), 'src', 'app', 'result', 'details', 'page.tsx')

test('ResultsDisplay keeps the side-by-side view and shows Lingo provenance for the canonical stage', async () => {
  const source = await readFile(resultsDisplayPath, 'utf8')

  assert.match(source, /What was analyzed/)
  assert.match(source, /What Lingo recognized/)
  assert.match(source, /Available outputs/)
  assert.match(source, /Source text/)
  assert.match(source, /Canonical translation/)
  assert.match(source, /Lingo\.dev localization/)
  assert.match(source, /Recognized source/)
  assert.match(source, /Canonical stage/)
  assert.match(source, /Structured object request/)
  assert.match(source, /localizationContext/)
  assert.match(source, /configuredLocaleLabel/)
  assert.match(source, /recognizedSourceLabel/)
  assert.match(source, /canonicalStageLabel/)
  assert.match(source, /Source locale/)
  assert.match(source, /Glossary matches/)
  assert.match(source, /Translations/)
  assert.match(source, /Suggested locales/)
  assert.match(source, /Generate translation/)
  assert.match(source, /Generate plain explanation/)
  assert.match(source, /Plain explanation ready/)
  assert.match(source, /Plain explanation/)
  assert.match(source, /data-testid="plain-explanation-button"/)
  assert.match(source, /data-testid="plain-explanation-section"/)
  assert.match(source, /Extract action items/)
  assert.match(source, /buildLinkedGlossaryState/)
  assert.match(source, /Behind the scenes/)
  assert.match(source, /View details/)
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
  assert.match(source, /const selectedLanguageLabel =/)
  assert.match(source, /const translationDisabled =/)
  assert.match(source, /const explanationDisabled =/)
  assert.match(source, /const actionsDisabled =/)
  assert.doesNotMatch(source, /const sourceLocaleLabel = 'Marathi \(mr\)'/)
  assert.doesNotMatch(source, /const canonicalLocaleLabel = 'English \(en\)'/)
})

test('ResultsDisplay shows visible validation and glossary context for linked terms', async () => {
  const source = await readFile(resultsDisplayPath, 'utf8')

  assert.match(source, /Please select at least one target language before requesting translations\./)
  assert.match(source, /activeGlossaryLink/)
  assert.match(source, /Glossary match/)
  assert.match(source, /Canonical meaning/)
  assert.match(source, /Source term/)
  assert.match(source, /aria-live="polite"/)
})

test('ResultsDisplay only marks action items ready when action text exists', async () => {
  const source = await readFile(resultsDisplayPath, 'utf8')

  assert.match(source, /const actionsReady = Boolean\(sessionResult\.actions\?\.length\)/)
})

test('Details page contains moved sections from ResultsDisplay', async () => {
  const source = await readFile(detailsPagePath, 'utf8')

  assert.match(source, /Behind the scenes/)
  assert.match(source, /How this result was produced/)
  assert.match(source, /Engine configuration/)
  assert.match(source, /Lingo\.dev setup/)
  assert.match(source, /Brand voice/)
  assert.match(source, /AI reviewers/)
  assert.match(source, /Glossary state/)
  assert.match(source, /Lingo glossary coverage/)
  assert.match(source, /authoritative/i)
  assert.match(source, /SQLite still handles fast local term detection/i)
  assert.match(source, /Quality verification/)
  assert.match(source, /Quality checks/)
  assert.match(source, /Baseline comparison/)
  assert.match(source, /Baseline comparison results/)
  assert.match(source, /fetchGlossaryStatus/)
  assert.match(source, /fetchLingoSetup/)
  assert.match(source, /fetchQualitySummary/)
  assert.match(source, /runBaselineComparison/)
})

test('Home page copy no longer promises simplification and key actions as default output', async () => {
  const source = await readFile(homePagePath, 'utf8')

  assert.doesNotMatch(source, /Translation, simplification, and key actions/)
  assert.match(source, /Lingo\.dev/i)
  assert.match(source, /canonical translation/i)
})
