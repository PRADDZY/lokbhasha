"""Dictionary loading utilities for Marathi glossary lookups."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import json
from pathlib import Path
import re


DEFAULT_DICTIONARY_PATH = (
    Path(__file__).resolve().parents[1] / "dict" / "lingo_dev_mr_en.json"
)
WHITESPACE_PATTERN = re.compile(r"\s+")


@dataclass(frozen=True)
class DictionaryIndex:
    primary_meanings: dict[str, str]
    terms_by_token_length: dict[int, set[str]]
    terms_by_bucket: dict[tuple[int, str], set[str]]
    max_token_length: int


def normalize_term(term: str) -> str:
    cleaned = WHITESPACE_PATTERN.sub(" ", term.strip())
    return cleaned.replace("\u200c", "").replace("\u200d", "")


def extract_primary_meaning(english_text: str) -> str:
    if not english_text:
        return ""

    primary = english_text.split(";", maxsplit=1)[0].strip()
    return primary.lower()


@lru_cache(maxsize=1)
def load_dictionary(dictionary_path: str | None = None) -> DictionaryIndex:
    path = Path(dictionary_path) if dictionary_path else DEFAULT_DICTIONARY_PATH
    if not path.exists():
        raise FileNotFoundError(
            f"Dictionary file not found at {path}. Place lingo_dev_mr_en.json in dict/."
        )

    with path.open("r", encoding="utf-8") as dictionary_file:
        raw_dictionary: dict[str, dict[str, str]] = json.load(dictionary_file)

    primary_meanings: dict[str, str] = {}
    terms_by_token_length: dict[int, set[str]] = {}
    terms_by_bucket: dict[tuple[int, str], set[str]] = {}
    max_token_length = 1

    for marathi_term, payload in raw_dictionary.items():
        normalized_term = normalize_term(payload.get("mr") or marathi_term)
        primary_meaning = extract_primary_meaning(payload.get("en", ""))
        if not normalized_term or not primary_meaning:
            continue

        token_length = len(normalized_term.split())
        bucket_key = (token_length, normalized_term[:1])

        primary_meanings[normalized_term] = primary_meaning
        terms_by_token_length.setdefault(token_length, set()).add(normalized_term)
        terms_by_bucket.setdefault(bucket_key, set()).add(normalized_term)
        max_token_length = max(max_token_length, token_length)

    return DictionaryIndex(
        primary_meanings=primary_meanings,
        terms_by_token_length=terms_by_token_length,
        terms_by_bucket=terms_by_bucket,
        max_token_length=max_token_length,
    )


def get_primary_meaning(marathi_term: str, dictionary_path: str | None = None) -> str | None:
    normalized_term = normalize_term(marathi_term)
    if not normalized_term:
        return None

    dictionary_index = load_dictionary(dictionary_path)
    return dictionary_index.primary_meanings.get(normalized_term)