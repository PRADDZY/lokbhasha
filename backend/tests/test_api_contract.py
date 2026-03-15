import sys
from pathlib import Path
import unittest
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient

from main import app


class APIContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_upload_endpoint_is_not_available(self):
        response = self.client.post(
            "/upload",
            files={"file": ("notes.txt", b"not-a-pdf", "text/plain")},
        )
        self.assertEqual(response.status_code, 404)

    def test_translate_endpoint_is_not_available(self):
        response = self.client.post("/translate", json={"marathi_text": "सदर अधिसूचनेन्वये अर्ज सादर करावा"})
        self.assertEqual(response.status_code, 404)

    def test_extract_endpoint_rejects_non_pdf(self):
        response = self.client.post(
            "/extract",
            files={"file": ("notes.txt", b"not-a-pdf", "text/plain")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Only PDF uploads are supported", response.json().get("detail", ""))

    def test_extract_endpoint_returns_contract_shape(self):
        class _Result:
            text = "सदर अधिसूचनेन्वये अर्ज सादर करावा"
            confidence = 0.91

        with patch("main._extract_pdf_text_safe", return_value=_Result()):
            response = self.client.post(
                "/extract",
                files={"file": ("circular.pdf", b"%PDF-sample", "application/pdf")},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["text"], _Result.text)
        self.assertEqual(payload["confidence"], _Result.confidence)


if __name__ == "__main__":
    unittest.main()
