"""PDF extraction helpers for LokBhasha."""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
import os
from pathlib import Path

import fitz
from PIL import Image
import pytesseract

from text_processor import clean_extracted_text, estimate_text_confidence


OCR_RENDER_SCALE = 2.0
MIN_DIGITAL_TEXT_LENGTH = 40
UPLOADS_ROOT = (Path(__file__).resolve().parents[1] / "uploads").resolve()


@dataclass(frozen=True)
class PDFExtractionResult:
    text: str
    confidence: float
    used_ocr: bool


def _render_page_image(page: fitz.Page) -> Image.Image:
    pixmap = page.get_pixmap(matrix=fitz.Matrix(OCR_RENDER_SCALE, OCR_RENDER_SCALE), alpha=False)
    return Image.open(BytesIO(pixmap.tobytes("png")))


def _extract_page_text_with_ocr(page: fitz.Page) -> str:
    image = _render_page_image(page)
    languages = os.getenv("TESSERACT_LANG", "mar+eng")
    return pytesseract.image_to_string(image, lang=languages)


def _has_meaningful_text(text: str) -> bool:
    return len(clean_extracted_text(text)) >= MIN_DIGITAL_TEXT_LENGTH


def _extract_digital_text(document: fitz.Document) -> str:
    page_text = [page.get_text("text") for page in document]
    return clean_extracted_text("\n\n".join(page_text))


def _extract_ocr_text(document: fitz.Document) -> str:
    page_text: list[str] = []
    for page in document:
        page_text.append(_extract_page_text_with_ocr(page))

    return clean_extracted_text("\n\n".join(page_text))


def _validated_pdf_path(pdf_path: str | Path) -> Path:
    candidate = Path(pdf_path).resolve(strict=True)
    if candidate.parent != UPLOADS_ROOT or candidate.suffix.lower() != ".pdf":
        raise RuntimeError("PDF extraction only supports files from the managed upload directory.")

    return candidate


def extract_pdf_text(pdf_path: str) -> PDFExtractionResult:
    validated_path = _validated_pdf_path(pdf_path)
    document = fitz.open(str(validated_path))
    try:
        digital_text = _extract_digital_text(document)
        if _has_meaningful_text(digital_text):
            return PDFExtractionResult(
                text=digital_text,
                confidence=estimate_text_confidence(digital_text, used_ocr=False),
                used_ocr=False,
            )

        ocr_text = _extract_ocr_text(document)
        return PDFExtractionResult(
            text=ocr_text,
            confidence=estimate_text_confidence(ocr_text, used_ocr=True),
            used_ocr=True,
        )
    finally:
        document.close()


def extract_text(pdf_path: str) -> tuple[str, float]:
    result = extract_pdf_text(pdf_path)
    return result.text, result.confidence
