# COS source-lane browser delivery: 2026-10-24 read-only failure evidence

## Outcome at 19:45 PHT (11:45 UTC)

- **RECOVERY NOT VERIFIED.** The seven originally identified COS inputs remain `state=queued`, `delivery=pending`, `deliveredAt=null`. A newly queued eighth input appeared during this investigation; it is also undelivered. No duplicate POST was issued by this investigation.
- Snapshot: `test-results/qa-cos-pending-input-evidence-20261024.json` (SHA256 `20DF9194CEF46ED443257DEBA1C32A7A15A8A626EAB32BF45CA6734922AC82AA`). Source-attributed edits from these queued inputs: **0 verified**; official Runner verdicts written: **0**.
- The queried input session event windows show **zero** `tool_call` events with a time newer than each queued input's `createdAt`. Older, unrelated tool events in reused sessions do not demonstrate delivery of these messages. Non-UUID session IDs cannot be queried with the UUID-scoped local API.
- The Chrome extension reported `paired=true` and version `2.1.45` through `/v1/status`, but this does **not** establish a logged-in, runnable ChatGPT page. The browser proof file did not expose a verified Chrome sign-in time. The app log records separate cases of a ChatGPT page failing to pick up a continue within 15 seconds while the browser was connected, which is a relevant diagnostic, **not a proven error attribution to each of these eight IDs**.

## Exact original queued input identities

| Input UUID | Original type | Browser delivery (11:45 UTC) |
| --- | --- | --- |
| `b11e471b-f66a-4528-b431-d974b1424e9b` | Existing session | Queued / pending |
| `f225fec8-768b-4bf0-8493-872e2ebc1794` | New chat | Queued / pending |
| `c6c7980c-45c2-47ca-9796-30faa6655166` | New chat | Queued / pending |
| `6f5aa0a7-d501-426c-aa65-4a271fcf8c67` | New chat | Queued / pending |
| `a0f67258-7c0a-4525-9033-c2c0d52fe288` | Existing session | Queued / pending |
| `3f4d8b0d-283c-4fc8-8416-b6f664ce8b8b` | New chat | Queued / pending |
| `61cc76c8-8086-4190-99b0-18c768c95f06` | Existing/non-UUID session | Queued / pending |

Additional queued input observed at 11:42 UTC: `e705502d-5a53-4210-b0ed-4060c80c1d54`. The total rose from seven to eight while unrelated sessions and scheduled tasks were active; the investigation created no new COS input.

## Delivery mechanism and exact blocker

The installed Chrome extension `background.js` implements a 30-second `clf-bridge-drain` retry alarm and runs `maintainOnce()`, which calls its authenticated `/status` and handles the app's existing pending input openings. The popup also implements **Connect/Retry → `pair()`**, a documented way to re-establish its channel, distinct from re-POSTing an old source prompt. The extension code is an installed application asset; it was inspected without modification. Its internal `/input/claim`, `/input/ack`, and `/status` protocol messages are extension-owned and **are not exposed** through the project's loopback Local Control API.

The public Local Control API returned only `POST /v1/inputs`, `POST /v1/inputs/{id}/cancel`, worker messages/spawn/ack, and session stop as actions. **No supported `resume`, `drain`, `redeliver` or `retry existing input` control was exposed.** A new `POST /v1/inputs` would duplicate an existing request, while cancel or session stop would abandon work or interfere with concurrent owners. The current CoS coding tools have no safe interactive Chrome-extension popup control. For this reason no destructive, unverified or undocumented bridge commands were attempted.

To unblock existing UUIDs, an operator with the Chrome extension UI can use the already-supported **Connect/Retry** control once and verify ChatGPT is signed in with ChatGPT site access enabled. This must preserve the original queue rather than create replacement prompts. If that yields no delivery, collect the extension's own `chatGptSignedIn`, `chatgptAccess`, input-opening/claim diagnostics and browser tab state before changing anything else; the failing provider-page claim is not yet uniquely explained.

## Independent success test

After any supported Chrome bridge recovery, use `node scripts/qa-autonomy/cos-local-control.mjs inputs` and the exact IDs above to verify `state=sent`, `delivery=sent`, **numeric positive** `deliveredAt` for each input. Then query the matching session events (`node scripts/qa-autonomy/cos-local-control.mjs events <session UUID>`) for a real `tool_call` **after that input's delivery**, plus a reproducible source change with its file path, SHA/diff and source-contract audit before/after. For existing-session inputs, ignore old turns and tools; for non-UUID sessions, the local events CLI does not prove a result. Do not count a browser connection, HTTP 202, offline regression, or a previously completed chat turn as this delivery. Keep formal QA verdict changes exclusively with the official device runner and its independent evidence.

The last source-contract snapshot remained `registered=258`, `fixture=258`, `driver=56`, `db=46`, `png=81`, `expected=86`, `oracle=86`, `cleanup=79`, `contract=30`; the snapshot alone cannot attribute these edits to the queued inputs. Test store operations remain limited to `teat` for this assignment. No production data, official QA ledger, Apple/iOS scripts, Windows task settings, or concurrently owned source files were modified by this investigation.

## 19:52 PHT follow-up and scheduler truthfulness

- The canonical provider total later reached **59 inputs** while its actual queued/pending count remained **8**; the added historical input did not resolve any of the original seven. The latest independent `qa-cos-browser-delivery-audit.mjs --once` returned `DELIVERY_STALLED`, `pendingInputs=8`, oldest pending **252 minutes**.
- `source-lane-dispatcher.mjs` now fetches the complete `/v1/inputs?limit=100` inventory before any Android source send. A shorter 50-row observer snapshot was displaying only 7 of 8 queued requests; the full inventory controls the backlog gate, and an incomplete canonical inventory prevents dispatch.
- Android `start-source-lane.ps1` now propagates **exit 2** when its JSON result confirms `COS_DELIVERY_BACKLOG` or `COS_CONTROL_UNAVAILABLE`. Its independent iOS Stage10 branch is unchanged. The actual Windows `ChatOnSteroids-QA-Source-driver` was started once and returned `LastTaskResult=2` at **19:52:33 PHT**, replacing a prior misleading success (`0`). The source journal recorded `COS_CONTROL_UNAVAILABLE / COS_DELIVERY_STALLED` and no new source input was posted in the launcher before/after total 59 check. Task Scheduler's next run can still re-evaluate the condition; exit2 is a truthful failure notification, not completed work.
- Offline verification: `node --test` for source dispatch, canonical backlog, send identity, and uncertain recovery **30/30 PASS, exit 0**. Evidence: `test-results/qa-cos-source-backpressure-regression-20261024.log`, SHA256 `A8F977508BADC2EFDDE62717C312226B503CD719B8E32FCCA672100168A9C850`.
