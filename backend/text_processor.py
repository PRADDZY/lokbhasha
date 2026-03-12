"""Utilities for cleaning and scoring extracted Marathi text."""

from __future__ import annotations

import re
import unicodedata


DEVANAGARI_PATTERN = re.compile(r"[\u0900-\u097F]")
LETTER_PATTERN = re.compile(r"[A-Za-z\u0900-\u097F]")
WHITESPACE_PATTERN = re.compile(r"[ \t]+")
BLANK_LINE_PATTERN = re.compile(r"\n{3,}")


def normalize_unicode_text(text: str) -> str:
    return unicodedata.normalize("NFKC", text or "")


def clean_extracted_text(text: str) -> str:
    normalized = normalize_unicode_text(text).replace("\r\n", "\n").replace("\r", "\n")
    collapsed_lines = [WHITESPACE_PATTERN.sub(" ", line).strip() for line in normalized.split("\n")]
    cleaned = "\n".join(line for line in collapsed_lines if line)
    return BLANK_LINE_PATTERN.sub("\n\n", cleaned).strip()


def marathi_character_ratio(text: str) -> float:
    if not text:
        return 0.0

    letter_count = len(LETTER_PATTERN.findall(text))
    if letter_count == 0:
        return 0.0

    devanagari_count = len(DEVANAGARI_PATTERN.findall(text))
    return devanagari_count / letter_count


def estimate_text_confidence(text: str, used_ocr: bool) -> float:
    if not text:
        return 0.0

    ratio = marathi_character_ratio(text)
    length_bonus = min(len(text) / 2000, 0.35)
    method_bonus = 0.12 if not used_ocr else 0.0
    confidence = 0.45 + (ratio * 0.35) + length_bonus + method_bonus
    return round(min(confidence, 0.99), 2)