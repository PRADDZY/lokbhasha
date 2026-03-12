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


def simplify_english_text(english_text: str) -> str:
    simplified = english_text.strip()
    for source, target in REPLACEMENTS.items():
        simplified = simplified.replace(source, target)
        simplified = simplified.replace(source.title(), target.capitalize())

    if simplified.startswith("[MOCK]"):
        simplified = simplified.replace("[MOCK]", "[PLAIN]", 1)

    return simplified