# IZK-UT-091 — Web TEST backup UTC timestamp mirroring

Local fix only, official QA unchanged. Duplicate audit: `rg` for `IZK-UT-091`, `UTC_DATE_DISPLAY`, and UTC/data_admin references in the issue ledger and `docs/IZK_UT_09*.md` did not find an earlier 091 record. **IZK-UT-091 is now registered in the master ledger and issue-dashboard as WAIT_TEST / LOCAL SOURCE FIXED.** The existing Web production date-display UTC fix was already dirty and preserved.

Root cause: `migrations/0006_data_admin_backups.sql` stores `created_at` through SQLite `datetime('now')`, producing UTC timestamps without a timezone designator. `formatDateTime('2026-10-17 17:30:00')` intentionally preserves local wall time. Production `data_admin.html` already used `DateDisplay.formatUtcDateTime` with `auth5`; TEST still called `formatDateTime` and its `date-display.js` did not export the UTC entrypoint. TEST `date-display.js` now mirrors the existing production 9-line UTC adapter plus its export. TEST `data_admin.html` mirrors production `auth5`/UTC formatter and also the existing cached `BACKUP_ROWS` + `renderBackupRows` I18n language-change logic needed to satisfy the *pre-existing* full HTML mirror contract. No server data mutations.

Cache: TEST `config.js` fallback URL and TEST SW precache pin now use `auth5`. TEST SW cache version was bumped `v285` → `v286`, preserving preexisting dirty `auth18` header and localhost-only test configuration; production other pages remain on `auth4` because they do not require UTC-only function. The change is constrained to the TEST data-admin path. No production files changed in this extension.

### Before/after evidence

- Before: `test/local_smoke_test.mjs` failed on `data_admin.html` production/test mirror (`exit 1`); TEST `date-display.js` lacked `formatUtcDateTime` and TEST HTML used `auth4` + `formatDateTime`.
- After: `git diff --no-index --numstat docs/yuwaku/data_admin.html docs/yuwaku/test/data_admin.html` → **exit 0**, byte-equivalent HTML. `node test/izk_ut_091_utc_date_display_test.mjs` → **exit 0**, production and TEST both return `2026/10/18 01:30:00` for SQLite UTC `2026-10-17 17:30:00` in `Asia/Manila`, and preserve `2026/10/17 17:30:00` for the local-wall-time API. Includes UTC no-seconds, explicit `Z`, UTC timezone, cache pins and mirror assertions.
- `test/local_smoke_test.mjs` after: passed the original HTML mirror assertion, subsequently failed **exit 1** at existing assertion line ~2439 expecting SW version `v282`; current production had `v285` *before* this task, TEST now `v286`. This stale fixed-version test requires its owning test maintainer to reconcile against actual release contract. Its entire suite is **not PASS**.
- `git diff --check` scoped TEST files → **exit 0**, CRLF warnings only.

### S01–S10: separate source review methods and results

| ID | Inspection / evidence | Result |
|---|---|---|
| S01 | Inspected migration 0006 timestamp provenance `datetime('now')` | UTC source confirmed |
| S02 | Compared Prod and TEST `data_admin.html:134`: `auth5` versus `auth4` before change | fixed |
| S03 | Compared backup-row cell `:355`: UTC-specific formatter versus local formatter | fixed |
| S04 | Diffed Prod/TEST `date-display.js`: UTC 9-line function and export absent | fixed |
| S05 | Executed UTC SQL text at PH +08 day boundary in both VM implementations | PASS |
| S06 | Executed timestamp without seconds: coerced to `:00Z` once | PASS |
| S07 | Executed explicit UTC ISO input: no double conversion | PASS |
| S08 | Executed existing local wall-time path to prove it stays unchanged | PASS |
| S09 | Inspected refresh/export object; new method is added without changing original `formatDateTime` | PASS |
| S10 | Checked exact HTML mirror (exit 0), scoped diff whitespace (exit 0), and local smoke residual FAIL | scoped PASS / full smoke FAIL |

### H01–H10: distinct cross-impact paths inspected

