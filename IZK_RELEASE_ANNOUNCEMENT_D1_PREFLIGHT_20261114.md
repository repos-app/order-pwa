# Release announcement D1 preflight — 2026-11-14 (IZK-UT-165)

## Current GitHub evidence

- Source run: `repos-app/izakanpai` / `release-announcement-draft.yml` / `43469885298` / attempt 1, commit `2594199b3359d489d9dd5f9c7be702620050dcba`.
- CI was still FAIL on re-investigation. No subsequent attempt or newer workflow run was present.
- The generated JSON artifact was retained. It identifies notice `0cc0b2da-9db8-5be0-8a56-8e804f4cebbd`, `state=draft`, `publication=NOT_RELEASED`, and two product paths (`docs/yuwaku/api.js`, `mobile-app/web/api.js`).
- The publication step produced `ANNOUNCEMENT_CONTROL_D1_UNAVAILABLE:WRANGLER_EXIT_1`. The original script deliberately suppresses raw Wrangler stderr, so the GitHub token's actual failure cause is **not confirmed**.
- The release-note-specific D1 secret was not listed. The existing workflow falls back to the common Cloudflare token. Existing independent local credentials previously read Control D1 successfully, which does not verify the GitHub token's permissions.
- The previous local retry/error fingerprint changes in `scripts/release/announcement-draft.mjs` and `test/auto-ci/release-announcement-draft.test.mjs` remain uncommitted and were preserved.

## Different mitigation in this pass

Added `scripts/release/announcement-d1-preflight.mjs` and an independent, read-only workflow step **before** the existing publish step. Uses the *same CI credentials* as publish, and Cloudflare's HTTPS API instead of Wrangler:

1. `GET /user/tokens/verify` — active token only.
2. `GET /accounts/{account}/d1/database/{id}` — configured Control DB must be accessible and match `wrangler.control-plane-production.toml`.
3. `POST /accounts/{account}/d1/database/{id}/query` — executes only `SELECT announcement_id FROM platform_announcements LIMIT 0` to check query access/schema without modifying rows.

The script reports sanitized step/error category and numeric Cloudflare code, never raw responses, token, SQL error details or account metadata. It exits nonzero on errors. Non-product main pushes (`NO_USER_FACING_CHANGE`) skip the remote preflight, matching existing release behavior. Access to D1 **Read** does not prove D1 **Write** permission; an actual publish/readback and an observed new CI result remain required.

## Local verification

- `node --test test/auto-ci/release-announcement-d1-preflight.test.mjs test/auto-ci/release-announcement-draft.test.mjs`: **19 PASS / 0 FAIL** (7 new, 12 existing), exit 0.
- New tests cover configured target extraction, token verification, database/query request sequence, SELECT-only SQL, CI-only skip, CLI exit codes, missing credentials, inactive tokens, 401/403/404/429/5xx, missing/mismatched database, schema failure, and sanitized logs.
- Syntax checks and `git diff --check` exited 0. Local YAML parser packages `yaml` / PyYAML were unavailable; workflow alteration was inspected as a limited new step (no YAML parser PASS claimed).
- No CI execution of the new implementation; GitHub formal PASS **0**. No new commit, push, Worker deploy, production DB write, mobile build or distribution.

## Source review (S01–S10) and independent impact review (H01–H10)

The following are ten separate source concerns and ten separate downstream/adjacent code checks. These are source review findings, not a physical device or CI execution result.

| Review | Evidence / finding | Source verdict |
| --- | --- | --- |
| S01 CLI entry | Direct-execution guard in `announcement-d1-preflight.mjs` prevents import-time network calls | PASS |
| S02 Token handling | Secret used as HTTP `Authorization`; only sanitized error codes reach stderr | PASS |
| S03 Token state | Verify endpoint requires active status before database checks | PASS |
| S04 Account validation | 32-character hexadecimal account ID required before URL construction | PASS |
| S05 D1 configuration | Database UUID resolved from configured `izakanpai-control` D1 binding, not guessed | PASS |
| S06 Target identity | API metadata `name` and `uuid` must both match expected Control DB | PASS |
| S07 SQL side effects | Only static `SELECT ... LIMIT 0` is issued by the preflight | PASS |
| S08 Response validation | Invalid HTTP/JSON/SQL result is fail-closed | PASS |
| S09 Error privacy | HTTP status and numeric Cloudflare error code are retained; response text is excluded | PASS |
| S10 Request bound | Native AbortSignal timeout caps each HTTP request at 12 seconds | PASS |
| H01 Trigger scope | Workflow remains scoped to `main` push | PASS |
| H02 Auth propagation | New step reuses exactly the publish step's secrets/fallbacks | PASS |
| H03 Non-product path | Original draft generator emits `state=skipped` and no productFiles; new preflight avoids remote calls for that state | PASS |
| H04 Failure artifact | Existing `if: always()` artifact upload remains after the new step | PASS |
| H05 Publish oracle | Existing `publishDraft` independently reads the D1 record back, checking state and publishedAt | PASS |
| H06 Announcement data contract | `src/platformAnnouncements.js` continues to own content validation and published-only customer reads; unchanged | PASS |
| H07 Schema contract | `control-plane/0018_platform_announcements.sql` declares the selected `announcement_id` column | PASS |
| H08 Runtime compatibility | Existing Node 24 workflow provides fetch and AbortSignal.timeout used by the new script | PASS |
| H09 Cross-platform CLI | Windows subprocess regression checks both skip success and fail-closed missing-credential exit code | PASS |
| H10 Build isolation | New workflow step invokes only a Node read-only preflight; no mobile build invocation added | PASS |

No review item proves the production GitHub token's permission or a new GitHub CI PASS; those remain open external checks.

## Remaining gate

Existing Run `43469885298` remains FAIL; no CI-side token was available locally to validate. The preflight will produce the first stage-specific CI evidence only when the source is incorporated into a **separately authorized** push and a new workflow run occurs. If the token is valid for D1 reads but lacks write permission, the existing publication stage will still fail. The owner must verify that the CI secret actually has the intended Control D1 Read/Write scope and check the new Run's preflight plus publish/readback evidence before closing IZK-UT-165.
