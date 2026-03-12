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
- Python 3.10+
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
  "english": "Submit application as per this notification",
  "simplified": "You must submit an application following these instructions",
  "actions": [
    {
      "action": "Submit application",
      "deadline": null,
      "requirement": "As per notification"
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
docker build -t lokbhasha-backend .
docker push your-registry/lokbhasha-backend
```

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
