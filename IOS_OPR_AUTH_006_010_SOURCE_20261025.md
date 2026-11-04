# iOS OPR-AUTH-006〜010 SOURCE 契約 (2026-10-25 PHT)

## 範囲と正本

公式831件定義: `.qa-v2-official/manifest.json`。SOURCE実装対象は
`QA2-KEEP-OPR-AUTH-006/007/008/009/010` の5件。正式iOS claim・
TestFlight・DDI/HID実機・遠隔D1・公式台帳・Apple申請を本作業で変更していない。
SOURCE回帰は正式QA判定に加算しない。

| CASE | 正本期待値 | SOURCE契約 | SOURCE registry |
| --- | --- | --- | --- |
| 006 | direct URL→403/gate、データ描画0 | 観測済みiPhone直URL遷移/403 UI/機密データ非表示と権限/資格情報不変を要求 | 未登録。ブリッジに端末上URL入力/遷移経路がない |
| 007 | API direct call→server 403 | 実認証済みiPhone直APIの独立HTTP応答403と機密データ非表示、不変を要求 | 未登録。ブリッジに端末上API送信経路がない |
| 008 | foregroundでpermission revoke→次回read/writeで反映 | 同一在籍QAスタッフのadmin許可1→0、画面上の次回保護read拒否、認証済みgetTableMaster 403、teat D1差分を照合 | SOURCE登録、実機未検証 |
| 009 | foregroundでpermission grant→再検証後利用可能 | admin許可0→1、前面アプリ再検証後の描画、認証済みgetTableMaster 200、teat D1差分を照合 | SOURCE登録、実機未検証 |
| 010 | password change→旧session失効 | QA専用ログインUI入力・変更成功・独立ログイン中の**旧セッション**失効、旧access/refresh拒否、新パスワードでログイン成立 | SOURCE登録、実機未検証 |

SOURCE監査への純増は3件（006/007は不足能力が明示されたまま）。実際のSOURCE登録ステータスは
`SOURCE_ADAPTERS_PRESENT_RUNTIME_UNVERIFIED` であり、実機稼働可能・レビュー完了・正式判定を示さない。

## 再利用・新規ソース

- `scripts/qa-autonomy/ios-auth-boundary-family.mjs`: 831 Manifest確認、teat QA-owned fixture、ケース固有の前後条件、実画面校正済みの共通タップ/安全なfillシナリオ、独立Oracle、途中失敗の片付け。006/007の物理compiler/runnerは不足能力を明示して拒否。
- `scripts/qa-autonomy/ios-auth-boundary-claim-d1.mjs`: 既存の独立SELECT専用D1設定を使用し、公式claimを毎クエリ前後で確認。teatのDB UUID、従業員ID、ログイン、役割、店舗内全ロール権限（008/009）、対象旧session（010）を読戻し。パスワードhashは原文を返さずSHA256 fingerprintのみ返す。
- `scripts/qa-autonomy/ios-source-contract-registry.mjs`: 008〜010を既存15工程SOURCE監査に接続。006/007は未解決物理能力を登録。
- `scripts/qa-v2-ios-claimed-bridge.mjs` と `scripts/qa-v2-persistent-transport.mjs`: 010の4フィールドを既存のclaim依存・実画面検証・入力値非永続化のiOS fillに追加。011など別caseが010用資格情報欄を使えないようcase-IDで制限。
- `scripts/qa-autonomy/ios-auth-boundary-family.test.mjs`: 5件の正本照合、3件シナリオ組立、拒否/許可、旧access/refresh失効、全ロール権限復元、D1 read-onlyとowner/claimを含むオフライン回帰。

## 実運用前提と残ブロッカー

1. 現iPhoneの署名・TestFlightビルド、端末独占、mounted DDI、HID/PNG、実際のフォーム・ボタン座標と画面状態を別途独立観測する。ダミー座標を実機に流用しない。
2. 008/009は `savePermissionMatrix` が店舗全体のロール行を書き換え得る。**teatの権限マトリクス独占**、全ロールの前後SELECT、他ロール不変、全ロール完全復元を独立照合するまで正式実行しない。隔離QAアカウントだけではロール単位の影響を隔離できない。外部の実際の権限更新providerと復元providerは現時点で未接続。
3. 010は所有証明された使い捨てQA従業員と、変更操作とは別にログイン済みの旧セッションが必要。旧sessionの失効後再活性化禁止、旧パスワード復元、変更後資格情報でのログイン・失効の独立HTTP証拠が必要。パスワードやtokenはファイル/ログに保持しない。実際のcredential resolver/復元providerは未接続。
4. 006/007は共通iOS HIDドライバにURLナビゲーション/端末上の独立API直送がなく、単なるtapやサーバーからの擬似HTTP呼出しでは正本の物理QAを証明できない。レビュー済み端末操作能力の実装と、真の403証拠が揃うまでSOURCE未登録。
5. iPhoneでの画面判定、正式RUNNING claim、独立API response、D1所有照合、fixture作成と後片付け、Runner validateProofsを実行していない。これらがある正式実機実行で初めてPASS/FAILを確定する。

