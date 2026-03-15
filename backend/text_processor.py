"""Utilities for cleaning and scoring extracted Marathi text."""

from __future__ import annotations

import unicodedata


def normalize_unicode_text(text: str) -> str:
    return unicodedata.normalize("NFKC", text or "")


def clean_extracted_text(text: str) -> str:
    normalized = normalize_unicode_text(text).replace("\r\n", "\n").replace("\r", "\n")
    collapsed_lines = [" ".join(line.split()).strip() for line in normalized.split("\n")]
    cleaned = "\n".join(line for line in collapsed_lines if line)
    return cleaned.strip()


def _is_devanagari_letter(character: str) -> bool:
    return character.isalpha() and "\u0900" <= character <= "\u097F"


def marathi_character_ratio(text: str) -> float:
    if not text:
        return 0.0

    letter_count = sum(1 for character in text if character.isalpha())
    if letter_count == 0:
        return 0.0

    devanagari_count = sum(1 for character in text if _is_devanagari_letter(character))
    return devanagari_count / letter_count


def estimate_text_confidence(text: str, used_ocr: bool) -> float:
    if not text:
        return 0.0

    ratio = marathi_character_ratio(text)
    length_bonus = min(len(text) / 2000, 0.35)
    method_bonus = 0.12 if not used_ocr else 0.0
    confidence = 0.45 + (ratio * 0.35) + length_bonus + method_bonus
    return round(min(confidence, 0.99), 2)
