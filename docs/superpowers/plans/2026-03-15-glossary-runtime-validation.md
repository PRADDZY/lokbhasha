# Glossary Runtime Validation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make missing or invalid glossary SQLite artifacts fail clearly at runtime and provide an explicit verification command for deployment readiness.

**Architecture:** Add a thin validation layer around the Node-side SQLite glossary access so the analyze path fails with descriptive errors when the DB file is missing or unusable. Add a small verification script that opens the configured glossary DB and checks the expected schema so deploys can prove readiness without relying on the analyze route itself.

**Tech Stack:** Next.js App Router, TypeScript, better-sqlite3, Node test runner, GitHub Actions

---

## Chunk 1: Runtime Validation

### Task 1: Add failing tests for missing and invalid glossary DB states

**Files:**
- Modify: `frontend/tests/glossary.test.ts`

- [ ] **Step 1: Write the failing tests**

Add coverage for:
- `detectGlossaryHits` throws a clear error when `databasePath` does not exist
- `detectGlossaryHits` throws a clear error when the database file exists but is missing the required glossary schema

- [ ] **Step 2: Run the focused glossary tests to verify RED**

Run: `npm test -- --test-name-pattern "glossary"`
Expected: FAIL because the current implementation lets `better-sqlite3` throw raw errors and does not validate schema explicitly.

- [ ] **Step 3: Implement the minimal validation layer**

Introduce explicit file and schema checks around the cached DB open path so callers get deterministic errors tied to `GLOSSARY_DB_PATH`.

- [ ] **Step 4: Run the focused glossary tests to verify GREEN**

Run: `npm test -- --test-name-pattern "glossary"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/server/glossary.ts frontend/tests/glossary.test.ts
git commit -m "validate glossary runtime"
```

## Chunk 2: Deployment Readiness Check

### Task 2: Add a glossary verification command for deployments

**Files:**
- Create: `frontend/scripts/verify-glossary.ts`
- Modify: `frontend/package.json`
- Modify: `README.md`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the failing verification tests or expectations**

Add a small test or smoke expectation around the verification helper if practical. If a dedicated unit test is overkill, use the script contract itself as the target:
- exits non-zero when the glossary DB is missing or invalid
- prints a concise success message when it is queryable

- [ ] **Step 2: Run the verification command to observe RED**

Run: `npm run verify:glossary`
Expected: FAIL in a clean checkout unless `GLOSSARY_DB_PATH` points at a valid SQLite glossary.

- [ ] **Step 3: Implement the minimal verification script**

Create a Node script that:
- resolves `GLOSSARY_DB_PATH`
- opens the DB read-only
- checks for `glossary_terms` and `glossary_metadata`
- checks `realtime_token_limit` metadata
- exits with a clear error on failure

- [ ] **Step 4: Wire docs and CI**

Update docs to recommend the new command for deploy readiness. Add a CI step that runs the verification only when a glossary artifact is already present in the workspace, otherwise it should log that verification is being skipped.

- [ ] **Step 5: Run full verification**

Run:
- `python -m unittest discover -s backend/tests`
- `npm test`
- `npm run build`

Expected: all commands pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/scripts/verify-glossary.ts frontend/package.json README.md .github/workflows/ci.yml
git commit -m "add glossary readiness check"
```
