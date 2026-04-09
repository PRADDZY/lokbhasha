# LokBhasha

> Understand Marathi government documents in clear English, then localize them into other Indian languages with Lingo.dev.

LokBhasha is a document localization workflow for public-service communication. It takes Marathi circulars and notices, detects official terminology from a curated government glossary, produces canonical English through Lingo.dev, and then localizes that English into user-selected Indian languages.

This branch is aligned to a Cloudflare-first deployment target and a TestSprite-first testing workflow for the next hackathon.

## Demo

- Demo video: [YouTube walkthrough](https://www.youtube.com/watch?v=8Ga9puHhpMc)
- Live app: [lokbhasha.pages.dev](https://lokbhasha.pages.dev)
- Live API: [lokbhasha-api.dpratik3005.workers.dev/health](https://lokbhasha-api.dpratik3005.workers.dev/health)
- Localization engine: Lingo.dev
- Hosting target: Cloudflare Pages + Cloudflare Workers + Cloudflare D1
- Test focus: TestSprite MCP

## TestSprite Hackathon Track

This submission is prepared in two visible rounds so judges can see both the testing workflow and the product improvement path.

| Round | Stack | Focus | Result |
| --- | --- | --- | --- |
| Round 1 | Current Vercel + Render stack reproduced locally | Baseline critical flows | 5/6 passed, PDF upload was the only failing path |
| Round 2 | Cloudflare Pages + Workers + D1 | Same critical flows after migration and polish | 7/7 passed |

Artifacts:

- [Round 1 TestSprite snapshot](testsprite_tests/round-1/)
- [Round 2 TestSprite snapshot](testsprite_tests/round-2/)

What changed between rounds:

- moved the main runtime path to a Cloudflare-first architecture
- replaced the runtime glossary lookup path with D1 seeding from the curated 19k glossary
- made the upload and optional-output flows easier for TestSprite to drive reliably
- closed the baseline PDF upload gap and brought the selected Round 2 suite to 100%

## Why This Matters

Government documents often reach citizens in language that is formal, domain-heavy, and slow to interpret. LokBhasha is designed to preserve official terminology where accuracy matters, while still making the document understandable and portable across languages.

The product is built around three ideas:

- glossary-aware handling for government terminology
- canonical English as a stable bridge language
- user-driven outputs instead of noisy automatic generation

## What LokBhasha Does

| Step | What happens |
| --- | --- |
| 1 | User uploads a PDF or pastes Marathi text |
| 2 | PDFs are prepared in the browser with embedded-text extraction and OCR fallback |
| 3 | Cloudflare D1 detects glossary matches from the curated 19k government term set |
| 4 | Lingo.dev localizes Marathi into canonical English |
| 5 | User optionally asks for additional Indian-language outputs |
| 6 | The app shows glossary context, Lingo context, quality context, and side-by-side results |

## Why Lingo.dev Is Central

LokBhasha does not use a local translation engine.

- Lingo.dev handles Marathi -> English localization
- Lingo.dev handles English -> selected Indian language localization
- Lingo.dev is the authoritative localization layer
- D1 is used only for local glossary detection and terminology UX

## Core Product Experience

- Side-by-side original Marathi and canonical English
- PDF upload and pasted-text support
- On-demand Indian-language outputs instead of automatic clutter
- On-demand explanation and action extraction
- Glossary-linked highlighting between source and canonical text
- Setup and quality panels that make the Lingo flow visible

## Screens

| Live sample flow | Result view |
| --- | --- |
| ![LokBhasha homepage](assets/1.png) | ![LokBhasha result view](assets/2.png) |

## Architecture

| Layer | Responsibility |
| --- | --- |
| `frontend/` | Next.js UI exported as static assets for Cloudflare Pages |
| `cloudflare-api/` | Cloudflare Worker API for analyze, enrich, glossary status, setup, and quality routes |
| `cloudflare-api/migrations/0001_glossary.sql` | D1 seed generated from the active government glossary |
| `dict/19k.json` | Curated government glossary source |
| `analyze/` | Shared localization logic and legacy Node harness kept during migration |
| `backend/` | Legacy extraction reference kept only until Cloudflare migration cleanup is complete |

## Glossary Model

LokBhasha uses a government-specific glossary rather than a generic large dictionary.

- active source: `dict/19k.json`
- runtime detection store: Cloudflare D1
- current role: Marathi terminology detection only
- translation authority: Lingo.dev

This separation is intentional:

- D1 finds important terms quickly inside the document
- Lingo.dev performs the actual localization work

## Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js, React, Tailwind CSS |
| API | Cloudflare Workers |
| Glossary detection | Cloudflare D1 |
| PDF preparation | `pdfjs-dist` + `tesseract.js` in the browser |
| Localization | Lingo.dev |
| Testing target | TestSprite MCP |
| Hosting target | Cloudflare |

## Local Setup

### Prerequisites

- Node.js 22+
- npm 10+
- Cloudflare account and Wrangler auth for deploys
- Lingo.dev API key
- TestSprite API key for MCP-based testing

### Install dependencies

```bash
cd cloudflare-api
npm ci
```

```bash
cd frontend
npm ci
```

```bash
cd analyze
npm ci
```

### Environment

Use `.env.example` and `cloudflare-api/.dev.vars.example` as references.

Main values:

- `NEXT_PUBLIC_API_BASE_URL`
- `LINGODOTDEV_API_KEY`
- `LINGODOTDEV_ENGINE_ID`
- `LINGODOTDEV_TARGET_LOCALES`
- `GLOSSARY_LAST_SYNC_AT`
- `GLOSSARY_REMOTE_TERM_COUNT`
- `TESTSPRITE_API_KEY`

### Build the D1 glossary seed

```bash
cd cloudflare-api
npm run build:d1
```

This writes `cloudflare-api/migrations/0001_glossary.sql`.

## Run Locally

### 1. Start the Cloudflare Worker API

```bash
cd cloudflare-api
npm run build:d1
npx wrangler dev
```

### 2. Start the frontend

```bash
cd frontend
npm run dev
```

Default local flow:

- frontend: `http://localhost:3000`
- Cloudflare Worker API: `http://127.0.0.1:8787`

## Public API Shape

### `POST /analyze`

Accepts Marathi text that is either pasted directly or prepared by the frontend from a PDF, detects glossary hits, localizes to canonical English through Lingo.dev, and returns the core result.

### `POST /enrich`

Generates only the optional outputs the user asks for, such as selected target languages or explanation text.

### `GET /glossary-status`

Returns glossary package, D1 readiness, and last known Lingo sync metadata.

### `GET /lingo-setup`

Returns a read-only summary of the active Lingo setup.

### `GET /quality-summary`

Returns glossary/setup quality metadata used by the result UI.

## Cloudflare Deploy Path

### Worker API

```bash
cd cloudflare-api
npm ci
npm run build:d1
npx wrangler d1 execute GLOSSARY_DB --remote --file migrations/0001_glossary.sql
npx wrangler deploy
```

### Frontend

```bash
cd frontend
npm ci
npm run build
npx wrangler pages deploy out --project-name lokbhasha
```

Current public Cloudflare endpoints:

- frontend: `https://lokbhasha.pages.dev`
- api: `https://lokbhasha-api.dpratik3005.workers.dev`

The GitHub deploy workflow in `.github/workflows/deploy.yml` is now shaped around the Cloudflare path:

- deploy Worker API with Wrangler
- apply the D1 glossary seed
- deploy the static frontend to Cloudflare Pages

## TestSprite Focus

This repo is being prepared for a TestSprite-hosted hackathon.

Current testing layers:

- frontend smoke path
- backend API path
- end-to-end analyze and enrich flows
- glossary/setup/quality route checks
- PDF upload path through browser-side extraction

Current committed evidence:

- Round 1 snapshot in `testsprite_tests/round-1/`
- Round 2 snapshot in `testsprite_tests/round-2/`
- TestSprite-generated critical-flow cases committed with the branch-local submission work

TestSprite MCP target command:

```bash
npx @testsprite/testsprite-mcp@latest server
```

The remaining operator requirement is a valid `TESTSPRITE_API_KEY` so the MCP server can be added to Codex with `API_KEY` in the server environment.

## Repository Notes

- `master` is the shipped branch
- feature work should stay in isolated git worktrees before PR and merge
- glossary management remains Lingo-authoritative
- this branch keeps `analyze/` and `backend/` only as migration support until the Cloudflare cutover is finalized
