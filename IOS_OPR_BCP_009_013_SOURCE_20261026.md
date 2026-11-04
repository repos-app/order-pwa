# iOS OPR-BCP-009〜013 SOURCE契約・レビュー（2026-10-26 PHT）

## 範囲と成果

正式831件Manifestの `QA2-KEEP-OPR-BCP-009`〜`013` の5件だけを対象とする。
既存 `ios-bcp-family.mjs`（004〜008）、`ios-bcp-tenant-boundary-family.mjs`
（014〜018）、`qa-v2-ios-claimed-bridge.mjs`（claim/lease/HID/DDI/PNG）、
`ios-source-contract-registry.mjs`（ソース欠落監査）を確認して再利用した。

追加した `scripts/qa-autonomy/ios-bcp-export-order-family.mjs` は5件共通の
Manifest整合、所有fixture条件、実機要件、独立business-effect照合、cleanup後の
独立読戻しを提供する。5件はそれぞれ異なる業務期待状態を厳密照合する。

| ケース | 正本の期待 | ソース側の独立照合条件 |
| --- | --- | --- |
| 009 | `receipt_print_outbox backup` → 含まれる | 正本ZIPの `receipt_print_outbox.csv` と既存行、認証済みRPCのCSVバイトハッシュ、teatの独立D1行ハッシュ、前後不変を照合 |
| 010 | `printer ownership backup` → 含まれる | 正本ZIPの `print_device_printers.csv`、CSV/RPC/D1の行とバイト整合、outboxとprint_queue不変を照合 |
| 011 | Aのorder IDをBでread → 0/403 | yuwakuセッションでteatの注文IDにアクセス試行、実HTTP拒否、注文漏洩0・両店舗不変を照合 |
| 012 | Aのorder IDをBでupdate → 0/403 | 実HTTP拒否、注文状態変更0・監査追加0・両店舗不変を照合 |
| 013 | AのreceiptをBでreprint → 0/403 | 実HTTP拒否、外部レシート漏洩0・print_queue/outbox/claimの越境副作用0を照合 |

現行iOS HIDドライバーの許可操作はログイン向けの `test-id/test-tab/fill/submit`
に限られ、一般のNativeバックアップZIP取得や認証済み越境HTTPリクエストの実行能力を
持たない。従って5件とも **SOURCE-only、`executableWithCurrentBridge=false`**。
新しい座標の推測、仮想ZIP、模擬HTTP結果を正式実機証拠として流用しない。
011の任意注文IDを指定した取得に対応する既存ネイティブAPIルートは未確認であり、
一覧／delta APIを利用して「ID指定試行済み」と判定しない。
009/010も最終共有先境界で捕捉した本物のZIPと別のRPC/D1観測が必要。

fixtureはteatでの所有証明とexclusive leaseを要し、越境ケースでは
独立したyuwakuのQA用セッション・店舗側の存在/不在事前確認を要する。
cleanupはケース所有レコードのみ対象にし、監査保全・復元後独立read ID・
他店舗不変・セッション解放を要求する。backupのOS共有操作完了は別途検証対象。

## 回帰と状態

- 新規 `ios-bcp-export-order-family.test.mjs`: **8/8 Node PASS**（正負の期待、ZIPハッシュ照合、越境・cleanup失敗系、831 source監査）。
- 既存 `ios-bcp-family`、`ios-bcp-tenant-boundary-family`、`ios-automation-contract-audit`、`qa-ios-contract-scope`：**26/26 Node PASS**。
- `node --check` 新規2ファイル PASS、`git diff --check` PASS。
- `ios-source-contract-registry.mjs` は5件を `IOS_SOURCE_PROVEN_GAPS` として記録し、独立D1/実機アダプターがないのに SOURCE_ADAPTERS_PRESENT と数えない。
- iOS端末操作・独立HTTP/D1・Apple/TestFlight確認・正式Runner claim/Oracle approval・正式PASS/FAIL更新：**0件、未実施**。正本/台帳/D1には書き込んでいない。

