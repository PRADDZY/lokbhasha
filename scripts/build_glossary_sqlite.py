from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
import json
import logging
from pathlib import Path
import sqlite3
import sys


ROOT_DIR = Path(__file__).resolve().parents[1]
LOGGER = logging.getLogger(__name__)


DEFAULT_SOURCE_PATH = ROOT_DIR / "dict" / "19k.json"
DEFAULT_OUTPUT_PATH = ROOT_DIR / "sqlite" / "glossary.sqlite3"


@dataclass(frozen=True)
class GlossaryBuildStats:
    total_terms: int
    output_path: str
    realtime_token_limit: int


def normalize_term(term: str) -> str:
    cleaned = " ".join(term.strip().split())
    return cleaned.replace("\u200c", "").replace("\u200d", "")


def extract_primary_meaning(english_text: str) -> str:
    if not english_text:
        return ""

    primary = english_text.split(";", maxsplit=1)[0].strip()
    return primary.lower()


def _initialize_schema(connection: sqlite3.Connection) -> None:
    connection.execute("DROP TABLE IF EXISTS glossary")
    connection.execute(
        """
        CREATE TABLE glossary (
            marathi TEXT PRIMARY KEY,
            english TEXT NOT NULL
        )
        """
    )
    connection.execute("CREATE INDEX idx_marathi ON glossary(marathi)")


def _dictionary_text(value: object) -> str:
    return value if isinstance(value, str) else ""


def _map_entry_values(entry_key: str, payload: object) -> tuple[str, str] | None:
    if not isinstance(payload, dict):
        return None

    marathi_source = entry_key
    if "mr" in payload:
        marathi_source = _dictionary_text(payload["mr"]) or entry_key

    english_source = ""
    if "en" in payload:
        english_source = _dictionary_text(payload["en"])

    normalized_term = normalize_term(marathi_source)
    english_term = extract_primary_meaning(english_source)
    if not normalized_term or not english_term:
        return None

    return normalized_term, english_term


def _list_entry_values(payload: object) -> tuple[str, str] | None:
    if not isinstance(payload, dict):
        return None

    english_source = _dictionary_text(payload.get("word"))
    marathi_source = _dictionary_text(payload.get("meaning"))

    normalized_term = normalize_term(marathi_source)
    english_term = extract_primary_meaning(english_source)
    if not normalized_term or not english_term:
        return None

    return normalized_term, english_term


def _iter_entry_values(raw_dictionary: object):
    if isinstance(raw_dictionary, dict):
        for entry_key, payload in raw_dictionary.items():
            entry_values = _map_entry_values(str(entry_key), payload)
            if entry_values is not None:
                yield entry_values
        return

    if isinstance(raw_dictionary, list):
        for payload in raw_dictionary:
            entry_values = _list_entry_values(payload)
            if entry_values is not None:
                yield entry_values
        return

    raise ValueError("Glossary source must be a JSON object or list.")


def build_glossary_sqlite(
    source_path: Path = DEFAULT_SOURCE_PATH,
    output_path: Path = DEFAULT_OUTPUT_PATH,
    realtime_token_limit: int = 5,
) -> dict[str, int | str]:
    source_path = Path(source_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with source_path.open("r", encoding="utf-8") as source_file:
        raw_dictionary = json.load(source_file)

    connection = sqlite3.connect(output_path)
    try:
        _initialize_schema(connection)

        inserted = 0
        for normalized_term, english_term in _iter_entry_values(raw_dictionary):
            connection.execute(
                """
                INSERT OR REPLACE INTO glossary (marathi, english)
                VALUES (?, ?)
                """,
                (
                    normalized_term,
                    english_term,
                ),
            )
            inserted += 1

        connection.commit()
    finally:
        connection.close()

    stats = GlossaryBuildStats(
        total_terms=inserted,
        output_path=str(output_path),
        realtime_token_limit=realtime_token_limit,
    )
    return asdict(stats)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description="Build the LokBhasha SQLite glossary.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--realtime-token-limit", type=int, default=5)
    args = parser.parse_args()

    stats = build_glossary_sqlite(
        source_path=args.source,
        output_path=args.output,
        realtime_token_limit=args.realtime_token_limit,
    )
    output_location = stats["output_path"]
    total_terms = stats["total_terms"]
    LOGGER.info("Built glossary SQLite at %s with %s terms.", output_location, total_terms)
    json.dump(stats, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
