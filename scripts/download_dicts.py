#!/usr/bin/env python3
"""
List the expected dictionary inputs for local SQLite glossary builds.
"""

from __future__ import annotations

import logging
from pathlib import Path
import sys


LOGGER = logging.getLogger(__name__)

REQUIRED_DICTIONARY_FILES = (
    "lingo_dev_mr_en.json",
    "lingo_dev_mr_en.min.json",
    "shabdakosh_conversational.jsonl",
    "shabdakosh_instruction.jsonl",
    "shabdakosh_llm_ready.jsonl",
    "shabdakosh_plain_text.txt",
)


def _dictionary_status_line(sqlite_dir: Path, filename: str) -> str:
    filepath = sqlite_dir / filename
    status = "Available" if filepath.exists() else "Missing"
    return f"  - {status}: {filename}"


def show_expected_dictionary_files() -> None:
    sqlite_dir = Path(__file__).resolve().parents[1] / "sqlite"
    sqlite_dir.mkdir(exist_ok=True)

    lines = [
        f"Dictionary files should be placed in: {sqlite_dir}",
        "",
        "You can:",
        "1. Copy the files from your source into sqlite/",
        "2. Copy the files from an existing installation",
        "3. Keep this list in sync with the glossary builder inputs",
        "",
        "Expected files:",
    ]

    for filename in REQUIRED_DICTIONARY_FILES:
        lines.append(_dictionary_status_line(sqlite_dir, filename))

    LOGGER.info("Checked SQLite glossary input directory %s", sqlite_dir)
    sys.stdout.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    show_expected_dictionary_files()
