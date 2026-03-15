#!/usr/bin/env python3
"""
Report the expected dictionary inputs for local SQLite glossary builds.
"""

from __future__ import annotations

import logging
from pathlib import Path
import sys


LOGGER = logging.getLogger(__name__)

DICT_FILES = {
    "lingo_dev_mr_en.json": "https://example.com/dicts/lingo_dev_mr_en.json",
    "lingo_dev_mr_en.min.json": "https://example.com/dicts/lingo_dev_mr_en.min.json",
    "shabdakosh_conversational.jsonl": "https://example.com/dicts/shabdakosh_conversational.jsonl",
    "shabdakosh_instruction.jsonl": "https://example.com/dicts/shabdakosh_instruction.jsonl",
    "shabdakosh_llm_ready.jsonl": "https://example.com/dicts/shabdakosh_llm_ready.jsonl",
    "shabdakosh_plain_text.txt": "https://example.com/dicts/shabdakosh_plain_text.txt",
}


def download_dicts() -> None:
    sqlite_dir = Path(__file__).resolve().parents[1] / "sqlite"
    sqlite_dir.mkdir(exist_ok=True)

    lines = [
        f"Dictionary files should be placed in: {sqlite_dir}",
        "",
        "You can:",
        "1. Download from your source and place the files in sqlite/",
        "2. Copy the files from an existing installation",
        "3. Update DICT_FILES URLs in this script for automated download",
        "",
        "Expected files:",
    ]

    for filename in DICT_FILES:
        filepath = sqlite_dir / filename
        status = "Found" if filepath.exists() else "Missing"
        lines.append(f"  - {status}: {filename}")

    LOGGER.info("Reviewed expected SQLite glossary inputs in %s", sqlite_dir)
    sys.stdout.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    download_dicts()
