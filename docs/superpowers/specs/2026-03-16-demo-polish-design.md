# Demo Polish Design

## Summary

Batch 6 focuses on presentation, not another backend shift. The goal is to make LokBhasha work equally well as a two-minute judge walkthrough and as a self-serve public demo, while staying visibly aligned with Lingo.dev.

The product should surface three ideas at the same time:

1. It is useful to ordinary people reading Marathi circulars.
2. It respects official terminology through glossary-backed handling.
3. It is clearly a Lingo-shaped localization product, not a generic translation app.

This batch keeps the current API flow and data model intact where possible. The main work is on the homepage, sample-entry flow, loading states, result-page hierarchy, and demo-ready copy.

## Goals

- Add a balanced first-screen choice between trying a live sample and uploading or pasting real content.
- Make the sample path run the real pipeline instead of showing canned output.
- Present the result page as a guided story, not just a stack of panels.
- Keep optional outputs secondary to the core localization flow.
- Make the app feel polished enough for judges without losing clarity for first-time public users.

## Non-Goals

- No new extraction service behavior.
- No new translation or localization endpoints.
- No fake fallback sample output.
- No new admin workflows for editing Lingo setup.
- No second "demo mode" with a separate code path.

## User Experience Direction

### Tone

Use a hybrid editorial direction:

- civic trust
- product clarity
- cleaner hierarchy than a dashboard
- more memorable than a standard SaaS hero

The interface should feel like a serious public brief with product polish, not a toy demo and not a heavy enterprise console.

### Demo Priorities

The first 20 seconds should communicate all three of these equally:

- public usefulness
- glossary control
- Lingo quality

No single message should dominate the landing screen.

## Homepage Design

### Layout

The homepage becomes a balanced split with equal weight for:

- `Try live sample`
- `Upload your own`

The sample path and the upload path should both feel first-class.

### Content Structure

The top section should include:

- an editorial headline that frames the product around Marathi circulars and canonical English
- a short supporting paragraph tying the flow to Lingo.dev
- three short proof points for:
  - real Marathi input
  - glossary-backed terminology
  - canonical English plus selected locales

Below or beside that, there should be two action cards:

- a live sample card
- an upload or paste card

Below the actions, add a compact process strip showing the real flow:

- recognize
- glossary
- canonical English
- selected locales

### Live Sample Card

The sample card should contain:

- a title
- a short civic-facing summary of the sample circular
- a one-click call to action that runs the real pipeline
- visible suggested locale chips for the demo path
- a note that this is a live pass through the same system used for uploaded documents

The sample should use curated Marathi text stored in the frontend so the click path is instant to start, but the actual result must come from a real call to `/analyze`.

### Upload Card

The upload card should keep:

- PDF upload
- pasted Marathi text
- a shared full-screen analysis overlay during live processing
- an inline error block for failed analysis requests
- a single analyze action that is disabled while a live request is running

It should visually match the sample card so the two paths feel equally supported.

### Input Validation and Precedence

The homepage keeps the current analysis contract exactly:

- if a PDF file is present, the analysis run uses the extracted PDF text and ignores pasted Marathi text for that run
- if no PDF file is present, the analysis run uses trimmed pasted Marathi text
- if neither is present, the homepage stays in place and shows the existing inline request error

The upload card should make that behavior legible:

- show PDF selection state clearly
- keep pasted Marathi text editable even when a PDF is selected
- do not try to merge uploaded and pasted inputs into a combined request

## Sample Flow

### Behavior

When the user clicks the live sample action:

1. the app sends the curated Marathi sample through the real `analyzeDocument(...)` path
2. the shared full-screen analysis overlay is shown, using the text-intake variant instead of the PDF variant
3. the response is stored in session state the same way as any other analysis
4. the app also stores lightweight demo metadata containing the sample id, sample title, and suggested locales
5. the app routes to `/result`

### Locale Suggestions

Locale suggestions are guidance, not generated output.

- Each curated sample includes a small list of suggested target locales.
- These suggested locales are shown on the homepage sample card before analysis.
- After the sample result loads, those locales are pre-selected in the result-page language picker.
- They are not translated automatically.
- User-uploaded content does not receive pre-selected locales unless localized output already exists in session state.
- If a sample result later has generated localized output, the picker uses a union of:
  - already generated locale keys from the stored result
  - sample suggested locales from demo metadata
- Generated localized outputs always stay selected. Suggested locales only add pre-selection for locales that are not already loaded.

This keeps additional language generation opt-in while still making the demo path feel guided.

### Request-State Rules

The homepage owns a single in-flight analysis state shared by both the sample and upload paths.

- Only one analysis request may run at a time.
- While a request is running:
  - the page-level overlay is visible for both entry paths
  - the sample call to action is disabled
  - the upload analyze action is disabled
  - file input and text input are disabled
