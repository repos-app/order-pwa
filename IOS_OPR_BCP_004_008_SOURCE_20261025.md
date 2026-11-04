# iOS OPR-BCP-004〜008 SOURCE契約・回帰記録（2026-10-25 PHT）

## 成果と判定境界

- 対象は831件正式Manifestの `QA2-KEEP-OPR-BCP-004`〜`008`。2026-10-25の読取時点でiOS公式台帳は**5件ともNOT_RUN、claimなし**。本作業はSOURCE-only、正式PASS/FAIL数の変更0。
- 実装: `scripts/qa-autonomy/ios-bcp-family.mjs`（共有物理要件、5件の期待状態、独立Business Effect確認、ケース限定cleanup契約）、`ios-bcp-family.test.mjs`（失敗側を含むソース回帰）。既存の未追跡 `ios-source-contract-registry.mjs` の `IOS_SOURCE_PROVEN_GAPS` に5件の実機ブロッカーのみ追記。
- 再利用: `.qa-v2-official/manifest.json`、`qa-v2-ios-claimed-bridge.mjs`（tap/fill/PNG/claim構造）、`qa-v2-ios-ddi-admission.mjs`、既存 `src/dataAdmin.js` / `src/gasApi.js` / `src/index.js`、Android BCP `coverage-78530b442f987f40a582b1-data.mjs` のテスト所有/署名検証観点。
- **実iPhone、DDI、HID、独立D1 readback、HTTP競合、正式Runnerは実行していない。** フィールドやハッシュを持つモックは正式証拠でない。テスト結果は契約ロジックのみ。iOS registryにSOURCE adapterを実行可能として登録しない。manifest、D1、正式台帳、Apple/TestFlight、Gitリモートを変更しない。

## 831件の元の期待値とソース契約

| ID | 元シナリオ → 必須の実際の期待状態 | 独立して必要な観測 |
|---|---|---|
| 004 | restore → **専用tenantで完全復元** | 復元前の所有全業務表とバックアップ内容の別SHA、復元後一致、新pre-restoreバックアップ、他店/従業員不変 |
| 005 | restore中注文attempt → **lockで拒否** | lock取得中の注文attemptのHTTP境界、`data_admin_busy`、注文0件適用、復元完了と復元内容一致 |
| 006 | restore失敗 → **部分復元状態を残さない** | 本当にDB batch内で障害発生、rollback、全業務表のbefore/after同一SHA、新部分行0、lock解放 |
| 007 | full delete → **専用tenantのみ** | 排他所有の業務表が0件、操作前の自動バックアップあり、他店/従業員不変 |
| 008 | delete中write → **lockで拒否** | lock中の書込みattemptのHTTP境界、拒否書込み0件、削除は1回だけ完了、他店/従業員不変 |

### 実機前提と未解決ブロッカー

既存 iOS claimed bridge は `qa.ios.claimed.scenario.v1` の `tap`/`fill` と画面PNGだけに対応する。復元/削除のためのsecure system password UI校正、サーバーlockを取得した時点で一時停止して別iPhone操作を送る制御、D1 batch内の再現可能な障害注入、独立したトランザクションreadbackは備わっていない。SOURCE契約はこれらを `requiredControls` と `requiredTimeline` に分離し、画面tapを代用品として捏造せず `makeIosBcpPlan` が必ず拒否する。

| ID | registryの未解決ハードウェア・制御要件 |
|---|---|
| 004 | `REVIEWED_IOS_OWNED_BACKUP_RESTORE_CONTROLLER_NOT_AVAILABLE` |
| 005 | `REVIEWED_IOS_RESTORE_LOCK_AND_CONCURRENT_ORDER_CONTROLLER_NOT_AVAILABLE` |
| 006 | `REVIEWED_IOS_TRANSACTION_FAULT_INJECTION_CONTROLLER_NOT_AVAILABLE` |
| 007 | `REVIEWED_IOS_OWNED_FULL_DELETE_CONTROLLER_NOT_AVAILABLE` |
| 008 | `REVIEWED_IOS_DELETE_LOCK_AND_CONCURRENT_WRITE_CONTROLLER_NOT_AVAILABLE` |

`teat`の独占操作が独立に確認できない状態ではfull delete/restoreを実行できない。SOURCE fixtureは `exclusiveTenantOperationLeaseVerified` と `allEligibleRowsOwnedByFixture` を必須にし、独立readbackにも `unownedEligibleRows=0` を要求する。他担当のteat fixtureが混在すれば、そのケースは未実行のまま別の安全なケースへ進む。別の専用使い捨て店舗を作る場合は、専用のstore/DB設定と独立リーダーをレビューしてから契約を拡張する。

バックエンドの `migrations/0033_concurrency_invariants.sql` はDB write triggerで `data_admin_locked` を発生させる。`src/index.js` は direct HTTP 503 `data_admin_busy` に変換する一方、`src/gasApi.js` の旧RPC経路はエラー文字列を返す。SOURCE契約では両経路を区別して同一の書込み拒否結果を独立に要求する。どちらの経路でiPhone実行されるかは実機で観測する必要がある。

