import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest


ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts.build_glossary_sqlite import build_glossary_sqlite


TERM_APPLICATION = "\u0905\u0930\u094d\u091c"
TERM_MEDICAL_HISTORY = "\u0935\u0948\u0926\u094d\u092f\u0915\u0940\u092f \u092a\u0942\u0930\u094d\u0935\u0935\u0943\u0924\u094d\u0924"
TERM_SENTENCE = (
    "\u0939\u0940 \u0916\u0942\u092a \u092e\u094b\u0920\u0940 "
    "\u091a\u093e\u091a\u0923\u0940 \u0938\u0902\u091c\u094d\u091e\u093e \u0906\u0939\u0947"
)

SAMPLE_DICTIONARY = {
    TERM_APPLICATION: {"mr": TERM_APPLICATION, "en": "Application; petition"},
    TERM_MEDICAL_HISTORY: {
        "mr": TERM_MEDICAL_HISTORY,
        "en": "Medical history; previous record",
    },
    TERM_SENTENCE: {
        "mr": TERM_SENTENCE,
        "en": "Sentence-like term",
    },
}


class GlossarySqliteBuilderTests(unittest.TestCase):
    def test_builder_creates_indexed_sqlite_glossary(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source_path = Path(temp_dir) / "dictionary.json"
            output_path = Path(temp_dir) / "glossary.sqlite3"
            source_path.write_text(
                json.dumps(SAMPLE_DICTIONARY, ensure_ascii=False),
                encoding="utf-8",
            )

            stats = build_glossary_sqlite(
                source_path=source_path,
                output_path=output_path,
                realtime_token_limit=3,
            )

            self.assertEqual(stats["total_terms"], 3)
            self.assertTrue(output_path.exists())

            connection = sqlite3.connect(output_path)
            try:
                terms = connection.execute(
                    """
                    SELECT marathi, english
                    FROM glossary
                    """
                ).fetchall()
                columns = connection.execute("PRAGMA table_info('glossary')").fetchall()
                indexes = {
                    row[1]
                    for row in connection.execute(
                        "PRAGMA index_list('glossary')"
                    ).fetchall()
                }
            finally:
                connection.close()

            self.assertCountEqual(
                terms,
                [
                    (TERM_APPLICATION, "application"),
                    (TERM_MEDICAL_HISTORY, "medical history"),
                    (TERM_SENTENCE, "sentence-like term"),
                ],
            )
            self.assertEqual(
                [(row[1], row[2], row[3], row[5]) for row in columns],
                [("marathi", "TEXT", 0, 1), ("english", "TEXT", 1, 0)],
            )
            self.assertIn("idx_marathi", indexes)

    def test_builder_cli_writes_sqlite_output(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source_path = Path(temp_dir) / "dictionary.json"
            output_path = Path(temp_dir) / "glossary.sqlite3"
            source_path.write_text(
                json.dumps(SAMPLE_DICTIONARY, ensure_ascii=False),
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    sys.executable,
                    str(ROOT_DIR / "scripts" / "build_glossary_sqlite.py"),
                    "--source",
                    str(source_path),
                    "--output",
                    str(output_path),
                    "--realtime-token-limit",
                    "3",
                ],
                cwd=ROOT_DIR,
                capture_output=True,
                text=True,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(output_path.exists())


if __name__ == "__main__":
    unittest.main()