- Double-clicks or repeated taps during loading are ignored by the disabled controls.
- After a failed request, the user may retry either path immediately.
- There is no competing-request winner rule because the UI blocks concurrent analysis starts.

### Request and Session State Table

| State | Overlay | Disabled controls | Error placement | Session behavior |
| --- | --- | --- | --- | --- |
| `idle` | hidden | none | no inline error shown unless the previous request failed | keep the current `lokbhasha:last-result` payload until a new success replaces it |
| `analyzing` | shared page-level overlay | sample action, upload action, file input, text input | homepage inline error is cleared before the request starts | do not clear the previous stored result while the new request is running |
| `analyze failed` | hidden | none | homepage inline error under the active cards | keep the previous stored result and previous demo metadata unchanged |
| `analyze succeeded` | hidden after route change | none on the result page | homepage error cleared, no result-page error by default | replace `lokbhasha:last-result` completely with the new analysis payload; replace demo metadata for sample runs and clear demo metadata for upload or paste runs |
| `optional enrich running` | no page overlay | only the clicked enrich action and any action sharing the existing `loadingMode` gate | error stays local to the result page optional-output area | keep current analyzed content visible; do not overwrite existing localized or helper outputs until the enrich request succeeds |
| `optional enrich failed` | no page overlay | none after failure | local error block in the optional-output area or baseline area | keep the current stored result unchanged and keep any previously generated optional outputs visible |

### Session Replacement Rules

- Starting a new homepage analysis clears the homepage inline error immediately.
- A successful analysis always replaces the stored core result instead of merging with any older result.
- A successful sample run stores demo metadata for that sample.
- A successful upload or pasted-text run clears any older sample-only demo metadata.
- Failed analysis requests do not mutate stored result data.
- Optional enrich requests merge only the new successful enrichment fields into the existing stored result.
- Failed optional enrich requests do not clear or replace previously generated localized text, plain explanation, or actions.

### Failure Handling

If the live sample fails:

- show a clear inline error on the homepage
- keep the upload and paste path fully usable
- do not inject fake demo output

## Result Page Design

### Core Story Order

The result page should feel guided. The major sections should read in this order:

1. what was analyzed
2. what Lingo recognized
3. what glossary matched
4. what canonical English came out
5. what optional outputs can be generated next

### Top Area

Keep the side-by-side original Marathi and canonical English view, but improve the narrative hierarchy around it.

The top information band should make these items easy to scan:

- source type
- recognized source locale
- canonical route
- whether the request used the default or an explicit Lingo setup

This should feel like evidence for what happened, not just metadata boxes.

The `canonical route` label should be explicit and stable. For this batch it means:

- source recognition ran
- the canonical stage used the existing structured Lingo localization path
- canonical English came from the structured Lingo localization step
- the label is derived from existing `localizationContext` fields and does not introduce a new backend field
- the label is about pipeline path, not proof that glossary context changed the wording

Actual glossary participation stays separate:

- `glossary match count` comes from `AnalysisCoreResult.glossaryHits.length`
- `baseline comparison` remains the only explicit comparison view for wording change

### Optional Outputs

Optional outputs remain below the core story:

- selected Indian languages
- plain explanation
- key actions

They should remain opt-in and visually secondary.

### Quality and Glossary Panels

Keep the existing quality and glossary panels, but tighten their presentation so they support the story instead of competing with it.

The result-page responsibilities should be split like this:

- top story summary:
  - source type
  - recognized source locale
  - canonical route
  - default vs explicit Lingo setup
- localization context panel:
  - canonical English stage details
  - active Lingo setup summary
- glossary panel:
  - glossary match count
  - glossary package readiness
  - preview term mappings
- quality panel:
  - readiness summary
  - baseline comparison
  - next-step readiness signals
- optional outputs:
  - selected locales
  - plain explanation
  - key actions

The glossary and quality panels should answer:

- what terminology was in play
- what Lingo setup is active
- whether the result is ready to compare or extend

The result page should distinguish request evidence from current environment status:

- request evidence:
  - source type
  - recognized source locale
  - canonical route
  - glossary match count
- current environment status:
  - Lingo setup summary fetched from `GET /lingo-setup`
  - glossary package readiness and preview entries fetched from `GET /glossary-status`
  - quality readiness and baseline availability fetched from `GET /quality-summary`

Batch 6 does not add a request-time snapshot of glossary or quality state. Current status panels are presented as live setup/readiness information, not as immutable evidence of what existed at request time.

### Data Contract Mapping

Batch 6 should stay frontend-led. Every new label in this batch must come from an existing field or a frontend-derived summary.

