# LokBhasha

LokBhasha turns Marathi government documents into an English-first, multi-language analysis pipeline. PDF extraction stays in FastAPI, SQLite is used only for glossary detection, and all translation and localization are delegated to Lingo.dev from the Next.js server runtime.

## Current pipeline

1. Upload a PDF or paste Marathi text.
2. Extract Marathi text from the PDF with the Python backend when needed.
3. Detect glossary terms from a SQLite terminology store.
4. Translate Marathi to English with Lingo.dev.
5. Treat English as the canonical document output.
6. Localize canonical English into the configured target locales with Lingo.dev.
7. Render glossary hits, canonical English, simplified English, actions, and localized outputs in the frontend.

## Responsibilities

### SQLite glossary
- Stores Marathi to English terminology only.
- Detects glossary hits in Marathi source text.
- Produces compact terminology hints for the current document.
- Does not perform translation or localization.

### Lingo.dev
- Performs Marathi to English translation.
- Performs English to target-locale localization.
- Remains the only translation/localization engine in the application.

## Stack

### Backend
- FastAPI for health checks and PDF extraction.
- PyMuPDF plus pytesseract for PDF and OCR extraction.
- Uvicorn for local and container runtime.

### Frontend
- Next.js App Router with a Node runtime route handler for `/api/analyze`.
- `better-sqlite3` for indexed glossary lookups.
- `lingo.dev` JavaScript SDK for translation and localization.

## Key paths

```text
backend/main.py                        FastAPI extraction service
backend/pdf_parser.py                  PDF and OCR extraction
backend/tests/                         Backend contract and pipeline tests
frontend/src/app/api/analyze/route.ts  Primary analysis endpoint
frontend/src/lib/server/analysis.ts    Marathi -> English -> locales flow
frontend/src/lib/server/glossary.ts    SQLite glossary detection
frontend/src/lib/server/lingo.ts       Lingo.dev client wrapper
frontend/tests/                        Analyze route and glossary tests
scripts/build_glossary_sqlite.py       Offline glossary builder
dict/glossary.sqlite3                  Built glossary artifact (not committed)
```

## Local setup

### Prerequisites
- Python 3.11 or 3.12
- Node.js 20+
- Tesseract OCR if you want scanned PDF support
- A local glossary source file if you need to build `dict/glossary.sqlite3`

### Install backend dependencies

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Install frontend dependencies

```bash
cd frontend
npm ci
```

### Configure environment

Use `.env.example` as the shared reference for required variables.

Frontend or Node runtime variables:
- `LINGODOTDEV_API_KEY`
- `LINGODOTDEV_TARGET_LOCALES`
- `BACKEND_URL`
- `GLOSSARY_DB_PATH`

Backend variables:
- `BACKEND_PORT`
- `BACKEND_CORS_ORIGINS`
- `TESSERACT_LANG`

### Build the glossary database

If you have the source dictionary locally, build the SQLite artifact before using the analyze route:

```bash
python scripts/build_glossary_sqlite.py --source ./dict/lingo_dev_mr_en.json --output ./dict/glossary.sqlite3
```

Then verify that the frontend runtime can actually open it:

```bash
cd frontend
npm run verify:glossary
```

The source dictionary and the generated SQLite artifact are ignored by git. Deployments must provide the built SQLite file separately and set `GLOSSARY_DB_PATH` to its runtime location.

## Run locally

### Start the extraction backend

```bash
cd backend
uvicorn main:app --reload --port 5000
```

### Start the frontend

```bash
cd frontend
npm run dev
```

The browser app runs at `http://localhost:3000` and calls the extraction backend at `http://localhost:5000` by default.

## Public API

### POST `/extract`

FastAPI endpoint for PDF extraction only.

```bash
curl -X POST -F "file=@circular.pdf" http://localhost:5000/extract
```

Response shape:

```json
{
  "text": "Extracted Marathi text",
  "confidence": 0.95
}
```

### POST `/api/analyze`

Primary application endpoint exposed by Next.js. Accepts a PDF upload or raw Marathi text, detects glossary hits from SQLite, translates with Lingo.dev, localizes from English, and returns the complete analysis payload.

Example response shape:

```json
{
  "source": "pdf",
  "marathiText": "मराठी मजकूर",
  "extractionConfidence": 0.95,
  "glossaryHits": [
    {
      "canonicalTerm": "अर्ज",
      "matchedText": "अर्ज",
      "meaning": "application",
      "start": 12,
      "end": 16,
      "matchType": "exact",
      "confidence": 1
    }
  ],
  "terminologyHints": {
    "अर्ज": ["application"]
  },
  "englishCanonical": "Submit the application.",
  "localizedText": {
    "hi": "आवेदन जमा करें।",
    "gu": "અરજી સબમિટ કરો."
  },
  "simplifiedEnglish": "Submit the application.",
  "actions": [
    {
      "action": "Submit the application",
      "deadline": null,
      "requirement": null
    }
  ]
}
```

## Deployment notes

### Backend

`render.yaml` deploys the FastAPI extraction service. Its runtime only needs extraction-related configuration:
- `BACKEND_PORT`
- `BACKEND_CORS_ORIGINS`
- `TESSERACT_LANG`

Procfile-based hosts should start the backend from the `backend` directory:

```bash
web: cd backend && uvicorn main:app --host 0.0.0.0 --port ${PORT:-5000}
```

### Frontend

The Next.js app now owns the analysis pipeline. Any production host for the frontend must provide:
- `LINGODOTDEV_API_KEY`
- `LINGODOTDEV_TARGET_LOCALES`
- `BACKEND_URL`
- `GLOSSARY_DB_PATH`
- A readable SQLite glossary artifact at the configured path

Before promoting a deploy, run `npm run verify:glossary` in `frontend/` anywhere the artifact is mounted.

## CI and release workflows

GitHub Actions currently runs:
- Backend unit and contract tests from `backend/tests`
- A backend smoke check against `/health` and `/extract`
- Frontend tests
- Frontend production build

Deployment automation:
- `.github/workflows/deploy.yml` triggers deploy hooks after CI
- `.github/workflows/release.yml` creates tagged GitHub releases

## Contributing

1. Create a feature branch.
2. Make focused changes.
3. Run the relevant backend and frontend checks before committing.
4. Push the branch and open a pull request when ready.
