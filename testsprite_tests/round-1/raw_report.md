# TestSprite AI Testing Report (MCP)

---

## 1. Document Metadata
- **Project Name:** LokBhasha
- **Round:** Round 1, current Vercel + Render architecture reproduced locally
- **Date:** 2026-04-09
- **Prepared by:** TestSprite MCP with repo-side review and classification
- **Execution Target:** `http://127.0.0.1:3000` with local analyze API on `http://127.0.0.1:5001`

---

## 2. Requirement Validation Summary

### Requirement A: Users can analyze Marathi content from the homepage and reach a trustworthy result view

#### Test TC001 Run live sample and view analyzed result panels
- **Test Code:** [TC001_Run_live_sample_and_view_analyzed_result_panels.py](./TC001_Run_live_sample_and_view_analyzed_result_panels.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/41a21deb-9cc0-4c92-bd78-c086b245f700/b5547efe-db03-4631-9b79-318978a8258d
- **Status:** Passed
- **Analysis / Findings:** The one-click sample flow completed successfully and reached `/result`, which confirms the judge-facing demo path worked end to end in the Round 1 baseline.
---

#### Test TC002 Paste Marathi text and view side-by-side analysis result
- **Test Code:** [TC002_Paste_Marathi_text_and_view_side_by_side_analysis_result.py](./TC002_Paste_Marathi_text_and_view_side_by_side_analysis_result.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/41a21deb-9cc0-4c92-bd78-c086b245f700/09867dcb-1cf6-4b8b-9408-de8eff6180ab
- **Status:** Passed
- **Analysis / Findings:** Pasted-text analysis was stable and preserved the core product promise: original Marathi beside canonical English.
---

#### Test TC003 Analyze uploaded Marathi PDF and verify extracted Marathi is non-empty
- **Test Code:** [TC003_Analyze_uploaded_Marathi_PDF_and_verify_extracted_Marathi_is_non_empty.py](./TC003_Analyze_uploaded_Marathi_PDF_and_verify_extracted_Marathi_is_non_empty.py)
- **Test Error:** The generated run never achieved a confirmed file selection in the UI. TestSprite attempted a host-local PDF upload three times, but the file input still showed no selected file, so analysis never started and `/result` was never reached.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/41a21deb-9cc0-4c92-bd78-c086b245f700/9c153fdb-9f9a-4f9d-a0cc-4fe3de29e25d
- **Status:** Failed
- **Analysis / Findings:** This was the highest-value Round 1 gap. The failure was driven by testability of the PDF path rather than a proven translation defect, but it still blocked one of the product's main entry flows.
---

#### Test TC004 Request plain-language explanation and key actions independently and append results
- **Test Code:** [TC004_Request_plain_language_explanation_and_key_actions_independently_and_append_results.py](./TC004_Request_plain_language_explanation_and_key_actions_independently_and_append_results.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/41a21deb-9cc0-4c92-bd78-c086b245f700/39596a6f-3337-4143-bd26-bd6e6c5e8a0f
- **Status:** Passed
- **Analysis / Findings:** Optional explanation and action extraction both appended correctly, which validated the on-demand design instead of noisy default generation.
---

#### Test TC005 Generate selected Indian-language outputs without rerunning full analysis
- **Test Code:** [TC005_Generate_selected_Indian_language_outputs_without_rerunning_full_analysis.py](./TC005_Generate_selected_Indian_language_outputs_without_rerunning_full_analysis.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/41a21deb-9cc0-4c92-bd78-c086b245f700/62bb0f09-72d6-406b-8793-5c3ff3d98b8e
- **Status:** Passed
- **Analysis / Findings:** Locale generation stayed additive and preserved the existing result context, which validated the enrichment workflow.
---

#### Test TC017 Show validation when submitting analysis with no input
- **Test Code:** [TC017_Show_validation_when_submitting_analysis_with_no_input.py](./TC017_Show_validation_when_submitting_analysis_with_no_input.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/41a21deb-9cc0-4c92-bd78-c086b245f700/e5708cbb-d61b-43ec-a714-16548457dcbd
- **Status:** Passed
- **Analysis / Findings:** Empty-submit validation worked in the baseline and protected the main form from malformed requests.
---

## 3. Coverage & Matching Metrics

- **83.33%** of selected Round 1 tests passed

| Requirement | Total Tests | Passed | Failed |
| --- | ---: | ---: | ---: |
| Requirement A: Core document intake and analysis | 4 | 3 | 1 |
| Requirement B: On-demand follow-up outputs | 2 | 2 | 0 |

---

## 4. Key Gaps / Risks
- The PDF upload flow was the only failing critical path in Round 1, and it failed before analysis because the generated test could not confirm a selected file in the UI.
- Round 1 was heavily weighted toward end-to-end frontend coverage; it exercised backend behavior through the UI, but it did not yet provide a separate backend-only TestSprite suite.
- Local OCR in the baseline depended on a separate extraction runtime and optional Tesseract availability for scanned PDFs, which made the environment more fragile.
- The clearest improvement target for Round 2 was a cleaner, more directly testable upload and extraction path plus a rerun against the Cloudflare-first stack.

---
