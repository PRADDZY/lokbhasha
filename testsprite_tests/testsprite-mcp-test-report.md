# TestSprite MCP Test Report

## 1. Document Metadata
- Project Name: LokBhasha
- Date: 2026-04-14
- Prepared by: TestSprite MCP run, summarized from `testsprite_tests/tmp/test_results.json`
- Scope: Frontend E2E against production static export on `http://localhost:3000` with live Cloudflare Worker API

## 2. Requirement Validation Summary
### Result details, glossary, and quality verification
| Test | Priority | Status | Finding |
| --- | --- | --- | --- |
| TC001-Run live sample analysis and view result with glossary and provenance | High | Passed | Flow completed in TestSprite. |
| TC003-Analyze pasted Marathi text and view canonical English with glossary hits | High | Passed | Flow completed in TestSprite. |
| TC008-Run baseline comparison from result details and display comparison report and diffs | Medium | Failed | Generated test asserted baseline report text after starting live sample, but did not navigate to details and trigger comparison. |
| TC011-Load result details and show glossary, setup, and quality sections without breaking result context | Medium | Passed | Flow completed in TestSprite. |
| TC013-Verify hidden demo glossary page loads and is consistent with glossary status surface | Medium | Passed | Flow completed in TestSprite. |
| TC017-Show validation when running baseline comparison without a baseline id | Low | Failed | Generated test expected a baseline-id validation path, but the implemented contract compares the current result against a no-glossary baseline and has no baseline-id field. |

### Document analysis and validation flows
| Test | Priority | Status | Finding |
| --- | --- | --- | --- |
| TC002-Analyze built-in sample PDF and view extracted Marathi with canonical English | High | Passed | Flow completed in TestSprite. |
| TC004-Refresh result page after live sample analysis and confirm content persists | High | Passed | Flow completed in TestSprite. |
| TC009-Recover from invalid upload by switching to sample PDF and successfully reaching results | Medium | Passed | Flow completed in TestSprite. |
| TC015-Upload a non-PDF and see inline validation without starting analysis | Low | Passed | Flow completed in TestSprite. |
| TC016-Submit analysis with no PDF and no pasted text and see missing-text validation | Low | Passed | Flow completed in TestSprite. |
| TC018-Attempt PDF analysis when no text is extracted and see no-text-extracted validation | Low | Failed | Generated test expected no-text-extracted validation while using the valid bundled sample PDF, so the app correctly proceeded with analysis. |

### Optional enrichment outputs
| Test | Priority | Status | Finding |
| --- | --- | --- | --- |
| TC005-Keep existing localized translations when generating explanation and actions | High | Passed | Flow completed in TestSprite. |
| TC006-Generate localized translations for selected locales without losing the canonical result | High | Passed | Flow completed in TestSprite. |
| TC007-Generate plain explanation and key actions and keep them visible together | High | Passed | Flow completed in TestSprite. |
| TC010-Append translations in multiple runs and keep earlier translations visible | Medium | Passed | Flow completed in TestSprite. |
| TC012-Localized outputs remain visible after revisiting the result view within the app session | Medium | Passed | Flow completed in TestSprite. |
| TC014-Changing locale selections does not clear existing translations before generating | Low | Passed | Flow completed in TestSprite. |
| TC019-Show validation when generating translations with no target locale selected | Low | Passed | Flow completed in TestSprite. |
| TC020-Show an error when generating explanation for a nonexistent result id | Low | Failed | Generated test expected arbitrary result-id enrichment controls in the frontend; the app only enriches the active session result and shows an empty state without one. |

## 3. Coverage & Matching Metrics
- Total tests: 20
- Passed: 16
- Failed: 4
- Pass rate: 80%

| Requirement | Total Tests | Passed | Failed |
| --- | ---: | ---: | ---: |
| Result details, glossary, and quality verification | 6 | 4 | 2 |
| Document analysis and validation flows | 6 | 5 | 1 |
| Optional enrichment outputs | 8 | 7 | 1 |

## 4. Key Gaps / Risks
- TestSprite completed a full frontend E2E run and produced 16/20 passing tests.
- The four failures are generated-test assumption mismatches, not confirmed app crashes: TC008 missed the details-page comparison flow; TC017 assumed a baseline-id field; TC018 used a valid sample PDF for a no-text negative case; TC020 assumed arbitrary result-id enrichment UI.
- Do not rerun these four unchanged; either revise the TestSprite-generated plan to match the product contract, or intentionally add new UI/API affordances if those behaviors are now desired.
- Backend endpoint tests should be run separately against the live Worker or a local Worker service, not against the static frontend on port 3000.

### Failed Test Evidence
| Test | TestSprite Visualization | Classification |
| --- | --- | --- |
| TC008-Run baseline comparison from result details and display comparison report and diffs | https://testsprite-videos.s3.us-east-1.amazonaws.com/74081428-4021-70d6-377d-c11b6f8648ff/1776111899780418//tmp/test_task/result.webm | Generated-flow issue |
| TC017-Show validation when running baseline comparison without a baseline id | https://testsprite-videos.s3.us-east-1.amazonaws.com/74081428-4021-70d6-377d-c11b6f8648ff/1776112029144987//tmp/test_task/result.webm | Product-contract mismatch |
| TC018-Attempt PDF analysis when no text is extracted and see no-text-extracted validation | https://testsprite-videos.s3.us-east-1.amazonaws.com/74081428-4021-70d6-377d-c11b6f8648ff/1776112009308552//tmp/test_task/result.webm | Invalid negative-case setup |
| TC020-Show an error when generating explanation for a nonexistent result id | https://testsprite-videos.s3.us-east-1.amazonaws.com/74081428-4021-70d6-377d-c11b6f8648ff/1776111911404127//tmp/test_task/result.webm | Out-of-scope frontend assumption |
