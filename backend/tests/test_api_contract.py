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
        response = self.client.post("/translate", json={"marathi_text": "à¤¸à¤¦à¤° à¤…à¤§à¤¿à¤¸à¥‚à¤šà¤¨à¥‡à¤¨à¥à¤µà¤¯à¥‡ à¤…à¤°à¥à¤œ à¤¸à¤¾à¤¦à¤° à¤•à¤°à¤¾à¤µà¤¾"})
        self.assertEqual(response.status_code, 404)

    def test_extract_endpoint_rejects_non_pdf(self):
        response = self.client.post(
            "/extract",
            files={"file": ("notes.txt", b"not-a-pdf", "text/plain")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Only PDF uploads are supported", response.json().get("detail", ""))

    def test_extract_endpoint_rejects_invalid_pdf_content(self):
        response = self.client.post(
            "/extract",
            files={"file": ("fake.pdf", b"not-a-pdf", "application/pdf")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("valid PDF", response.json().get("detail", ""))

    def test_extract_endpoint_rejects_oversized_pdf(self):
        with patch.dict("os.environ", {"BACKEND_MAX_UPLOAD_BYTES": "4"}):
            response = self.client.post(
                "/extract",
                files={"file": ("circular.pdf", b"%PDF-sample", "application/pdf")},
            )

        self.assertEqual(response.status_code, 413)
        self.assertIn("maximum allowed size", response.json().get("detail", ""))

    def test_extract_endpoint_returns_contract_shape(self):
        class _Result:
            text = "à¤¸à¤¦à¤° à¤…à¤§à¤¿à¤¸à¥‚à¤šà¤¨à¥‡à¤¨à¥à¤µà¤¯à¥‡ à¤…à¤°à¥à¤œ à¤¸à¤¾à¤¦à¤° à¤•à¤°à¤¾à¤µà¤¾"
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
