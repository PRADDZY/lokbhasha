from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
import re
import sqlite3
import sys


ROOT_DIR = Path(__file__).resolve().parents[1]
WHITESPACE_PATTERN = re.compile(r"\s+")
LOGGER = logging.getLogger(__name__)


DEFAULT_SOURCE_PATH = ROOT_DIR / "sqlite" / "lingo_dev_mr_en.json"
DEFAULT_OUTPUT_PATH = ROOT_DIR / "sqlite" / "glossary.sqlite3"


def normalize_term(term: str) -> str:
    cleaned = WHITESPACE_PATTERN.sub(" ", term.strip())
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


def build_glossary_sqlite(
    source_path: Path = DEFAULT_SOURCE_PATH,
    output_path: Path = DEFAULT_OUTPUT_PATH,
    realtime_token_limit: int = 5,
) -> dict[str, int | str]:
    source_path = Path(source_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with source_path.open("r", encoding="utf-8") as source_file:
        raw_dictionary: dict[str, dict[str, str]] = json.load(source_file)

    connection = sqlite3.connect(output_path)
    try:
        _initialize_schema(connection)

        inserted = 0
        for marathi_term, payload in raw_dictionary.items():
            if not isinstance(payload, dict):
                continue

            marathi_value = payload.get("mr")
            english_value = payload.get("en", "")
            normalized_term = normalize_term(marathi_value if isinstance(marathi_value, str) else marathi_term)
            english_term = extract_primary_meaning(english_value if isinstance(english_value, str) else "")
            if not normalized_term or not english_term:
                continue

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

    return {
        "total_terms": inserted,
        "output_path": str(output_path),
        "realtime_token_limit": realtime_token_limit,
    }


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
    LOGGER.info("Built glossary SQLite at %s with %s terms.", stats["output_path"], stats["total_terms"])
    json.dump(stats, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
