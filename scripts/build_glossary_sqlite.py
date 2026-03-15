from __future__ import annotations

import argparse
import json
from pathlib import Path
import sqlite3
import sys


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.dictionary import extract_primary_meaning, normalize_term


DEFAULT_SOURCE_PATH = ROOT_DIR / "dict" / "lingo_dev_mr_en.json"
DEFAULT_OUTPUT_PATH = ROOT_DIR / "dict" / "glossary.sqlite3"


def _initialize_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        DROP TABLE IF EXISTS glossary_terms;
        DROP TABLE IF EXISTS glossary_metadata;

        CREATE TABLE glossary_terms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            marathi_term TEXT NOT NULL,
            normalized_term TEXT NOT NULL UNIQUE,
            english_term TEXT NOT NULL,
            token_count INTEGER NOT NULL,
            first_token TEXT NOT NULL,
            prefix_key TEXT NOT NULL,
            is_realtime INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE glossary_metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE INDEX idx_glossary_terms_normalized_term
            ON glossary_terms(normalized_term);

        CREATE INDEX idx_glossary_terms_runtime_lookup
            ON glossary_terms(is_realtime, token_count, first_token, prefix_key);
        """
    )


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
            normalized_term = normalize_term(payload.get("mr") or marathi_term)
            english_term = extract_primary_meaning(payload.get("en", ""))
            if not normalized_term or not english_term:
                continue

            tokens = normalized_term.split()
            token_count = len(tokens)
            first_token = tokens[0]
            prefix_key = normalized_term[:4]
            is_realtime = 1 if token_count <= realtime_token_limit else 0

            connection.execute(
                """
                INSERT OR REPLACE INTO glossary_terms (
                    marathi_term,
                    normalized_term,
                    english_term,
                    token_count,
                    first_token,
                    prefix_key,
                    is_realtime
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.get("mr") or marathi_term,
                    normalized_term,
                    english_term,
                    token_count,
                    first_token,
                    prefix_key,
                    is_realtime,
                ),
            )
            inserted += 1

        connection.executemany(
            "INSERT OR REPLACE INTO glossary_metadata (key, value) VALUES (?, ?)",
            [
                ("source_path", str(source_path)),
                ("realtime_token_limit", str(realtime_token_limit)),
            ],
        )
        connection.commit()
    finally:
        connection.close()

    return {
        "total_terms": inserted,
        "output_path": str(output_path),
        "realtime_token_limit": realtime_token_limit,
    }


def main() -> None:
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
    print(json.dumps(stats, ensure_ascii=False))


if __name__ == "__main__":
    main()
