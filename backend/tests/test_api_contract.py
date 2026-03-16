import sys
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient

from main import RATE_LIMIT_STATE, _extract_pdf_text_safe, _normalized_upload_filename, app


class APIContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        RATE_LIMIT_STATE.clear()

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

    def test_extract_endpoint_rejects_unexpected_content_type(self):
        response = self.client.post(
            "/extract",
            files={"file": ("fake.pdf", b"%PDF-sample", "text/plain")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("content type", response.json().get("detail", ""))

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

    def test_health_endpoint_returns_security_headers(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(response.headers.get("x-frame-options"), "DENY")
        self.assertEqual(response.headers.get("referrer-policy"), "no-referrer")
        self.assertEqual(
            response.headers.get("permissions-policy"),
            "geolocation=(), microphone=(), camera=()",
        )

    def test_health_endpoint_adds_hsts_for_forwarded_https(self):
        response = self.client.get("/health", headers={"x-forwarded-proto": "https"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("strict-transport-security"),
            "max-age=31536000; includeSubDomains",
        )

    def test_upload_filename_normalization_discards_path_segments(self):
        self.assertEqual(_normalized_upload_filename(r"..\nested\circular.pdf"), "circular.pdf")
        self.assertEqual(_normalized_upload_filename("/tmp/circular.pdf"), "circular.pdf")

    def test_extract_preflight_response_is_restricted(self):
        response = self.client.options(
            "/extract",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("access-control-allow-methods"),
            "GET, POST, OPTIONS",
        )
        allowed_headers = response.headers.get("access-control-allow-headers", "")
        self.assertNotEqual(allowed_headers, "*")
        self.assertIn("Content-Type", allowed_headers)

    def test_extract_endpoint_hides_internal_processing_errors(self):
        with patch("main._extract_pdf_text_safe", side_effect=Exception("boom")), patch(
            "main.LOGGER.exception"
        ):
            response = self.client.post(
                "/extract",
                files={"file": ("circular.pdf", b"%PDF-sample", "application/pdf")},
            )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["detail"], "Error processing PDF.")

    def test_extract_pdf_text_safe_rejects_paths_outside_uploads_dir(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir) / "outside.pdf"
            temp_path.write_bytes(b"%PDF-sample")
            with self.assertRaises(RuntimeError) as error:
                _extract_pdf_text_safe(temp_path)

        self.assertIn("managed upload directory", str(error.exception))

    def test_extract_endpoint_rate_limits_repeated_requests(self):
        class _Result:
            text = "sample"
            confidence = 0.9

        with patch.dict(
            "os.environ",
            {
                "BACKEND_RATE_LIMIT_REQUESTS": "1",
                "BACKEND_RATE_LIMIT_WINDOW_SECONDS": "60",
            },
        ), patch("main._extract_pdf_text_safe", return_value=_Result()):
            first = self.client.post(
                "/extract",
                files={"file": ("circular.pdf", b"%PDF-sample", "application/pdf")},
            )
            second = self.client.post(
                "/extract",
                files={"file": ("circular.pdf", b"%PDF-sample", "application/pdf")},
            )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 429)
        self.assertIn("Too many extraction requests", second.json()["detail"])


if __name__ == "__main__":
    unittest.main()
