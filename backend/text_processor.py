"""Utilities for cleaning and scoring extracted Marathi text."""

from __future__ import annotations

import unicodedata


def normalize_unicode_text(text: str) -> str:
    normalized_text = unicodedata.normalize("NFKC", text or "")
    return normalized_text


def _collapse_internal_spacing(line: str) -> str:
    collapsed_characters: list[str] = []
    pending_space = False

    for character in line.strip():
        if character.isspace():
            pending_space = bool(collapsed_characters)
            continue

        if pending_space:
            collapsed_characters.append(" ")
            pending_space = False

        collapsed_characters.append(character)

    return "".join(collapsed_characters)


def clean_extracted_text(text: str) -> str:
    normalized_text = normalize_unicode_text(text).replace("\r\n", "\n").replace("\r", "\n")
    collapsed_lines: list[str] = []

    for line in normalized_text.splitlines():
        collapsed_line = _collapse_internal_spacing(line)
        if collapsed_line:
            collapsed_lines.append(collapsed_line)

    cleaned_text = "\n".join(collapsed_lines).strip()
    return cleaned_text


def _is_devanagari_letter(character: str) -> bool:
    return character.isalpha() and "\u0900" <= character <= "\u097F"


def marathi_character_ratio(text: str) -> float:
    ratio = 0.0
    if not text:
        return ratio

    letter_count = sum(1 for character in text if character.isalpha())
    if letter_count == 0:
        return ratio

    devanagari_count = sum(1 for character in text if _is_devanagari_letter(character))
    ratio = devanagari_count / letter_count
    return ratio


def estimate_text_confidence(text: str, used_ocr: bool) -> float:
    confidence = 0.0
    if not text:
        return confidence

    ratio = marathi_character_ratio(text)
    length_bonus = min(len(text) / 2000, 0.35)
    method_bonus = 0.12 if not used_ocr else 0.0
    confidence = 0.45 + (ratio * 0.35) + length_bonus + method_bonus
    confidence = round(min(confidence, 0.99), 2)
    return confidence
