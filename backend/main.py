"""
LokBhasha Backend - FastAPI Server
Marathi PDF Extraction Service
"""

from __future__ import annotations

from contextlib import suppress
import logging
import os
from pathlib import Path
from threading import Lock
import time
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.responses import JSONResponse, Response


load_dotenv()
LOGGER = logging.getLogger(__name__)

DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
DEFAULT_RATE_LIMIT_REQUESTS = 0
DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60
PDF_SIGNATURE = b"%PDF-"
ALLOWED_PDF_CONTENT_TYPES = {
    "application/pdf",
    "application/x-pdf",
    "application/acrobat",
    "applications/vnd.pdf",
    "text/pdf",
    "text/x-pdf",
}
ALLOWED_CORS_METHODS = ["GET", "POST", "OPTIONS"]
ALLOWED_CORS_HEADERS = ["Accept", "Content-Type"]
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Cache-Control": "no-store",
}

UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
UPLOADS_ROOT = UPLOADS_DIR.resolve()

RATE_LIMIT_LOCK = Lock()
RATE_LIMIT_STATE: dict[str, tuple[float, int]] = {}


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


def _get_max_upload_bytes() -> int:
    configured = os.getenv("BACKEND_MAX_UPLOAD_BYTES", "").strip()
    try:
        parsed = int(configured)
    except ValueError:
        parsed = 0

    return parsed if parsed > 0 else DEFAULT_MAX_UPLOAD_BYTES


def _get_rate_limit_window_seconds() -> int:
    configured = os.getenv("BACKEND_RATE_LIMIT_WINDOW_SECONDS", "").strip()
    try:
        parsed = int(configured)
    except ValueError:
        parsed = 0

    return parsed if parsed > 0 else DEFAULT_RATE_LIMIT_WINDOW_SECONDS


def _get_rate_limit_requests() -> int:
    configured = os.getenv("BACKEND_RATE_LIMIT_REQUESTS", "").strip()
    try:
        parsed = int(configured)
    except ValueError:
        parsed = 0

    return parsed if parsed > 0 else DEFAULT_RATE_LIMIT_REQUESTS


def _normalized_upload_filename(filename: str | None) -> str:
    if not filename:
        return ""

    normalized = filename.replace("\\", "/")
    return normalized.rsplit("/", maxsplit=1)[-1]


def _validate_upload_path(pdf_path: str | Path) -> Path:
    candidate = Path(pdf_path).resolve(strict=True)
    if candidate.parent != UPLOADS_ROOT or candidate.suffix.lower() != ".pdf":
        raise RuntimeError("PDF extraction only supports files from the managed upload directory.")

    return candidate


def _apply_security_headers(response: Response, request: Request | None = None) -> Response:
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value

    forwarded_proto = request.headers.get("x-forwarded-proto", "") if request else ""
    if request and (request.url.scheme == "https" or forwarded_proto.lower() == "https"):
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return response


def _validate_pdf_upload(file: UploadFile, file_content: bytes) -> None:
    normalized_filename = _normalized_upload_filename(file.filename)
    if not normalized_filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    if Path(normalized_filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported.")

    if file.content_type not in ALLOWED_PDF_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Uploaded file has an unsupported content type.")

    if not file_content:
        raise HTTPException(status_code=400, detail="Uploaded PDF file is empty.")

    if len(file_content) > _get_max_upload_bytes():
        raise HTTPException(
            status_code=413,
            detail="Uploaded PDF exceeds the maximum allowed size.",
        )

    if not file_content.startswith(PDF_SIGNATURE):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid PDF.")


def _enforce_extract_rate_limit(request: Request) -> JSONResponse | None:
    client_host = request.client.host if request.client else "unknown"
    now = time.monotonic()
    window_seconds = _get_rate_limit_window_seconds()
    max_requests = _get_rate_limit_requests()

    if max_requests <= 0:
        return None

    with RATE_LIMIT_LOCK:
        window_started_at, request_count = RATE_LIMIT_STATE.get(client_host, (now, 0))
        if now - window_started_at >= window_seconds:
            window_started_at, request_count = now, 0

        if request_count >= max_requests:
            response = JSONResponse(
                status_code=429,
                content={"detail": "Too many extraction requests. Please try again later."},
            )
            return _apply_security_headers(response, request)

        RATE_LIMIT_STATE[client_host] = (window_started_at, request_count + 1)

    return None


class HealthResponse(BaseModel):
    status: str


class ExtractResponse(BaseModel):
    text: str
    confidence: float


app = FastAPI(
    title="LokBhasha API",
    description="Government Marathi PDF extraction service",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=ALLOWED_CORS_METHODS,
    allow_headers=ALLOWED_CORS_HEADERS,
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    if request.method == "POST" and request.url.path == "/extract":
        rate_limit_response = _enforce_extract_rate_limit(request)
        if rate_limit_response is not None:
            return rate_limit_response

    response = await call_next(request)
    return _apply_security_headers(response, request)


def _extract_pdf_text_safe(pdf_path: str):
    validated_path = _validate_upload_path(pdf_path)
    try:
        from pdf_parser import extract_pdf_text
    except ImportError as exc:
        raise RuntimeError(
            "PDF extraction dependencies are missing. Install backend requirements to enable uploads."
        ) from exc

    return extract_pdf_text(str(validated_path))


async def _extract_uploaded_pdf(file: UploadFile) -> tuple[str, float]:
    temp_path: Path | None = None
    try:
        file_content = await file.read()
        _validate_pdf_upload(file, file_content)

        temp_path = UPLOADS_DIR / f"{uuid4().hex}.pdf"
        temp_path.write_bytes(file_content)

        extraction_result = _extract_pdf_text_safe(str(temp_path))
        return extraction_result.text, extraction_result.confidence
    except HTTPException:
        raise
    except RuntimeError as runtime_error:
        raise HTTPException(status_code=503, detail=str(runtime_error)) from runtime_error
    except Exception as exc:
        LOGGER.exception("Unexpected PDF extraction failure")
        raise HTTPException(status_code=500, detail="Error processing PDF.") from exc
    finally:
        if temp_path:
            with suppress(FileNotFoundError):
                temp_path.unlink()


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post("/extract", response_model=ExtractResponse)
async def extract(file: UploadFile = File(...)) -> ExtractResponse:
    text, confidence = await _extract_uploaded_pdf(file)
    return ExtractResponse(text=text, confidence=confidence)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("BACKEND_PORT", "5000")))