## 自己レビュー S01〜S10（すべてソースレビュー、実機QAとは独立）

| 観点 | 調査対象・検証した条件 | ソースレビュー判定 |
| --- | --- | --- |
| S01 正本 | `.qa-v2-official/manifest.json` の5件action/checkpoint/legacy IDをコードで全件照合 | PASS |
| S02 制約の原因 | HID driverの許可4操作とBridgeのtap/fillしかない点、ZIP/越境HTTPの未接続を照合 | PASS（未接続を明示） |
| S03 入力 | ID/SHAの形式、零行、空のZIP、重複ZIPエントリ、誤case IDをfail closed | PASS |
| S04 認証・店舗 | teat owner/yuwaku disposable token/claim bindingと店舗間不変を確認 | PASS（実証待ち） |
| S05 再試行・副作用 | 認証済みHTTP requestCount=1、accepted=false、affectedRows=0、403または業務拒否付き200のみ許容 | PASS |
| S06 互換・会計 | 010のqueue/outbox不変、013のreprintQueue/outbox/claim 0、元注文/レシート変更なしを指定 | PASS |
| S07 iOS UI | `data_admin.html` exportAllと`receipts.html` reprintを調査、物理座標は未検証と明示 | PASS（座標は未確定） |
| S08 後始末 | callback必須、read ID重複禁止、restore/cleanup後の別照合、sourceOnly=trueを検証 | PASS |
| S09 回帰負例 | 両店舗のハッシュ変更、権限偽装、200成功、ZIP欠落、部分差分、時系列偽装をテスト | PASS |
| S10 変更保護 | 新規共通ファイル2つとsource gap登録1箇所、正式台帳に変更なし。共有dirty差分を保護 | PASS |

## 横展開レビュー H01〜H10（異なる実装経路をソースで照合）

| 観点 | ソース探索と確認事項 | 判定 |
| --- | --- | --- |
| H01 Native ZIP | `mobile-app/web/data_admin.html:179-203` はgetSheetNames→exportSheetData→JSZip→NativeFileExport | PASS |
| H02 Web ZIP | `docs/yuwaku/data_admin.html` と `docs/yuwaku/backup.html` のRPC/ZIP経路を確認。Native証明とは独立 | PASS |
| H03 TEST ZIP | `docs/yuwaku/test/data_admin.html` と `backup.html` の別配布面に同型RPC経路を確認 | PASS |
| H04 backend export | `src/backup.js:16-56` に2テーブル登録、`store_id=?`制約、子テーブル親子joinを確認 | PASS |
| H05 API permission | `src/gasApi.js:1070-1133` にbackup/receipts権限とupdateOrderStatusの認証分岐を確認 | PASS |
| H06 Order update | `src/orders.js:420-450` は `WHERE store_id=? AND order_id=?`、既存状態と遷移の検査あり | PASS |
| H07 Reprint | `src/printers.js:1038-1078` はreceipt店別検索→印刷ジョブstore別INSERT | PASS |
| H08 iOS Bridge | `scripts/qa-v2-ios-claimed-bridge.mjs` と HID driver の実機計画/許可操作を逆引き | PASS（controller未接続） |
| H09 Android実物baseline | `test/playwright-realme/qa-bcp009010-native-backup-proof-910020.mjs` の独立D1/ZIP/CSV照合手順を比較。iOS証拠への転用なし | PASS |
| H10 831 readiness | `ios-source-contract-registry.mjs` → `ios-automation-contract-audit.mjs` → `ios-831-stage-action-matrix.mjs` のsource blocker伝搬を回帰で検証 | PASS |

この20観点のPASSはソースレビューの成立だけを表し、iPhone実機および
正式QAのPASSは表さない。次工程は、正規claimに結びついた本物のZIP捕捉/別RPC/D1
アダプター、teat/yuwaku独立DB読戻し、任意ID指定の認証済みiPhone request controller、
HID画面座標とDDIサービスの実観測を個別に実装・審査すること。