## ローカル検証

| コマンド/対象 | 結果・範囲 |
| --- | --- |
| `node --test scripts/qa-autonomy/ios-auth-boundary-family.test.mjs` | 最終10 PASS、0 FAIL、exit 0。正常/反証/全ロール復元/旧セッション失効/4クエリmockD1、全ロール独立SELECT確認 |
| `node --test scripts/qa-autonomy/ios-auth-family.test.mjs scripts/qa-autonomy/ios-831-stage-action-matrix.test.mjs` | 10 PASS、0 FAIL、exit 0。既存5件と831件SOURCE監査 |
| `node --test scripts/qa-autonomy/ios-automation-contract-audit.test.mjs scripts/qa-autonomy/ios-source-work-selector.test.mjs` | 既存回帰は変更途中に確認済（同型監査の最終確認は上記stage action回帰） |
| iOS claimed bridge / DDI / secure fill系 | 既存7 + 25 PASS、0 FAIL、exit 0（本変更の周辺回帰時） |
| `node --test test/permission_route_guard_regression_test.mjs test/tenant_additional_auth_intrusion_test.mjs test/izk_ut_082_remember_login_optin_test.mjs` | 16 PASS、0 FAIL、exit 0、認可/保管資格情報 |
| `node --check` 新規SOURCE/D1/既存bridge・transport/registry | すべてexit 0 |

テストで提示するbuild `1.0 (11)`・画面矩形・QA従業員・D1応答は明示的なmockで、実端末/遠隔D1の証跡ではない。
正本831件、正式iOS/android状態、D1/公式claim/判定変更0件。

## SOURCE自己レビュー（S01〜S10）

| 観点 | 根拠と判定 |
| --- | --- |
| S01 正本/legacy | 831件実JSONと5件のcase・期待文字列・legacyを照合。SOURCE PASS |
| S02 fixture境界 | teat/owned/claim/role/login各不一致を拒否。SOURCE PASS |
| S03 校正 | 端末幅/build/actual UI矩形/現在ページ・QA session未確認を拒否。SOURCE PASS、実iPhone未確認 |
| S04 unsupported実機操作 | 006/007はplan生成と実行をfail closed。SOURCE PASS、正式未実行 |
| S05 権限状態遷移 | 008/009の1→0/0→1とHTTP 403/200の独立一致・異常値拒否。SOURCE PASS |
| S06 DB/read-only | 全SQLがSELECT、teat marker UUID検証とowner/claim前後確認。SOURCE PASS、remote未実施 |
| S07 旧sessionと秘密値 | 010の既存session失効、新ログイン・旧token/refresh拒否、hashを原文返却しない。SOURCE PASS |
| S08 失敗/後片付け | 失敗時も同一fixtureのcleanup、他ロール全数復元、audit保持、旧session復活禁止。SOURCE PASS、実復元未実施 |
| S09 bridge安全性 | cpフィールドは010に限定、空/制御文字禁止、独立real-time resolver経由。SOURCE PASS |
| S10 QA証拠保護 | 正式台帳・D1無変更、SOURCE監査のみ+3、端末HID/Oracle未実施を宣言。SOURCE PASS |

## 横展開（H01〜H10）

| 観点 | 照合先・SOURCE結果 |
| --- | --- |
| H01 ロール別デフォルト | `src/permissions.js` STAFF/MANAGER、権限上書きの分岐を確認。SOURCE PASS |
| H02 Native API | `src/index.js` の `getTableMaster` 権限対応と403拒否を確認。SOURCE PASS |
| H03 GAS互換API | `src/gasApi.js` `checkToken/changePasswordByLogin`・権限ガードを確認。SOURCE PASS |
| H04 Nativeホーム | `mobile-app/web/index.html` login/password fields・hub導線確認。SOURCE PASS |
| H05 別ログイン画面 | `mobile-app/web/manage.html` の同型changePasswordByLoginを確認。SOURCE PASS |
| H06 セッション失効 | `src/sessionTokens.js` v2/v3失効とrefresh再利用拒否を確認。SOURCE PASS |
| H07 DBスキーマ | `migrations/0020_auth_sessions.sql`、`migrations/0001_init.sql`のstore_id/role鍵を確認。SOURCE PASS |
| H08 実機証拠 | `qa-v2-ios-claimed-bridge.mjs` 真のPNG/claim/validationを既存回帰で確認。SOURCE PASS、物理PENDING |
| H09 HID入力 | `qa-v2-persistent-transport.mjs` とPython bridgeの秘密値非ログ/フィールド制約を確認。SOURCE PASS |
| H10 他CASE/監査 | 001〜005の契約/831監査の回帰を確認、他ケースを010パスワードfieldから除外。SOURCE PASS |

実機や遠隔DBの各行動の真正性をこれらのオフラインレビューで証明したとは扱わない。次は独立provider所有者が必要前提を満たし、元の正式Runnerで5ケースの真正な証跡を評価する。
