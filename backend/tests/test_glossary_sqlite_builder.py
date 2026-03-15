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


SAMPLE_DICTIONARY = {
    "अर्ज": {"mr": "अर्ज", "en": "Application; petition"},
    "वैद्यकीय पूर्ववृत्त": {
        "mr": "वैद्यकीय पूर्ववृत्त",
        "en": "Medical history; previous record",
    },
    "ही खूप मोठी चाचणी संज्ञा आहे": {
        "mr": "ही खूप मोठी चाचणी संज्ञा आहे",
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
                    SELECT normalized_term, english_term, token_count, is_realtime
                    FROM glossary_terms
                    ORDER BY normalized_term
                    """
                ).fetchall()
                indexes = {
                    row[1]
                    for row in connection.execute(
                        "PRAGMA index_list('glossary_terms')"
                    ).fetchall()
                }
                metadata = dict(
                    connection.execute(
                        "SELECT key, value FROM glossary_metadata"
                    ).fetchall()
                )
            finally:
                connection.close()

            self.assertEqual(
                terms,
                [
                    ("अर्ज", "application", 1, 1),
                    ("वैद्यकीय पूर्ववृत्त", "medical history", 2, 1),
                    ("ही खूप मोठी चाचणी संज्ञा आहे", "sentence-like term", 6, 0),
                ],
            )
            self.assertIn("idx_glossary_terms_normalized_term", indexes)
            self.assertIn("idx_glossary_terms_runtime_lookup", indexes)
            self.assertEqual(metadata["realtime_token_limit"], "3")

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
