"""
LokBhasha Backend - FastAPI Server
Marathi Government Document Translator
"""

from contextlib import suppress
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from uuid import uuid4

from actions import extract_actions
from glossary import detect_glossary_terms
from pdf_parser import extract_pdf_text
from simplifier import simplify_english_text
from translator import translate_marathi_text


UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title="LokBhasha API",
    description="Government Marathi Document Translator",
    version="0.1.0"
)

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://localhost:5000",
    "https://localhost:3000",
    "https://vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class TranslateRequest(BaseModel):
    marathi_text: str

class TranslateResponse(BaseModel):
    marathi: str
    english: str
    simplified: str
    actions: list
    glossary_terms: dict


class UploadResponse(BaseModel):
    text: str
    glossary: dict
    confidence: float

# Health check
@app.get("/health")
async def health():
    return {"status": "ok"}

# Upload endpoint (stub)
@app.post("/upload", response_model=UploadResponse)
async def upload(file: UploadFile = File(...)):
    """
    Upload a PDF file and extract Marathi text with glossary.
    """
    temp_path: Path | None = None
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

        if Path(file.filename).suffix.lower() != ".pdf":
            raise HTTPException(status_code=400, detail="Only PDF uploads are supported.")

        temp_path = UPLOADS_DIR / f"{uuid4().hex}.pdf"
        temp_path.write_bytes(await file.read())

        extraction_result = extract_pdf_text(str(temp_path))
        glossary = detect_glossary_terms(extraction_result.text)

        return UploadResponse(
            text=extraction_result.text,
            glossary=glossary,
            confidence=extraction_result.confidence,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing PDF: {str(e)}")
    finally:
        if temp_path:
            with suppress(FileNotFoundError):
                temp_path.unlink()

# Translate endpoint (stub)
@app.post("/translate", response_model=TranslateResponse)
async def translate(request: TranslateRequest):
    """
    Translate Marathi text to English with full processing pipeline.
    """
    try:
        glossary_terms = detect_glossary_terms(request.marathi_text)
        english_translation = translate_marathi_text(request.marathi_text, glossary_terms)
        simplified_text = simplify_english_text(english_translation)
        actions = extract_actions(simplified_text)
        
        return TranslateResponse(
            marathi=request.marathi_text,
            english=english_translation,
            simplified=simplified_text,
            actions=actions,
            glossary_terms=glossary_terms
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing text: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
