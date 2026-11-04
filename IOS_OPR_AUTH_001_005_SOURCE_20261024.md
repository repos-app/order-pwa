# iOS OPR-AUTH-001〜005 SOURCE-only 実装・検証

実施範囲: 正本831件Manifestに含まれる次の5つのiOSケース。既存公式Runner・端末claim・Windowsタスク・D1・公式台帳への書込みは本作業で実施していない。SOURCE検証結果を正式QAのPASS数へ加算しない。

| ID | ケース固有の期待状態 | iOS独立Oracleの確認内容 |
| --- | --- | --- |
| QA2-KEEP-OPR-AUTH-001 | Staff default permissions / 定義どおり | Staffの29ページ権限をdefault setと全件比較し、adminを認証済みread-only APIで許可確認 |
| QA2-KEEP-OPR-AUTH-002 | Manager default permissions / 定義どおり | Manager default setとの全件比較、inventoryへの認証済みread-onlyアクセス |
| QA2-KEEP-OPR-AUTH-003 | Admin permissions / 全許可相当 | 全ページ許可とusersへの認証済みread-onlyアクセス |
| QA2-KEEP-OPR-AUTH-004 | System permissions / 全許可 | 全ページ許可とbackupへの認証済みread-onlyアクセス |
| QA2-KEEP-OPR-AUTH-005 | tile hidden / 権限なしtile非表示 | Staffが許可されないusersタイルを含む各タブの非表示、およびusersへの認証済みread-only APIを403で拒否 |

## 実体と共通化

