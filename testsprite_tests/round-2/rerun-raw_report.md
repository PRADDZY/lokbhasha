# TestSprite AI Testing Report (MCP)

---

## 1. Document Metadata
- **Project Name:** LokBhasha
- **Round:** Round 2 rerun subset on the Cloudflare-first local stack
- **Date:** 2026-04-09
- **Prepared by:** TestSprite MCP with repo-side rerun and review
- **Execution Target:** `http://127.0.0.1:3000` with local Worker API on `http://127.0.0.1:8787`

---

## 2. Requirement Validation Summary

### Requirement A: Core document intake and analysis remain stable after Cloudflare-first polish

#### Test TC001 Block analysis when no input is provided
- **Test Code:** [TC001_Block_analysis_when_no_input_is_provided.py](./TC001_Block_analysis_when_no_input_is_provided.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/8a1fe441-85e5-4e8c-b23f-80ebd6753d6f/bfd033c0-f4be-4df3-9a53-d26d9bd65c62
- **Status:** Passed
- **Analysis / Findings:** Empty-submit protection is explicit and stable. The upload form surfaces a visible validation state instead of silently doing nothing.
---

#### Test TC005 Analyze an uploaded Marathi PDF to get side-by-side results
- **Test Code:** [TC005_Analyze_an_uploaded_Marathi_PDF_to_get_side_by_side_results.py](./TC005_Analyze_an_uploaded_Marathi_PDF_to_get_side_by_side_results.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/8a1fe441-85e5-4e8c-b23f-80ebd6753d6f/a3e1241e-4fdf-4c72-b156-edf404eaceba
- **Status:** Passed
- **Analysis / Findings:** The PDF path passed in the rerun subset, confirming that the Cloudflare-first browser preparation flow and upload-form polish resolved the Round 1 pain point.
---

### Requirement B: Optional outputs remain additive and independently requestable

#### Test TC008 Generate a plain explanation output and append it to the result
- **Test Code:** [TC008_Generate_a_plain_explanation_output_and_append_it_to_the_result.py](./TC008_Generate_a_plain_explanation_output_and_append_it_to_the_result.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/8a1fe441-85e5-4e8c-b23f-80ebd6753d6f/22b4d857-119b-4449-aa0e-1618b8c57e77
- **Status:** Passed
- **Analysis / Findings:** The plain-explanation action remained independently discoverable and appended cleanly without disturbing the canonical result view.
---

## 3. Coverage & Matching Metrics

- **100.00%** of selected rerun-subset tests passed

| Requirement | Total Tests | Passed | Failed |
| --- | ---: | ---: | ---: |
| Requirement A: Core document intake and analysis | 2 | 2 | 0 |
| Requirement B: Plain explanation follow-up output | 1 | 1 | 0 |

---

## 4. Key Gaps / Risks
- This rerun covered only the targeted subset that had recently changed; it was not a full replacement for the complete Round 2 suite.
- The rerun still exercised the UI end to end rather than a dedicated backend-only suite, so API-only regression coverage remains thinner than frontend coverage.
- The Cloudflare-first path is cleaner for automation, but larger scanned PDFs can still vary in browser-side preparation time depending on runtime conditions.

---