| ID | Scope and evidence | Result |
|---|---|---|
| H01 | Prod `data_admin.html` `auth5` pin source compared with TEST | match |
| H02 | Prod/TEST `data_admin.html` entire byte equality via `git diff --no-index` | match |
| H03 | TEST `config.js` dynamic DateDisplay injection pin guarded by `data-iz-date-display` | auth5 synced |
| H04 | TEST `sw.js` precache enumerates `auth5` key and new `v286` generation | synced |
| H05 | Prod `config.js` remains `auth4` for other pages; explicit Prod data-admin script loads first | reviewed, no change |
| H06 | Prod `sw.js` older `auth4` shell pin; explicit `auth5` script may fetch/cached by runtime | reviewed, production deploy not tested |
| H07 | TEST other screens preserve their existing `formatDateTime` semantics; no cross-page mass conversion | preserved |
| H08 | Verified document string `BACKUP_ROWS`/`renderBackupRows` needed for I18n re-render mirrors existing Prod; not an API write | synced |
| H09 | Read `test/local_smoke_test.mjs` mirror gate and reran; original assertion now passes; separate SW version gate fails | conditional FAIL |
| H10 | Searched issue ledger and 09x docs for duplicate prior ID; subsequently registered 091 in official incident ledger and dashboard without replacing QA verdict | reviewed, registered |

Remaining: main smoke stale SW version contract must be reconciled by owner; browser cache activation / real deployed behavior / formal QA are unverified. No commit, push, deployment, build, official QA ledger write, DB modification, header, 089 or 090 edits.

## 2026-10-17 後続横展開：公開予約・日付JSの最後の不一致も解消

最終185段の統合テストの途中、既存 `test/date_display_test.mjs` が公開予約 `docs/date-display.js` と `docs/test/date-display.js` の旧版を検出（**事前 exit1**）。両ファイルには9行のUTC専用アダプター/公開exportがなく、Native・Web本番・Web TESTの3版と異なっていた。旧版からの一括置換ではなく、現在正本の `mobile-app/web/date-display.js` を両公開予約版の**共通関数ファイルにのみ**反映。公開予約`docs/reserve.html`／`docs/test/reserve.html`では、更新した共通JSを旧URLキャッシュから確実に切替えるため `date-display.js?v=2` → `?v=3` の参照だけ変更。時刻の意味が異なる既存 `formatDateTime()` は変更なし。バックアップ以外の呼出しへUTC変換を追加していない。

- **S01**: Native/Prod/TEST/公開予約2面のSHA-256を5件独立比較（事前3対2、事後すべて `C0C1F7963D81BBF0818AB83DA0CC01D519975B9943E359ACF9C7174D894581A7`）。**S02**: `git diff --no-index`で公開版の差分はUTC専用9行＋exportだけと特定。
- **S03**: `formatDateTime()` はローカル壁時計値に時差を追加しないことをソース比較。**S04**: `formatUtcDateTime()` はSQLiteのsuffixなしUTCと明示`Z`双方をサポートすることを実VMテスト。
- **S05**: JS公開exportの既存APIを削除せず追加のみ。**S06**: Public/TESTのJSは同一ソースを使用しており両者の差分は0。
- **S07**: すべての5面で日付用CSS・コントロールの既存操作を変更していない。**S08**: `test/date_display_test.mjs`の同期スクリプト順序チェックは`auth4`も`auth5`もconfig前を要求し、欠落自体は引き続きFAILさせる。
- **S09**: ソース側の日時変換追加を秘密/認証境界には使わず表示目的のみ。**S10**: 元33テストは事前FAIL→事後33/33 PASS exit0、URLキャッシュ版を検査する追加チェックで**34/34 PASS**、`node scripts/izk-all-frontend-js-audit.mjs`は53/53構文PASS、`git diff --check` exit0。

横展開の別10観点も実施：**H01** Native日時表示、**H02** Web本番のバックアップ作成日時、**H03** Web TESTミラー、**H04** 公開予約本番のJSと`?v=3` URL、**H05** 公開予約TESTの同一URL版、**H06** ローカル壁時計値の非二重変換、**H07** TZ Asia/Manilaでの日付境界、**H08** date/monthフォーム値非破壊、**H09** `date-controls.css`の5面バイト同一と全126HTML監査exit0、**H10** 署名Native配布用アセットとは別の公開Webデプロイ未実施の分類。H01～H09はソース/VM監査でPASS、H10は配布・実機確認PENDING。

追加で、旧断片文書の「local_smoke残存FAIL」は後続で正当なService Worker版下限へ修正され、`test/local_smoke_test.mjs` 581 checks exit0、最終 `npm test` **185/185 ordered steps exit0**（`test-results/izk_source_fix_full_185_verified_20261017.log`）。**正式QA PASSを示すものではない**。
