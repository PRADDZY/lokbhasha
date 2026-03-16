"""Plain-English simplification helpers."""

from __future__ import annotations


REPLACEMENTS = {
    "shall": "must",
    "eligible beneficiaries": "people who qualify",
    "submit applications": "submit an application",
    "in accordance with": "under",
    "prior to": "before",
    "hereby": "now",
}


def _apply_replacements(english_text: str) -> str:
    simplified_text = english_text.strip()

    for source, target in REPLACEMENTS.items():
        simplified_text = simplified_text.replace(source, target)
        simplified_text = simplified_text.replace(source.title(), target.capitalize())

    return simplified_text


def simplify_english_text(english_text: str) -> str:
    simplified = _apply_replacements(english_text)

    if simplified.startswith("[MOCK]"):
        simplified = simplified.replace("[MOCK]", "[PLAIN]", 1)

    return simplified
