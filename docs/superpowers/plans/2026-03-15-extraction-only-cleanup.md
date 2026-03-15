# Extraction-Only Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the legacy FastAPI upload and translation flow so the backend is extraction-only and Lingo.dev remains the only translation/localization engine in the app.

**Architecture:** Keep the Python backend focused on PDF extraction via `/extract` and shared extraction helpers. Delete the legacy `/upload` and `/translate` endpoints plus the backend translation module, and update tests/docs so the public flow is only backend `/extract` plus frontend `/api/analyze`.

**Tech Stack:** FastAPI, Python unittest, Next.js App Router, SQLite glossary lookups in Node, Lingo.dev SDK

---

## Chunk 1: Extraction-Only Backend Contract

### Task 1: Rewrite Backend Contract Tests Around `/extract`

**Files:**
- Modify: `backend/tests/test_api_contract.py`

- [ ] **Step 1: Write the failing tests**

Replace the `/upload` and `/translate` assertions with extraction-only expectations:
- `/extract` rejects blank filenames or non-PDF uploads
- `/extract` returns `text` and `confidence` when extraction succeeds
- `/translate` is gone
- `/upload` is gone

- [ ] **Step 2: Run the backend contract tests to verify RED**

Run: `python -m unittest backend.tests.test_api_contract -v`
Expected: FAIL because `/upload` and `/translate` still exist and the extraction-only assertions do not match current behavior.

- [ ] **Step 3: Implement the minimal backend changes**

Update the FastAPI surface so only extraction endpoints remain and make the tests pass without patching glossary or translation helpers.

- [ ] **Step 4: Run the backend contract tests to verify GREEN**

Run: `python -m unittest backend.tests.test_api_contract -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/main.py backend/tests/test_api_contract.py backend/translator.py
git commit -m "remove legacy backend flow"
```

## Chunk 2: Remove Backend Translation Ownership

### Task 2: Delete Obsolete Backend Translation Paths

**Files:**
- Modify: `backend/main.py`
- Delete: `backend/translator.py`
- Modify: `backend/tests/test_pipeline.py`

- [ ] **Step 1: Write the failing pipeline test updates**

Remove the mock translation-path assertions and replace them with checks that the remaining backend helpers still cover extraction-adjacent behavior only.

- [ ] **Step 2: Run the focused backend pipeline tests to verify RED**

Run: `python -m unittest backend.tests.test_pipeline -v`
Expected: FAIL because the test file still imports and exercises `translate_marathi_text`.

- [ ] **Step 3: Write the minimal implementation**

Delete the unused translator module, trim imports in `backend/main.py`, and simplify `test_pipeline.py` so it no longer assumes app-owned translation behavior.

- [ ] **Step 4: Run the focused backend pipeline tests to verify GREEN**

Run: `python -m unittest backend.tests.test_pipeline -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/main.py backend/tests/test_pipeline.py
git rm backend/translator.py
git commit -m "trim backend to extract"
```

## Chunk 3: Verify User-Facing References

### Task 3: Align Docs And References With Extraction-Only Backend

**Files:**
- Modify: `README.md`
- Modify: any backend-facing docs or smoke references that still mention `/upload` or `/translate`

- [ ] **Step 1: Search for stale references**

Run: `rg -n "/upload|/translate|translator.py|LINGO_DEV_USE_MOCK" README.md backend .github`
Expected: identify any stale references that survived earlier cleanup.

- [ ] **Step 2: Update only the remaining stale references**

Keep docs accurate: backend is extraction-only, frontend `/api/analyze` is the translation/localization path, and Lingo.dev is the only translation engine.

- [ ] **Step 3: Run full verification**

Run:
- `python -m unittest discover -s backend/tests`
- `npm test`
- `npm run build`

Expected: all commands pass.

- [ ] **Step 4: Commit**

```bash
git add README.md backend/tests .github/workflows/ci.yml
git commit -m "verify extract only backend"
```