cleanupはケース所有fixture/監査証跡のみを対象とし、操作前のowned業務スナップショットを回復する。005/008の保持要求解放、006の障害注入復旧、全件のlock解放と他店不変を実際のcleanup providerと独立確認者へ要求する。これらのproviderはSOURCE今回未接続であり、コントローラ実装前に正式claimを持つことはない。

## 10観点自己レビュー（SOURCEスコープ）

| # | 観点 | 根拠・現在の状態 |
|---|---|---|
| S01 | 元期待値/正本 | 831 manifest 004〜008、元のlegacyId/action/checkpoint厳格比較：SOURCE PASS |
| S02 | 実機操作能力 | claimed bridgeのtap/fillのみ許可を確認し全5件fail closed：SOURCE PASS、物理PENDING |
| S03 | 入力/データの所有 | `ownerCaseId`、fixtureId、exclusive lease、全行所有検証：SOURCE PASS、実所有PENDING |
| S04 | tenant境界 | before/afterの参照店舗SHA、employee SHA、store_id固定検証：SOURCE PASS、実読取PENDING |
| S05 | system権限/機密 | システムroleとsecurity UI確認を要求、password/tokenログ無しを要求：SOURCE PASS、実iOS確認PENDING |
| S06 | APIエラー整合 | direct 503とGAS RPCの別経路、`data_admin_busy`正規化：SOURCE PASS |
| S07 | 004復元完全性 | 単一バックアップへの全業務表一致と復元前退避：契約PASS、遠隔結果PENDING |
| S08 | 005/008競合の原子性 | lock中attempt、拒否、業務適用0件を必須化：契約PASS、時間順実測PENDING |
| S09 | 006ロールバック/007削除範囲 | 部分復元0件、削除対象0件、非対象不変、negative test：契約PASS、実測PENDING |
| S10 | cleanupと失敗時復旧 | owned限定、holding/fault/lock解放の外部provider入出力検査：契約PASS、実際の提供者PENDING |

## 10観点横展開レビュー（ソース間）

| # | 関連面 | 確認結果 |
|---|---|---|
| X01 | iOS native入口 | `index.html`/`manage.html` の統合data_adminナビゲーションを照合：SOURCE PASS |
| X02 | データ管理UI | `data_admin.html` の restore / wipeAll RPC とシステムパスワード確認を照合：SOURCE PASS |
| X03 | server権限 | `src/dataAdmin.js` の `verifySystemActor` のrole/password二重検証を確認：SOURCE PASS |
| X04 | 排他取得 | `acquireDataAdminWriteLock` と30分stale lock、503/409区別を確認：SOURCE PASS |
| X05 | トランザクション | `restoreBackup`/`wipeAllTableData` の `db.batch` とbackup保持を照合：SOURCE PASS |
| X06 | DB triggers | `migrations/0033_concurrency_invariants.sql` の業務表write拒否を確認：SOURCE PASS |
| X07 | API両経路 | `src/index.js` の503 / `src/gasApi.js` の返値との差を契約へ反映：SOURCE PASS |
| X08 | Android BCP再利用 | `coverage-78530b442f987f40a582b1-data.mjs` の007/008所有・Oracle・cleanup観点を再利用、AndroidのADB証跡形状をiOSに転用しない：SOURCE PASS |
| X09 | 831 stage監査 | registryは実行可登録0件、5件のsource gapのみ追加、公式未実行のまま：SOURCE PASS |
| X10 | Native/Web/TEST比較と実機回帰 | Native data_adminと既存バックエンドの契約のみ確認。Web TEST配布内容一致、iPhone上の表示/操作、remote D1事実は**PENDING** |

## 回帰と引継ぎ

実施コマンドと終了状態:

- `node --test scripts/qa-autonomy/ios-bcp-family.test.mjs scripts/qa-autonomy/ios-automation-contract-audit.test.mjs` → **18/18 PASS、exit0**（BCP 8、既存831 iOS監査10）。
- `node --test test/data_admin_orders_regression_test.mjs test/order_submit_offline_boundary_test.mjs` → **2/2 PASS、exit0**（既存データ管理DBロック/全削除/復元/オフライン注文拒否）。
- `node --check scripts/qa-autonomy/ios-bcp-family.mjs` と `node --check scripts/qa-autonomy/ios-source-contract-registry.mjs` → **いずれもexit0**。`git diff --check` → **exit0**（別ワーカー作業ファイルの改行に関するwarningあり）。

正式QAの実施や承認とは独立のオフライン回帰である。

実機前の残作業は、claimに排他的に紐づく独立backup/tenantリーダー、正規iOS物理コントローラ、画面領域の実機校正、secure入力、lock/fault後のfinally cleanup、独立した証拠の正式認証である。これらの証拠が揃うまでは5件すべて `NOT_RUN` とし、別の実行可能なQAケースを進める。
