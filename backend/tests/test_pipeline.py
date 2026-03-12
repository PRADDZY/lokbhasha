import json
from pathlib import Path
import sys
import tempfile
import unittest


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from actions import extract_actions
from dictionary import get_primary_meaning, load_dictionary
from glossary import detect_glossary_terms
from simplifier import simplify_english_text
from text_processor import clean_extracted_text, marathi_character_ratio
from translator import translate_marathi_text


SAMPLE_DICTIONARY = {
    "अधिकृतपणे": {
        "mr": "अधिकृतपणे",
        "en": "Officially; officially",
    },
    "वैद्यकीय पूर्ववृत्त": {
        "mr": "वैद्यकीय पूर्ववृत्त",
        "en": "Medical history; previous record",
    },
    "अर्ज": {
        "mr": "अर्ज",
        "en": "Application; petition",
    },
}


class PipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.dictionary_path = Path(cls.temp_dir.name) / "sample_dict.json"
        cls.dictionary_path.write_text(
            json.dumps(SAMPLE_DICTIONARY, ensure_ascii=False),
            encoding="utf-8",
        )
        load_dictionary.cache_clear()

    @classmethod
    def tearDownClass(cls):
        load_dictionary.cache_clear()
        cls.temp_dir.cleanup()

    def test_primary_meaning_uses_first_english_entry(self):
        meaning = get_primary_meaning("अर्ज", str(self.dictionary_path))
        self.assertEqual(meaning, "application")

    def test_glossary_detects_exact_terms(self):
        terms = detect_glossary_terms(
            "अधिकृतपणे वैद्यकीय पूर्ववृत्त अर्ज सादर करा",
            str(self.dictionary_path),
        )

        self.assertEqual(terms["अधिकृतपणे"], "officially")
        self.assertEqual(terms["वैद्यकीय पूर्ववृत्त"], "medical history")
        self.assertEqual(terms["अर्ज"], "application")

    def test_text_cleanup_and_marathi_ratio(self):
        cleaned = clean_extracted_text(" ओळ 1\r\n\r\n  ओळ 2 ")
        self.assertEqual(cleaned, "ओळ 1\nओळ 2")
        self.assertGreater(marathi_character_ratio("अर्ज application"), 0)

    def test_mock_translation_pipeline_outputs_actions(self):
        translated = translate_marathi_text("अर्ज सादर करा", {"अर्ज": "application"})
        simplified = simplify_english_text(translated + ". Submit application before March 31.")
        actions = extract_actions(simplified)

        self.assertTrue(translated.startswith("[MOCK]"))
        self.assertTrue(simplified.startswith("[PLAIN]"))
        self.assertEqual(len(actions), 1)
        self.assertIn("before March 31", actions[0]["deadline"])


if __name__ == "__main__":
    unittest.main()