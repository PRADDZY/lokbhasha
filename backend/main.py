"""
LokBhasha Backend - FastAPI Server
Marathi Government Document Translator
"""

from contextlib import suppress
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from uuid import uuid4
from typing import Any
from dotenv import load_dotenv

from actions import extract_actions
from glossary import detect_glossary_terms
from simplifier import simplify_english_text
from translator import translate_marathi_text


load_dotenv()


UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)


def _allowed_origins() -> list[str]:
    configured = os.getenv("BACKEND_CORS_ORIGINS", "").strip()
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]

    return [
        "http://localhost:3000",
        "http://localhost:5000",
        "https://localhost:3000",
        "https://vercel.app",
    ]

# Initialize FastAPI app
app = FastAPI(
    title="LokBhasha API",
    description="Government Marathi Document Translator",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
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
    actions: list[dict[str, Any]]
    glossary_terms: dict[str, str]


class UploadResponse(BaseModel):
    text: str
    glossary: dict[str, str]
    confidence: float


class ExtractResponse(BaseModel):
    text: str
    confidence: float


def _extract_pdf_text_safe(pdf_path: str):
    try:
        from pdf_parser import extract_pdf_text
    except ImportError as exc:
        raise RuntimeError(
            "PDF extraction dependencies are missing. Install backend requirements to enable uploads."
        ) from exc

    return extract_pdf_text(pdf_path)


async def _extract_uploaded_pdf(file: UploadFile) -> tuple[str, float]:
    temp_path: Path | None = None
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

        if Path(file.filename).suffix.lower() != ".pdf":
            raise HTTPException(status_code=400, detail="Only PDF uploads are supported.")

        file_content = await file.read()
        if not file_content:
            raise HTTPException(status_code=400, detail="Uploaded PDF file is empty.")

        temp_path = UPLOADS_DIR / f"{uuid4().hex}.pdf"
        temp_path.write_bytes(file_content)

        extraction_result = _extract_pdf_text_safe(str(temp_path))
        return extraction_result.text, extraction_result.confidence
    except HTTPException:
        raise
    except RuntimeError as runtime_error:
        raise HTTPException(status_code=503, detail=str(runtime_error)) from runtime_error
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(exc)}") from exc
    finally:
        if temp_path:
            with suppress(FileNotFoundError):
                temp_path.unlink()

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
    text, confidence = await _extract_uploaded_pdf(file)
    glossary = detect_glossary_terms(text)

    return UploadResponse(
        text=text,
        glossary=glossary,
        confidence=confidence,
    )


@app.post("/extract", response_model=ExtractResponse)
async def extract(file: UploadFile = File(...)):
    text, confidence = await _extract_uploaded_pdf(file)
    return ExtractResponse(text=text, confidence=confidence)

# Translate endpoint (stub)
@app.post("/translate", response_model=TranslateResponse)
async def translate(request: TranslateRequest):
    """
    Translate Marathi text to English with full processing pipeline.
    """
    try:
        if not request.marathi_text.strip():
            raise HTTPException(status_code=400, detail="marathi_text cannot be empty.")

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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing text: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("BACKEND_PORT", "5000")))
