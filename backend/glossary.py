"""Glossary term detection for Marathi government text."""

from __future__ import annotations

from difflib import SequenceMatcher
import re

try:
    from rapidfuzz import fuzz
except ImportError:  # pragma: no cover - fallback for environments without rapidfuzz
    fuzz = None

from dictionary import DictionaryIndex, load_dictionary, normalize_term


TOKEN_PATTERN = re.compile(r"[\u0900-\u097F]+")
FUZZY_MATCH_THRESHOLD = 92


def _similarity(left: str, right: str) -> float:
    if fuzz is not None:
        return float(fuzz.ratio(left, right))

    return SequenceMatcher(None, left, right).ratio() * 100


def _tokenize(text: str) -> list[str]:
    return TOKEN_PATTERN.findall(text)


def _find_exact_matches(tokens: list[str], dictionary_index: DictionaryIndex) -> dict[str, str]:
    matches: dict[str, str] = {}

    for token_length in range(dictionary_index.max_token_length, 0, -1):
        if token_length > len(tokens):
            continue

        for start in range(0, len(tokens) - token_length + 1):
            candidate = normalize_term(" ".join(tokens[start : start + token_length]))
            meaning = dictionary_index.primary_meanings.get(candidate)
            if meaning:
                matches[candidate] = meaning

    return matches


def _find_fuzzy_matches(
    tokens: list[str],
    dictionary_index: DictionaryIndex,
    existing_matches: dict[str, str],
) -> dict[str, str]:
    fuzzy_matches: dict[str, str] = {}

    for token in tokens:
        normalized_token = normalize_term(token)
        if not normalized_token or normalized_token in existing_matches:
            continue

        bucket_key = (1, normalized_token[:1])
        candidates = dictionary_index.terms_by_bucket.get(bucket_key, set())
        best_candidate = None
        best_score = 0

        for candidate in candidates:
            if abs(len(candidate) - len(normalized_token)) > 2:
                continue

            score = _similarity(normalized_token, candidate)
            if score > best_score:
                best_candidate = candidate
                best_score = score

        if best_candidate and best_score >= FUZZY_MATCH_THRESHOLD:
            fuzzy_matches[best_candidate] = dictionary_index.primary_meanings[best_candidate]

    return fuzzy_matches


def detect_glossary_terms(text: str, dictionary_path: str | None = None) -> dict[str, str]:
    normalized_text = normalize_term(text)
    if not normalized_text:
        return {}

    dictionary_index = load_dictionary(dictionary_path)
    tokens = _tokenize(normalized_text)
    if not tokens:
        return {}

    exact_matches = _find_exact_matches(tokens, dictionary_index)
    fuzzy_matches = _find_fuzzy_matches(tokens, dictionary_index, exact_matches)

    combined_matches = {**exact_matches, **fuzzy_matches}
    return dict(sorted(combined_matches.items(), key=lambda item: (len(item[0].split()), item[0]), reverse=True))