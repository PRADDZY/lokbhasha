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


def _extract_translation_text(response_payload: dict) -> str | None:
    potential_keys = ("translation", "translated_text", "text", "output")
    for key in potential_keys:
        value = response_payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    data = response_payload.get("data")
    if isinstance(data, dict):
        for key in potential_keys:
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

    return None


def _lingo_translate(marathi_text: str, glossary_terms: dict[str, str], api_key: str) -> str:
    import httpx

    base_url = os.getenv("LINGO_DEV_BASE_URL", "https://api.lingo.dev/v1").rstrip("/")
    endpoint = f"{base_url}/translate"
    prompt = build_translation_prompt(marathi_text, glossary_terms)

    payload = {
        "source_language": "mr",
        "target_language": "en",
        "text": marathi_text.strip(),
        "prompt": prompt,
        "glossary": glossary_terms,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=20.0) as client:
        response = client.post(endpoint, json=payload, headers=headers)
        response.raise_for_status()
        parsed = response.json()

    translated = _extract_translation_text(parsed)
    if not translated:
        raise ValueError("Lingo.dev response did not contain translation text.")

    return translated


def translate_marathi_text(marathi_text: str, glossary_terms: dict[str, str]) -> str:
    api_key = os.getenv("LINGO_DEV_API_KEY", "").strip()
    use_mock = os.getenv("LINGO_DEV_USE_MOCK", "true").lower() != "false"

    if use_mock or not api_key or api_key == "your_api_key_here":
        return _mock_translate(marathi_text, glossary_terms)

    try:
        return _lingo_translate(marathi_text, glossary_terms, api_key)
    except Exception:
        return _mock_translate(marathi_text, glossary_terms)