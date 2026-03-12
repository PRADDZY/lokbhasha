"""Translation helpers for Marathi government text."""

from __future__ import annotations

import os


MOCK_TRANSLATION_PREFIX = "[MOCK]"


def build_glossary_hints(glossary_terms: dict[str, str]) -> str:
    if not glossary_terms:
        return ""

    pairs = [f"{marathi} = {english}" for marathi, english in glossary_terms.items()]
    return "\n".join(pairs)


def build_translation_prompt(marathi_text: str, glossary_terms: dict[str, str]) -> str:
    glossary_hints = build_glossary_hints(glossary_terms)
    if not glossary_hints:
        return marathi_text.strip()

    return (
        "Translate this Marathi government document into clear English.\n"
        "Use these glossary mappings when relevant:\n"
        f"{glossary_hints}\n\n"
        "Marathi text:\n"
        f"{marathi_text.strip()}"
    )


def _mock_translate(marathi_text: str, glossary_terms: dict[str, str]) -> str:
    glossary_hints = build_glossary_hints(glossary_terms)
    if glossary_hints:
        return (
            f"{MOCK_TRANSLATION_PREFIX} English translation placeholder for: {marathi_text.strip()}\n\n"
            "Detected glossary terms:\n"
            f"{glossary_hints}"
        )

    return f"{MOCK_TRANSLATION_PREFIX} English translation placeholder for: {marathi_text.strip()}"


def translate_marathi_text(marathi_text: str, glossary_terms: dict[str, str]) -> str:
    api_key = os.getenv("LINGO_DEV_API_KEY", "").strip()
    use_mock = os.getenv("LINGO_DEV_USE_MOCK", "true").lower() != "false"

    if use_mock or not api_key or api_key == "your_api_key_here":
        return _mock_translate(marathi_text, glossary_terms)

    return _mock_translate(marathi_text, glossary_terms)