| UI label | Source | Fallback |
| --- | --- | --- |
| `source type` | `AnalysisCoreResult.source` with optional `extractionConfidence` display | show only the source label if confidence is absent |
| `recognized source locale` | `localizationContext.sourceLocale.recognized` and `matchesConfigured` | use the existing fallback localization context if the stored result lacks `localizationContext` |
| `canonical route` | frontend-derived summary from `localizationContext.canonicalStage.requestShape`, `method`, and `glossaryMode`, plus the existing source-recognition message | fall back to the current fixed copy already used by the result page |
| `default vs explicit Lingo setup` | request-time `localizationContext.engineSelectionMode` and `engineId` define the label; `LingoSetupSummary.engine` may add descriptive detail only | if the stored result lacks `localizationContext`, use the existing fallback localization context and label it as fallback-derived rather than inferring from live setup status |
| `canonical English stage details` | existing `localizationContext.canonicalStage` fields | use the existing fallback localization context if request-time context is absent |
| `active Lingo setup summary` | `LingoSetupSummary.engine` plus `LingoSetupSummary.layers` from `GET /lingo-setup` | loading state, then local error message if the fetch fails |
| `glossary match count` | `AnalysisCoreResult.glossaryHits.length` | show `0 matches` when no hits are present |
| `glossary package readiness` | live `GlossarySyncStatus.syncState` from `GET /glossary-status` | loading state, then local error message if the fetch fails |
| `preview term mappings` | live `GlossarySyncStatus.previewEntries` from `GET /glossary-status` | omit the preview grid when no entries are available |
| `readiness summary` | live `QualitySummary.layerStates`, `QualitySummary.selectedTargetLocales`, and `QualitySummary.glossaryStatus` | loading state, then local error message if the fetch fails |
| `baseline comparison` | `QualitySummary.baselineComparison.available` plus the existing `POST /quality/baseline-compare` result state | show the current compare CTA and empty state until the compare request is run |
| `next-step readiness signals` | reuse the same live quality cards derived from `QualitySummary`; no extra confidence scoring language or new backend field | loading and error states use current panel behavior |
| `suggested locales` | frontend-only sample metadata stored alongside the session result for sample runs | omit pre-selection for user-uploaded or pasted runs |

## Data and State

### Frontend Sample Data

Add a small frontend-only sample definition containing:

- sample id
- sample title
- short summary
- Marathi sample text
- suggested target locales

This should live in a focused utility module so the sample path is easy to understand and extend.

### Shared Result State

The sample path and upload path must share the exact same result storage and result page rendering path.

That keeps:

- the demo honest
- the code path small
- regressions easier to test

The session payload should include:

- the normal analysis result
- optional enrichments as they are generated
- optional demo metadata for sample-driven runs only:
  - sample id
  - sample title
  - suggested locales

The result page should tolerate the absence of demo metadata for normal uploads.

The homepage should keep using a single session key for the core analyzed result. Sample-only metadata may live in a second lightweight session key if that keeps normal result typing clean.

## Error Handling

Homepage:

- sample failure and upload failure should both show inline, human-readable errors
- loading state should clearly indicate live processing through the shared page-level overlay

Result page:

- missing optional sections should not look broken
- failed enrich requests should stay local to the requested action
- existing analyzed content must remain visible after an optional request failure
- if `/result` is opened without valid stored session data, show a clean empty state with a return path to the homepage
- if stored session data is malformed, clear it and show the same empty state instead of crashing
- refreshing the result page in the same tab should preserve the current analyzed content through session storage

## Testing

### Frontend Tests

Add or update tests for:

- balanced homepage copy and dual action layout
- live sample controls existing on the homepage
- sample button using the same real analyze path contract
- sample metadata and suggested locales being persisted without generating output
- homepage controls being disabled while a live sample or upload analysis is running
- result page preserving side-by-side original and canonical panes
- result page showing stronger guided hierarchy and demo-ready provenance
- result page empty state for missing or malformed session data
- optional outputs remaining secondary

### Existing Verification

Keep the existing verification set green:

- backend tests
- analyze tests
- analyze type-check
- glossary verification
- frontend tests
- frontend production build

### Live Verification

After merge:

- verify Vercel serves the updated homepage
- verify Render analyze and extract remain healthy
- verify the live sample path reaches `/result`
- verify upload and paste flows still work

## Boundaries

### Homepage Units

- hero and proof strip
- sample card
- upload card

Each of these should be understandable on its own.

### Result Units

- top story summary
- localization context
- glossary context
- quality check
- optional outputs
- side-by-side text panes

These sections should stay separate so future polish does not force more cross-file coupling.

## Recommended Implementation Shape

Keep Batch 6 mostly frontend-led:

- add a small sample-data module
- add homepage helpers/components for balanced sample and upload entry
- refine result-page layout and section ordering
- keep the backend contracts unchanged unless a very small supporting field is genuinely needed

This keeps the batch focused, demo-friendly, and low risk for the live deployment.
