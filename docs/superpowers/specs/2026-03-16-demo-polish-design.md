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
- a note that this is a live pass through the same system used for uploaded documents

The sample should use curated Marathi text stored in the frontend so the click path is instant to start, but the actual result must come from a real call to `/analyze`.

### Upload Card

The upload card should keep:

- PDF upload
- pasted Marathi text
- current loading and error behavior

It should visually match the sample card so the two paths feel equally supported.

## Sample Flow

### Behavior

When the user clicks the live sample action:

1. the app sends the curated Marathi sample through the real `analyzeDocument(...)` path
2. the loading state is shown clearly
3. the response is stored in session state the same way as any other analysis
4. the app routes to `/result`

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
- canonical stage shape
- active Lingo setup
- glossary match count

This should feel like evidence for what happened, not just metadata boxes.

### Optional Outputs

Optional outputs remain below the core story:

- selected Indian languages
- plain explanation
- key actions

They should remain opt-in and visually secondary.

### Quality and Glossary Panels

Keep the existing quality and glossary panels, but tighten their presentation so they support the story instead of competing with it.

These panels should answer:

- what terminology was in play
- what Lingo setup is active
- whether the result is ready to compare or extend

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

## Error Handling

Homepage:

- sample failure and upload failure should both show inline, human-readable errors
- loading state should clearly indicate live processing

Result page:

- missing optional sections should not look broken
- failed enrich requests should stay local to the requested action
- existing analyzed content must remain visible after an optional request failure

## Testing

### Frontend Tests

Add or update tests for:

- balanced homepage copy and dual action layout
- live sample controls existing on the homepage
- sample button using the same real analyze path contract
- result page preserving side-by-side original and canonical panes
- result page showing stronger guided hierarchy and demo-ready provenance
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
