"""
LokBhasha Backend - FastAPI Server
Marathi PDF Extraction Service
"""

from contextlib import suppress
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from uuid import uuid4
from dotenv import load_dotenv


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
    description="Government Marathi PDF extraction service",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    text, confidence = await _extract_uploaded_pdf(file)
    return {"text": text, "confidence": confidence}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("BACKEND_PORT", "5000")))
