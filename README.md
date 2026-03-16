# LokBhasha

LokBhasha turns Marathi government documents into an English-first, multi-language analysis pipeline.

Production hosting is split by responsibility:
- Vercel hosts the Next.js frontend only.
- Render hosts the public Node analyze service.
- Render hosts the private FastAPI extraction service.

SQLite remains glossary-only. Lingo.dev remains the only translation and localization engine.

## Current pipeline

1. Upload a PDF or paste Marathi text in the frontend.
2. Send the request from the browser to the public analyze service.
3. Extract Marathi text from PDFs through the private FastAPI extraction service when needed.
4. Detect glossary terms from the SQLite terminology store.
5. Translate Marathi to English with Lingo.dev.
6. Treat English as the canonical document output.
7. Localize canonical English into the configured target locales with Lingo.dev.
8. Render glossary hits, canonical English, simplified English, actions, and localized outputs in the frontend.

## Responsibilities

### SQLite glossary
- Stores Marathi to English terminology only.
- Detects glossary hits in Marathi source text.
- Produces compact terminology hints for the current document.
- Does not perform translation or localization.

### Lingo.dev
- Performs Marathi to English translation.
- Performs English to target-locale localization.
- Remains the only translation and localization engine in the application.

## Key paths

```text
analyze/src/server.ts                  Public Render analyze service
analyze/src/analysis.ts               Marathi -> English -> locales flow
analyze/src/glossary.ts               SQLite glossary detection
analyze/src/lingo.ts                  Lingo.dev client wrapper
analyze/tests/                        Analyze service tests
backend/main.py                       FastAPI extraction service
backend/pdf_parser.py                 PDF and OCR extraction
backend/tests/                        Backend contract and pipeline tests
frontend/src/app/page.tsx             Frontend upload flow
frontend/src/components/ResultsDisplay.tsx
frontend/src/lib/api.ts               Browser client for the public analyze API
frontend/tests/                       Frontend tests
scripts/build_glossary_sqlite.py      Offline glossary builder
sqlite/glossary.sqlite3               Repo-tracked glossary artifact
```

## Local setup

### Prerequisites
- Python 3.11 or 3.12
- Node.js 20+
- Tesseract OCR if you want scanned PDF support
- The repo-tracked `sqlite/glossary.sqlite3` artifact, or a local source file if you need to rebuild it

### Install dependencies

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

```bash
cd frontend
npm ci
```

```bash
cd analyze
npm ci
```

### Configure environment

Use `.env.example` as the shared reference.

Frontend variables:
- `NEXT_PUBLIC_API_BASE_URL`

Analyze service variables:
- `ANALYZE_PORT`
- `EXTRACT_BACKEND_URL`
- `CORS_ALLOWED_ORIGINS`
- `LINGODOTDEV_API_KEY`
- `LINGODOTDEV_ENGINE_ID` (optional)
- `LINGODOTDEV_TARGET_LOCALES`
- `GLOSSARY_DB_PATH`

Extraction service variables:
- `BACKEND_PORT`
- `BACKEND_CORS_ORIGINS`
- `TESSERACT_LANG`
- `BACKEND_MAX_UPLOAD_BYTES`

### Build or verify the glossary database

If you have the source dictionary locally, rebuild the SQLite artifact with:

```bash
python scripts/build_glossary_sqlite.py --source ./sqlite/lingo_dev_mr_en.json --output ./sqlite/glossary.sqlite3
```

Verify that the analyze service can open it:

```bash
cd analyze
npm run verify:glossary
```

## Run locally

### Start the extraction backend

```bash
cd backend
uvicorn main:app --reload --port 5000
```

### Start the analyze service

```bash
cd analyze
npm start
```

### Start the frontend

```bash
cd frontend
npm run dev
```

The browser app runs at `http://localhost:3000` and calls the analyze service at `http://localhost:5001` by default.

## Public APIs

### POST `/extract`

FastAPI endpoint for PDF extraction only.

```bash
curl -X POST -F "file=@circular.pdf" http://localhost:5000/extract
```

### POST `/analyze`

Public analyze endpoint exposed by the Node service. Accepts a PDF upload or raw Marathi text, detects glossary hits from SQLite, translates with Lingo.dev, localizes from English, and returns the complete analysis payload.

```bash
curl -X POST -F "marathiText=अर्ज सादर करा" http://localhost:5001/analyze
```

## Deployment

### Vercel frontend

The frontend is a pure client app. Set:
- `NEXT_PUBLIC_API_BASE_URL=https://<your-render-analyze-service>`

### Render analyze service

Use the public `lokbhasha-analyze` service from `render.yaml`. It needs:
- `LINGODOTDEV_API_KEY`
- `LINGODOTDEV_ENGINE_ID` (optional)
- `LINGODOTDEV_TARGET_LOCALES`
- `CORS_ALLOWED_ORIGINS`
- `GLOSSARY_DB_PATH`
- `EXTRACT_BACKEND_URL`

### Render extraction service

Use the private `lokbhasha-extract` service from `render.yaml`. It owns only:
- `BACKEND_PORT`
- `TESSERACT_LANG`
- `BACKEND_MAX_UPLOAD_BYTES`

## CI

GitHub Actions runs:
- Backend unit and contract tests
- Backend smoke validation for `/health` and `/extract`
- Analyze service tests, glossary verification, and type-checking
- Frontend tests and production build
