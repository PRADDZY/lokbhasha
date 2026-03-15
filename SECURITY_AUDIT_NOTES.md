# Security Audit Notes

## Direct fixes in this branch

- Backend upload handling now validates filename shape, content type, PDF signature, file size, and uses only server-generated temporary filenames.
- Backend extraction responses include restrictive CORS settings, response models, security headers, and an environment-controlled request-rate limit for `/extract`.
- Both service containers now run as non-root users.
- GitHub workflow token permissions are scoped to the minimum required.
- `analyze` and `frontend` npm lockfiles were refreshed until `npm audit` reported zero vulnerabilities.
- Backend requirements were bumped to patched FastAPI and Pillow releases.
- The SQLite glossary builder no longer uses `executescript`; schema creation is static DDL executed statement-by-statement.

## Intentional architecture decisions

- `/extract` is not protected with app-level authentication. The extraction service is deployed as a private Render service and is only called by the public analyze service over Render's private network.
- `/extract` rate limiting is opt-in through `BACKEND_RATE_LIMIT_REQUESTS` because the current Render private-service topology would otherwise bucket all analyze-service traffic under the same internal source address.
- `0.0.0.0` binding remains in container entrypoints because Render containers must listen on all interfaces inside the container. Exposure is controlled by the hosting topology, not by loopback-only binds inside the image.

## Scanner findings treated as non-exploitable in this codebase

- `backend/text_processor.py` does not parse XML or evaluate XPath. The flagged lines are simple regular-expression helpers over plain text.
- The regex findings in `backend/text_processor.py`, `backend/actions.py`, and `scripts/build_glossary_sqlite.py` are based on fixed patterns. No user-supplied regex is compiled or executed.
- `scripts/download_dicts.py` is a manual helper script. It does not serve HTTP responses or handle live user traffic.

## Container caveat

- Exact `apt-get install package=version` pinning was not added for OCR packages. Debian security repositories rotate versions, and brittle exact pins would make reproducible rebuilds harder without adding snapshot repositories. The images are still hardened by using slim base images, pinned application dependencies, and non-root runtime users.
