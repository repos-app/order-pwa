# CANCEL 1b33 RUN_SETUP — SOURCE 検証（2026-10-25 PHT）

## 対象と結論

831件正本の `QA2-KEEP-PT-CANCEL-005/006/009/010/012` と immutable group `scripts/qa-autonomy/runtime/coverage-packages/coverage-1b33e094db62023e5eb6d2.json` を照合。既存の `coverage-88e7dfaa369abad133091b` の署名付きfixture/業務Oracle、`coverage-1b33e094db62023e5eb6d2` の共通実機ドライバーとケース別受入条件を再利用した。5組すべてのsource pairは準備済みだが、現行の正式 `--plan` では **実行候補0/5**。ユーザー承認は有効、実機・正式claim・D1操作・正式PASS追加はすべて0。

| CASE | 今回検証した共通実行経路 | 正式キュー実行前に残る必須機能 |
| --- | --- | --- |
| 005 | 模擬ADB上でNative WebViewの取消ボタン→取消理由→submit→Back、2 PNG、独立Oracleとowned cleanupを一続きで実行 | 本物の通信処理中にBackを送る実障害コントローラー、teat ES256署名/別D1読戻し、実機請求状態 |
| 006 | 模擬ADB上で取消対象→理由→submit、PNGと確定1回／在庫戻し1回を検査 | commit後だけのHTTP応答喪失コントローラー、teat ES256/D1、再試行/在庫検証の実証 |
| 009 | 受渡済Takeoutのowned fixtureと期待状態を照合し、存在しないNative取消UI操作を安全に拒否。失敗後のfixture cleanupを実行 | Takeout取消ボタンの実UIターゲット／禁止または返金の一意な導線 |
| 010 | owned Takeoutと期待値を照合し、存在しないNative取消UI操作を安全に拒否。失敗後のfixture cleanupを実行 | Takeout取消UIおよびcommit後応答喪失コントローラー、再読込／自動再送なしの実測 |
| 012 | 返金対象明細・数量と金額の整数単位Oracleを照合し、存在しない一部返金UI操作を拒否。失敗後のfixture cleanupを実行 | 明細選択・部分数量指定・一部返金のBackend/RPC、D1明細単位の税/SC/割引配賦実測 |

テストの `runCancelCase` は本来の `makeTenantRealmeActionAdapter` → 実ADBコマンド経路／CDP Locator／Native WebView画面座標変換／PNGファイルSHA計算／署名readback Oracle／finally cleanupを通った。テスト側のADB・CDP・DB証拠は意図的な隔離模擬であり、物理証拠・署名や公式QAの代わりではない。005/006の実行経路の基本動作を検証し、未装備の009/010/012が他ケースへ偽のPASSや実機操作を伝播させないことも確認した。

## 検証と証拠

- `node --test` による新規追加の2つの実行経路テストを含む **対象9/9 PASS**。
- 既存CANCEL family、ES256 provider、共通Realme action、ユーザー承認済み未reviewed admission、共通paired契約を同時実行した **50/50 PASS、exit0**。ログ：`test-results/coverage-1b33e094db62023e5eb6d2-run-setup-regression-20261025.log`、SHA256 `9053f508269103ed675a66440570113603bfd1933eaa2f44eb29d0fe02e58e86`。
- `node scripts/qa-v2-realme-unattended-pilot.mjs --plan --user-authorized --source-only` **exit0**、`sourceOnlyNoAdb=true`、`realmeAuthorized=true`、`formalChanges=0`。指定5件すべて `CASE_SOURCE_EXPLICITLY_NON_EXECUTABLE`。読取報告：`test-results/coverage-1b33e094db62023e5eb6d2-formal-plan-20261025.json`、SHA256 `39a14f6d4c16c96f058c56e833c1cacb06b6de65602ca7be29d20bde5b3e3b88`。
- `validateDataDriverPreparation` は5/5 `ready=true, complete=true`。`validateCoverageImplementation` は `valid=true`、履歴source SHAは非ブロック。5件の公式Android statusは各 `NOT_RUN`。`scripts/qa-autonomy/runtime/coverage-handoffs/coverage-1b33e094db62023e5eb6d2.json` にテスト結果、実ログと公式planのみをSHA付きで記載。`evidence[]` にソースファイルや偽スクリーンショットは含めない。

## 影響範囲の確認・残件

Native `mobile-app/web/admin.html` は既存 `askVoid` / `vdReason` / `vdGo` の注文取消経路を持つが、`mobile-app/web/takeout.html` は顧客の注文UIであり、指定Takeout管理取消ターゲットを持たない。`mobile-app/web/receipts.html` の返金操作は全額返金のみ。`src/takeout.js` の取消処理と `src/gasApi.js` の `refundReceipt` は、未実装の画面上の一部返金操作を証明しない。Web production `docs/yuwaku/admin.html` とNativeの `askVoid`、`test/backend_auth_attendance_401_regression_test.mjs` および共通tenant/契約スコープを逆引きで照合し、今回の商品コード配布面には変更を加えなかった。

現在の SOURCE 契約は単一ケースclaimの下でteat所有fixtureを作成→独立署名/DB検証→実機操作→業務Oracle→finally片付ける順序を保持。`USER_AUTHORIZED_UNREVIEWED_RUN` を実行時に要求し、偽造 `reviewed:true` は使用しない。今後Formal Queueが本当に `runnable` と報告したケースだけが、元の正式runner所有者によって `--run` される。今は実行候補0なのでこのSOURCE作業から物理実行へ移行しない。claim取得前にスクリーンショット、DB事後状態、cleanup結果を要求することはしない。

**完了状態：SOURCE検証済み／実機接続・実HTTP故障注入・ES256+独立D1観測・正式QAはPENDING。** 本作業ではRealme/ADB、Cloudflare remote D1、公式claim/台帳、APK/本番公開、commit/push/deployを操作していない。
