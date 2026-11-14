# izakanpai Client Diagnostics — Additional 20-Point Review

Date: 2026-11-14 (PHT).
Scope: Native mobile-app/web/api.js, hosted Web docs/yuwaku/api.js,
test mirror, announcement UI, Control D1 ingestion, and native
transport regression. No production deployment or real-device QA in this pass.

## Additional reviewed cases

Each REVIEW01–REVIEW20 is a separately executable assertion in
test/auto-ci/client-diagnostic-delivery.test.mjs. The complete 20-case
matrix is run against all three client script variants (60 test
executions, not 60 production-device cases).

| Case | Review assertion | Local result |
|---|---|---|
| REVIEW01 | Phone-like numeric error code is not recorded | PASS |
| REVIEW02 | Unknown alphabetic server error code becomes a safe generic category | PASS |
| REVIEW03 | Known JS error type remains distinguishable | PASS |
| REVIEW04 | Known server error type remains distinguishable | PASS |
| REVIEW05 | URL/query text in operation is rejected | PASS |
| REVIEW06 | Invalid trace ID is replaced, never persisted | PASS |
| REVIEW07 | Negative operation duration is normalized to zero | PASS |
| REVIEW08 | Oversize duration is capped at 600 seconds | PASS |
| REVIEW09 | Out-of-range attempt count is normalized | PASS |
| REVIEW10 | Unknown outcome is never accepted as completed | PASS |
| REVIEW11 | No store identity creates no cross-tenant event | PASS |
| REVIEW12 | Invalid persisted JSON cannot crash normal logging | PASS |
| REVIEW13 | One invalid history entry does not poison valid neighbors | PASS |
| REVIEW14 | Future-dated history cannot be manually uploaded | PASS |
| REVIEW15 | Routine INFO does not enter automatic upload queue | PASS |
| REVIEW16 | Default pending WARN and explicit local DEBUG are distinguished | PASS |
| REVIEW17 | Manual proof with no preceding errors still requires server ACK | PASS |
| REVIEW18 | Concurrent manual clicks coalesce into a single upload batch | PASS |
| REVIEW19 | Malformed positive HTTP response never becomes a false ACK | PASS |
| REVIEW20 | Bulk manual ACK persistence uses bounded localStorage writes | PASS |

## Corrected defects and tests

1. **Client/server age mismatch:** ERROR/FATAL could remain local for 14 days
   while the server discarded occurred-at attribution after seven. The Control
   D1 ingestion contract now accepts up to 14 days. Ten-day and 16-day events
   are tested in test/operational_diagnostics_test.mjs.
2. **Sensitive error-code exposure:** Alphanumeric freeform codes could carry
   identifier-like strings. The client now accepts only a fixed enum of
   categories plus HTTP error codes; unexpected values are generalized.
3. **High-cost batch ACK:** Each manually resent event previously rewrote
   the full retained diagnostic array. Successful IDs are now collected and
   persisted once per batch, preserving partial-success handling.
4. **Offline queue capacity mismatch:** History retained up to 200 priority
   records but automatic upload only 50. The upload queue now retains 200.
5. **Delayed ERROR after WARN backlog:** Automatic dispatch was FIFO. ERROR
   now takes priority over WARN, with a regression test for 200 warnings.
6. **Native test expectation drift:** The older native transport test counted
   a new local DEBUG write-start event as a second error. Expectations now
   assert one terminal ERROR plus one local DEBUG; no-write-retry and health
   assertions remain.

## Verification status

Final combined command:

    node --test test/auto-ci/client-diagnostic-delivery.test.mjs test/operational_diagnostics_test.mjs test/announcement_center_ui_test.mjs test/auto-ci/announcement-version-contract.test.mjs test/android_qa_native_timeout_fallback_test.mjs

Result: **174 passed / 0 failed / 0 skipped**. Includes local
contract tests, Chromium announcement UI, and native transport simulation;
**not** a physical Android/iOS or formal QA result.

## Remaining limits

- Real-device upload to Control D1 was not executed; physical event-ID
  readback is still required.
- Both ERROR and FATAL are stored with outcome=failed at the Control D1
  layer; separate server-side severity needs an explicit schema change.
- Local history is stored as a single localStorage array. Capacity is
  bounded, but simultaneous writes from independent Web tabs are not fully
  atomic. Native single-WebView use has less exposure.
- Operation names use character validation rather than a complete
  fixed-name allowlist. Raw URLs, exception stacks, arbitrary messages,
  tokens and request bodies are excluded; identifier-shaped caller-supplied
  operation strings are not categorically impossible.
- Device/app data deletion or local storage quota can discard history.

Commit, push and deployment: **not performed in this review**.
Other workers' uncommitted changes remain untouched.