* \`scripts/qa-autonomy/ios-auth-family.mjs\`: 5件の契約を1つのロール別定義と同じシナリオ組立器・Oracle・cleanupで実装。実iPhone画面/ビルドで校正済みのタップ矩形、全ツール表示、実ログイン、カテゴリごとの可視・不可視タイル全数、ライブAPI/D1照合を要する。アプリ内の画面タブが異なるためorders→sales→stock（権限保有時）→staff→more/customer→systemの共有画面遷移を使用。
* \`scripts/qa-autonomy/ios-auth-claim-d1.mjs\`: 公式claimがRUNNINGの間だけ、teat専用D1にSELECT-onlyで従業員・roleとpermission_matrix未設定を確認し、別providerのfixture所有証明と結合する。テナント、employee ID、role、claim、DB識別の不一致は停止する。
* \`scripts/qa-autonomy/ios-source-contract-registry.mjs\`: \`ios-role-permissions-v1\`登録で既存の831件監査/15工程SOURCE処理へ合流。物理実行は従来の \`qa-v2-ios-claimed-bridge.mjs\`（HID/DDI/画面PNG/lease/正式Runner）のみ。
* \`scripts/qa-autonomy/ios-auth-family.test.mjs\`: 全5件の正本受入条件、ケース所有、実機校正必須、29ページ権限、拒否403、DB独立確認、client/UI反証、API偽装拒否、cleanup失敗と途中失敗のcleanupをオフライン回帰。

SOURCE登録の前後比較は **22 → 27件（+5件）**。当該5件のSOURCE登録状態は \`SOURCE_ADAPTERS_PRESENT_RUNTIME_UNVERIFIED\`。これは実機シナリオのレビュー完了、Oracle本番連携成立、正式判定を意味しない。831件のManifestは不変。

## 現物で残る前提

1. 現在iPhoneにインストールされたTestFlight版、USB/HID/DDI、端末専有、実画面座標とカテゴリごとの全タイル観察が未確認。仮のテスト矩形は実機校正に流用しない。
2. teat内のケース所有QA従業員5名、該当roleのpermission_matrix初期値（そのロールの保存行が0件）、Pro状態、本人ログイン、所有・終了後整合性を実測すること。**初期権限は従業員単位ではなく店舗とロール単位**なので、単にQA従業員を作るだけでは既存のcustom matrixを回避できない。設定済みの場合、本D1 readerは明示して失敗させる。SOURCEレーンがrole設定を消去することはない。
3. 外部で構築した独立iOS画面Oracle、リアルの認証済みread-only API/拒否proof、隔離fixtureセットアップとcleanup provider、署名/証拠審査、公式claim下の実行が未接続。SOURCEプロバイダの関数が存在するだけで15工程のE2E完了にはしない。

## コマンド証拠

* \`node --test scripts/qa-autonomy/ios-auth-family.test.mjs\` → **5 PASS / 0 FAIL / exit 0**、SOURCE登録22→27、正式verdict書込み0。
* \`node --test scripts/qa-autonomy/ios-831-stage-action-matrix.test.mjs scripts/qa-autonomy/ios-automation-contract-audit.test.mjs scripts/qa-autonomy/ios-source-work-selector.test.mjs\` → **19 PASS / 0 FAIL / exit 0**。
* \`node --test scripts/qa-autonomy/ios-attendance-family.test.mjs scripts/qa-autonomy/ios-operation-claim-d1.test.mjs scripts/qa-autonomy/ios-order-lines-family.test.mjs\` → **26 PASS / 0 FAIL / exit 0**。
* \`node --check\`（両新規SOURCE module） → **exit 0**。\`git diff --check\` → **exit 0**（既存の他担当ファイルのCRLF警告はあるが、改変していない）。

## SOURCE自己レビュー10観点

| 観点 | 対象と独立した確認方法 | SOURCE結果 |
| --- | --- | --- |
| S01 | Manifestの正本831件と対象5件のlegacy ID/受入文言照合 | PASS |
| S02 | ケース対象role、fixture所有、store_id=teatのassertion検証 | PASS |
| S03 | Staff初期許可8件と全29ページの逆集合の検証 | PASS |
| S04 | Managerの初期許可setとの差分をAPI全権限に対して検証 | PASS |
| S05 | Admin/System全ページ許可の確認と非システム判定の分岐 | PASS |
| S06 | AUTH-005のusers非表示およびread-only API 403を別観点で検証 | PASS |
| S07 | SQLはSELECT、ID/role/storeに範囲制限、独立DB marker確認 | PASS |
| S08 | before/after/owner各段階の公式claim二重確認とfresh read ID照合 | PASS |
| S09 | 実画面/ビルド依存の矩形、screen hash、UI outcome失敗例の検証 | SOURCE PASS / 物理PENDING |
| S10 | case所有cleanup、監査保持、失敗時の独立確認、二重cleanup防止 | PASS |

## 同種横展開10観点

| 観点 | 入口・照合元 | SOURCE結果 |
| --- | --- | --- |
| X01 | 831 Manifestを逆引きして他IDへの無断登録なし | PASS |
| X02 | \`src/permissions.js\` STAFF/MANAGERと初期権限の未設定分岐 | PASS |
| X03 | \`src/gasApi.js\` 29 PERMISSION_PAGES・roleAllowed返却の整合 | PASS |
| X04 | \`src/index.js\` Native ROUTE_PERMISSION_PAGE/403 guard | PASS |
| X05 | \`mobile-app/web/index.html\` の全ツール・Group nav・tile filter | PASS |
| X06 | \`mobile-app/web/manage.html\` の同型カテゴリとroleAllowed分岐 | PASS |
| X07 | \`migrations/0001_init.sql\` のstore_id/role/page_key複合主キー | PASS |
| X08 | Pro/Freeとsystem roleで表示条件が異なる経路を切り分け | SOURCE PASS / 実iOS PENDING |
| X09 | 既存iOS勤怠、注文、checkout各familyの契約回帰26件 | PASS |
| X10 | 15工程/監査/dispatchのSOURCE登録を既存回帰19件で確認 | PASS |

**正式判定の更新: 0件。iPhone実機検証: 未実施。** 5ケースはいずれも、現在のsource-auditが引き続き保有する「物理シナリオ校正・実際のHID/DDI・独立Oracle/cleanup実行・公式claim証拠」ブロッカーが解消されるまで正式PASSにできない。先に他の安全なSOURCE/QAケースの処理を続行できる。
