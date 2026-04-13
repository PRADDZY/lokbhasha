# LokBhasha

> Understand Marathi government documents in clear English, then localize them into other Indian languages with Lingo.dev.

[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages%20%2B%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://lokbhasha.pages.dev)
[![Lingo.dev](https://img.shields.io/badge/Lingo.dev-localization-111827?style=for-the-badge)](https://lingo.dev)
[![TestSprite](https://img.shields.io/badge/TestSprite-MCP%20tested-2563EB?style=for-the-badge)](testsprite_tests/testsprite-mcp-test-report.md)
[![Next.js](https://img.shields.io/badge/Next.js-static%20export-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](frontend)

LokBhasha is a Cloudflare-hosted document localization workflow for public-service communication. It accepts Marathi circulars and notices, detects government terminology from a curated 19k glossary, produces canonical English through Lingo.dev, and localizes that English into user-selected Indian languages.

| Experience | Link |
| --- | --- |
| Demo video | [YouTube walkthrough](https://www.youtube.com/watch?v=8Ga9puHhpMc) |
| Live app | [lokbhasha.pages.dev](https://lokbhasha.pages.dev) |
| Live API health check | [lokbhasha-api.dpratik3005.workers.dev/health](https://lokbhasha-api.dpratik3005.workers.dev/health) |
| Current TestSprite report | [testsprite-mcp-test-report.md](testsprite_tests/testsprite-mcp-test-report.md) |

## Table of Contents

- [Why LokBhasha](#why-lokbhasha)
- [Product Flow](#product-flow)
- [Screens](#screens)
- [TestSprite-Guided Quality Work](#testsprite-guided-quality-work)
- [Architecture](#architecture)
- [Glossary and Lingo Model](#glossary-and-lingo-model)
- [Local Setup](#local-setup)
- [Public API](#public-api)
- [Cloudflare Deployment](#cloudflare-deployment)
- [Repository Notes](#repository-notes)

## Why LokBhasha

Government documents often reach citizens in language that is formal, domain-heavy, and slow to interpret. LokBhasha is designed to preserve official terminology where accuracy matters while making the document understandable and portable across languages.

| Principle | Implementation |
| --- | --- |
| Preserve official terms | Cloudflare D1 detects matches from the curated government glossary before localization. |
| Keep translation authoritative | Lingo.dev handles Marathi to English and English to Indian-language localization. |
| Avoid noisy output | Users choose when to generate translations, explanations, and action items. |
| Make quality visible | The UI shows glossary hits, setup status, quality metadata, and baseline comparison details. |

## Product Flow

1. Upload a PDF or paste Marathi text.
2. Prepare PDFs in the browser with embedded-text extraction and OCR fallback.
3. Detect government glossary matches from the Cloudflare D1 term store.
4. Localize Marathi into canonical English through Lingo.dev.
5. Generate optional Indian-language outputs, explanations, or action items on demand.
6. Review glossary context, Lingo setup context, quality context, and side-by-side results.

## Screens

| Live sample flow | Result view |
| --- | --- |
| ![LokBhasha homepage with Marathi document input](assets/1.png) | ![LokBhasha result view with canonical English and glossary context](assets/2.png) |

## TestSprite-Guided Quality Work

TestSprite was used as the primary product-testing driver for the Cloudflare version of LokBhasha. The workflow covered the live sample path, PDF analysis, pasted-text analysis, result persistence, optional localized outputs, details-page quality panels, glossary surfaces, and validation states.

| Evidence | Result | What it changed |
| --- | ---: | --- |
| Targeted migration smoke runs | 7/7 selected flows passed | Confirmed the PDF upload path and optional-output flows after Cloudflare migration polish. |
| Full frontend E2E sweep | 16/20 tests passed | Exercised the production static export on `localhost:3000` against the live Cloudflare Worker API. |
| Current report | [Open report](testsprite_tests/testsprite-mcp-test-report.md) | Documents generated-test mismatches and the remaining backend endpoint testing note. |

> [!NOTE]
> The current four failed TestSprite cases are classified in the report as generated-plan assumption mismatches, not confirmed application crashes. They should be revised in TestSprite or intentionally turned into product requirements before rerunning unchanged.

The current TestSprite sweep directly influenced the project by tightening the browser-driven upload flow, clarifying optional-output persistence, validating result-detail quality panels, and separating frontend E2E coverage from Worker endpoint coverage. Backend endpoint tests should be run separately against the live or local Worker service rather than the static frontend server.

<details>
<summary>Run the TestSprite MCP server</summary>

Set `TESTSPRITE_API_KEY` in the MCP server environment, then start the server:

```bash
npx @testsprite/testsprite-mcp@latest server
```

</details>

## Architecture

```text
Marathi PDF or text
        |
        v
Next.js static frontend on Cloudflare Pages
        |
        v
Cloudflare Worker API
        |
        +--> Cloudflare D1 glossary detection
        |
        +--> Lingo.dev localization
        |
        v
Canonical English, glossary context, optional translations, explanations, and actions
```

| Layer | Responsibility |
| --- | --- |
| `frontend/` | Next.js UI exported as static assets for Cloudflare Pages. |
| `cloudflare-api/` | Cloudflare Worker API for analyze, enrich, glossary status, setup, and quality routes. |
| `cloudflare-api/migrations/0001_glossary.sql` | D1 seed generated from the active government glossary. |
| `dict/19k.json` | Curated government glossary source. |
| `analyze/` | Shared localization logic and legacy Node harness kept during migration. |
| `backend/` | Legacy extraction reference kept only until Cloudflare migration cleanup is complete. |

## Glossary and Lingo Model

LokBhasha uses a government-specific glossary instead of a generic large dictionary.

| Concern | Owner |
| --- | --- |
| Active glossary source | `dict/19k.json` |
| Runtime term detection | Cloudflare D1 |
| Translation authority | Lingo.dev |
| Current glossary role | Marathi terminology detection and UI context |
| Current Lingo path | Marathi to English, then English to selected Indian languages |

This separation is intentional: D1 quickly finds important terms inside the document, while Lingo.dev performs the localization work.

## Local Setup

### Prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js | Version 22+ |
| npm | Version 10+ |
| Cloudflare | Account access and Wrangler authentication for deploys |
| Lingo.dev | API key and engine ID |
| TestSprite | API key for MCP-based testing |

<details open>
<summary>Install dependencies</summary>

```bash
cd cloudflare-api
npm ci
```

```bash
cd ../frontend
npm ci
```

```bash
cd ../analyze
npm ci
```

</details>

<details>
<summary>Configure environment</summary>

Use `.env.example` and `cloudflare-api/.dev.vars.example` as references.

| Variable | Used by |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend API routing |
| `LINGODOTDEV_API_KEY` | Worker localization calls |
| `LINGODOTDEV_ENGINE_ID` | Lingo.dev engine selection |
| `LINGODOTDEV_TARGET_LOCALES` | Optional Indian-language output list |
| `GLOSSARY_LAST_SYNC_AT` | Glossary status surface |
| `GLOSSARY_REMOTE_TERM_COUNT` | Glossary status surface |
| `TESTSPRITE_API_KEY` | TestSprite MCP server |

</details>

<details>
<summary>Build the D1 glossary seed</summary>

```bash
cd cloudflare-api
npm run build:d1
```

This writes `cloudflare-api/migrations/0001_glossary.sql`.

</details>

### Run Locally

Start the Worker API:

```bash
cd cloudflare-api
npm run build:d1
npx wrangler dev
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Default local URLs:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Worker API | `http://127.0.0.1:8787` |

## Public API

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Worker health check. |
| `POST /analyze` | Accepts Marathi text prepared by the frontend, detects glossary hits, localizes to canonical English through Lingo.dev, and returns the core result. |
| `POST /enrich` | Generates optional outputs the user asks for, such as selected target languages or explanation text. |
| `GET /glossary-status` | Returns glossary package, D1 readiness, and last known Lingo sync metadata. |
| `GET /lingo-setup` | Returns a read-only summary of the active Lingo setup. |
| `GET /quality-summary` | Returns glossary and setup quality metadata used by the result UI. |
| `POST /quality/baseline-compare` | Compares the current canonical result with the same request without glossary hints. |

## Cloudflare Deployment

The GitHub deploy workflow in `.github/workflows/deploy.yml` is shaped around Cloudflare Pages, Cloudflare Workers, and D1.

| Job | Action |
| --- | --- |
| Deploy Cloudflare API | Install Worker dependencies, build the D1 seed, apply the remote D1 migration, deploy the Worker. |
| Deploy Cloudflare Pages Frontend | Install frontend dependencies, build the static Next.js export, deploy `frontend/out`. |
| Deployment Summary | Report job-level outcomes. |

<details>
<summary>Deploy the Worker API manually</summary>

```bash
cd cloudflare-api
npm ci
npm run build:d1
npx wrangler d1 execute GLOSSARY_DB --remote --file migrations/0001_glossary.sql
npx wrangler deploy
```

</details>

<details>
<summary>Deploy the frontend manually</summary>

```bash
cd frontend
npm ci
npm run build
npx wrangler pages deploy out --project-name lokbhasha
```

</details>

Current public Cloudflare endpoints:

| Service | URL |
| --- | --- |
| Frontend | `https://lokbhasha.pages.dev` |
| API | `https://lokbhasha-api.dpratik3005.workers.dev` |

## Repository Notes

- `master` is the shipped branch for this repository.
- Feature work should stay in isolated git worktrees before review and merge.
- Glossary management remains Lingo-authoritative; D1 is the runtime detection store.
- `analyze/` and `backend/` remain in the repo as migration support until the Cloudflare cutover cleanup is complete.
