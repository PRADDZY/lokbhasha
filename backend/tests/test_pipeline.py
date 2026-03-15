from pathlib import Path
import sys
import unittest


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from actions import extract_actions
from simplifier import simplify_english_text
from text_processor import clean_extracted_text, marathi_character_ratio


class PipelineTests(unittest.TestCase):
    def test_legacy_backend_translation_modules_are_removed(self):
        self.assertFalse((BACKEND_DIR / "dictionary.py").exists())
        self.assertFalse((BACKEND_DIR / "glossary.py").exists())
        self.assertFalse((BACKEND_DIR / "translator.py").exists())

    def test_text_cleanup_and_marathi_ratio(self):
        cleaned = clean_extracted_text(" ओळ 1\r\n\r\n  ओळ 2 ")
        self.assertEqual(cleaned, "ओळ 1\nओळ 2")
        self.assertGreater(marathi_character_ratio("अर्ज application"), 0)

    def test_plain_english_helpers_still_extract_actions(self):
        simplified = simplify_english_text("Submit application before March 31.")
        actions = extract_actions(simplified)

        self.assertEqual(simplified, "Submit application before March 31.")
        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0]["action"], "Submit application before March 31")
        self.assertEqual(actions[0]["deadline"], "before March 31")


if __name__ == "__main__":
    unittest.main()
