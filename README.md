# LokBhasha — Government Marathi Document Translator

**Making government language understandable.**

LokBhasha is a web application that transforms complex Marathi government circulars into simple, actionable English. It extracts text from PDFs or pasted content, translates it using Lingo.dev, simplifies bureaucratic language, and highlights critical terms.

## Features

- 📄 **PDF & Text Input** — Upload government circulars (PDFs) or paste Marathi text
- 🔤 **Smart Text Extraction** — Handles both digital PDFs and scanned documents (OCR)
- 🌐 **Intelligent Translation** — Marathi to English using Lingo.dev with glossary hints
- 📖 **Dictionary Highlighting** — Marks complex government terms with definitions
- ✍️ **Plain English Summary** — Converts bureaucratic language to simple explanations
- ✅ **Action Extraction** — Identifies key actions, deadlines, and requirements
- 🎨 **Professional UI** — Clean, accessible Next.js + Tailwind interface

## Tech Stack

### Backend
- **Framework:** FastAPI (Python)
- **PDF Processing:** PyMuPDF + pytesseract
- **Translation:** Lingo.dev API
- **Text Matching:** rapidfuzz
- **Server:** Uvicorn

### Frontend
- **Framework:** Next.js + TypeScript
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Project Structure

```
lokbhasha/
├── backend/
│   ├── main.py                 # FastAPI server
│   ├── dictionary.py           # Dictionary loading
│   ├── glossary.py             # Glossary detection
│   ├── pdf_parser.py           # PDF extraction
│   ├── translator.py           # Lingo.dev integration
│   ├── simplifier.py           # Text simplification
│   ├── actions.py              # Action extraction
│   └── requirements.txt
├── frontend/
│   ├── pages/
│   │   ├── index.tsx           # Upload page
│   │   └── result.tsx          # Results page
│   ├── components/
│   ├── lib/
│   │   └── api.ts              # API client
│   └── package.json
├── dict/                        # Marathi dictionary files
│   └── lingo_dev_mr_en.json
├── uploads/                     # Temporary uploads
├── .env.example
├── .gitignore
└── README.md
```

## Setup & Installation

### Prerequisites
- Python 3.11 or 3.12 recommended
- Node.js 18+
- Tesseract OCR (for scanned PDF support)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
```

### Environment Configuration

1. Copy `.env.example` to `.env`
```bash
cp .env.example .env
```

2. Add your Lingo.dev API key:
```
LINGO_DEV_API_KEY=your_actual_api_key_here
```

3. Keep mock mode enabled until the real Lingo.dev integration is wired:
```
LINGO_DEV_USE_MOCK=true
TESSERACT_LANG=mar+eng
```

## Running the Application

### Start Backend Server

```bash
cd backend
uvicorn main:app --reload --port 5000
```

Backend will be available at `http://localhost:5000`

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:3000`

## API Endpoints

### POST `/upload`
Upload a PDF file and extract Marathi text with detected glossary terms.

**Request:**
```bash
curl -X POST -F "file=@circular.pdf" http://localhost:5000/upload
```

**Response:**
```json
{
  "text": "अधिसूचना...",
  "glossary": {
    "अधिसूचना": "notification",
    "अर्ज": "application"
  },
  "confidence": 0.95
}
```

### POST `/translate`
Translate Marathi text to English with all processing steps.

**Request:**
```json
{
  "marathi_text": "सदर अधिसूचनेन्वये अर्ज सादर करावा"
}
```

**Response:**
```json
{
  "marathi": "सदर अधिसूचनेन्वये अर्ज सादर करावा",
  "english": "[MOCK] English translation placeholder for: सदर अधिसूचनेन्वये अर्ज सादर करावा",
  "simplified": "[PLAIN] English translation placeholder for: सदर अधिसूचनेन्वये अर्ज सादर करावा",
  "actions": [
    {
      "action": "Submit application before March 31",
      "deadline": null,
      "requirement": "Submit application before March 31"
    }
  ],
  "glossary_terms": {
    "अधिसूचना": "notification",
    "अर्ज": "application"
  }
}
```

## Deployment

### Frontend (Vercel)
```bash
git push origin main
# Auto-deploys via Vercel GitHub integration
```

### Backend (Cloud Run / Render / Railway)
```bash
# Build and push Docker image
docker build -f backend/Dockerfile -t lokbhasha-backend .
docker push your-registry/lokbhasha-backend
```

One-click deployment files included:
- `render.yaml` for Render Blueprint deployments
- `railway.json` for Railway Docker deployments

Runtime environment variables:
- `BACKEND_PORT` (default `5000`)
- `BACKEND_CORS_ORIGINS` (comma-separated allowed origins)
- `LINGO_DEV_USE_MOCK` (`true` for mock mode, `false` for real API attempts)

Procfile-based platforms can run:
```bash
web: uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-5000}
```

## Continuous Integration

GitHub Actions workflow:
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/release.yml`

Checks on every push and pull request:
- Backend unit and API contract tests
- Backend smoke API check (`/health` and `/translate`)
- Frontend production build

## Deployment Automation

Deployment workflow:
- `.github/workflows/deploy.yml`

Trigger behavior:
- Runs automatically after the CI workflow succeeds on `master`/`main`
- Can also be triggered manually with `workflow_dispatch`

Required GitHub secrets:
- `RENDER_DEPLOY_HOOK_URL` for backend deploy hook
- `VERCEL_DEPLOY_HOOK_URL` for frontend deploy hook

## Release Management

Manual release workflow:
- `.github/workflows/release.yml`

How to cut a release:
1. Open Actions and run the `Release` workflow manually.
2. Provide a semantic tag like `v0.5.0`.
3. Provide a release title.
4. Set pre-release mode when needed.

The workflow validates the tag format, creates/pushes the tag, and publishes a GitHub release with generated notes.

## Branch Protection

Recommended branch protection for `master`:
- Require pull request before merging
- Require status checks to pass before merging
- Require conversation resolution before merging
- Restrict force pushes and branch deletion

Recommended required status checks:
- `Backend Tests`
- `Backend Smoke API`
- `Frontend Build`

## Roadmap

### Current MVP (Phase 1-9)
- ✅ PDF extraction + OCR
- ✅ Glossary detection from dictionary
- ✅ Lingo.dev translation integration
- ✅ Text simplification
- ✅ Action extraction
- ✅ Frontend UI (upload + results)
- ✅ Full E2E pipeline
- ✅ Testing & accessibility
- ✅ Docker deployment ready

### Future Features (Stretch Goals)
- Hindi translation support
- Website URL scraping for government notices
- Advanced action categorization (deadlines, responsible officers)
- User accounts & document history
- Mobile app (React Native)

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Create a feature branch
```bash
git checkout -b feature/your-feature-name
```

2. Make changes and test
3. Commit with clear messages:
```bash
git commit -m "Add feature: description"
```

4. Push and create a Pull Request
```bash
git push origin feature/your-feature-name
```

## License

MIT License — See LICENSE file for details

## Support

For issues, questions, or feedback:
- GitHub Issues: https://github.com/PRADDZY/lokbhasha/issues
- Email: contact@lokbhasha.dev

---

**LokBhasha: Making Government Language Understandable** 🇮🇳
