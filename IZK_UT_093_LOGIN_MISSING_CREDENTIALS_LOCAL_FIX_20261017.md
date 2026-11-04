# IZK-UT-093 — 存在しない店舗IDをログイン失敗として扱わず内部認証エラーを表示（2026-10-17）

## 受付・適用範囲

- 利用者が Android 実機のログイン画面で `store_not_found` を含む日英混在の「認証処理を完了できませんでした」表示を撮影。QA APK は直前に導入した `com.izakanpai.commissionpos.uitest` **910020**、Realme RMX3938（720×1600物理px）。写真上は日本語変換された店舗IDが入力されている。
- **期待**：店舗ID／ログインID／パスワードのどれが DB・認証正本と一致しなくても、同じ利用者向けログインエラーを出す。実在する店舗・従業員名を推測させない。入力未記入、メール未確認、試行制限、通信・保存・基盤障害とは区別する。
- **直接原因**：`src/controlPlaneWorker.js::tenantRoute()` は店舗が Control tenant_registry に存在しない場合に `store_not_found`（404）を返す。既存 `src/loginAuth.js::authenticateEmployeeLogin()` は、対象店舗内の在籍従業員がない／パスワード照合が失敗した場合に `auth` を返す。一方、`mobile-app/web/index.html` / `manage.html` の `doLogin` catch は `auth` だけを通常ログインエラーに変換し、`store_not_found` は技術的な認証障害へ流していた。Hosted 固定店舗版にも同種の分岐が残る。
- **修正**：上記 Native 2画面と、`docs/yuwaku/manage.html`、`docs/yuwaku/test/manage.html` のログイン catch で `auth` および `store_not_found` のみ `I18n.t('loginErr')` に統一。Worker／DB、token／session、認証成功条件、store分離、404 API 契約、ログイン試行制限は**一切変更しない**。Native では「ワークスペース、IDまたはパスワードが違います」／EN「Incorrect workspace, ID or password」、固定店舗Webでは従来の ID/PW エラーを使う。
- 原ソース Git HEAD（修正前）`4e8ff192f8436880bcc58ba328dfb5cf8aac6734`。本修正の Git commit／push／Worker／DB反映は **未実施**。APK 910020 はこの変更を**未同梱**。Formal QA／実機再試験も未実施。未コミットの他担当変更は編集していない。

## 修正前後の回帰と既存契約

1. 新規 `test/login_missing_credentials_ui_regression_test.mjs` は **HTMLから実際の `window.doLogin` 関数を抽出して VM 実行**し、疑似実装ではなく本番ソースを検査。Native 2画面・Hosted Web PROD/TEST の4画面×日英×（店舗欠落／ユーザー欠落／PW不一致／メール未確認／レート制限／HTTP503／安全保存障害）を確認。必須未入力と設定不一致時の API 非送信もテスト。
2. **変更前 exit1**：Native日本語で `store_not_found` が `認証処理を完了できませんでした... [store_not_found]` となり、期待した `loginErr` と不一致。
3. **変更後 exit0**：4画面共通の正しい `loginErr` と HTTP/メール/レート制限の別案内、技術コード隠蔽、ボタン復帰、1回だけのlogin要求、Native `storeId`、未入力時 API 0回。
4. `node test/auth_client_regression_test.mjs` **exit0、272 checks**。4xx構造化失敗と認証セッション・保存・分離・offlineの既存境界。
5. `node test/gas_compat_smoke_test.mjs` **exit0、562 checks**。ログインGAS/Native互換・メール未確認・ログインレート制限を含む実backend fixture回帰。
6. `node test/tenant_fail_closed_config_matrix_test.mjs` **exit0、19 checks**。Control/Hybrid/Tenantのfail-closed境界。
7. `node test/izk_project_test_pipeline_contract_test.mjs` **exit0**、恒久テストを `test/project-test-commands.json` の190番目までのrunner列に追加。
8. **全体 `npm test`相当の `node scripts/run-project-test-pipeline.mjs` は exit1（190段中25段目）**：`test/test_store_id_child_migration.mjs:11` が migration **46件**と固定しており現物**47件**。今回のHTMLと無関係な既存・並行開発の migration 契約差。ログ `test-results/izk_login_credential_unification_npm_test_20261017.log` / `_stderr_20261017.log`。そのファイル／migration は触っていない。全体テストPASSとは報告しない。
9. `git diff --check`（今回の4画面＋manifest）**exit0**。Windows GitのCRLF変換警告は改行差の注意でありチェック失敗ではない。

## 自己レビュー S01〜S10（互いに異なる根拠）

| No. | 方法・実測証拠 | 判定 |
|---|---|---|
| S01 | 利用者実機写真の `store_not_found` と現行Native `loginErr` catch の組合せを照合。正常なDB認証エラーと区別できていないことを確認 | PASS（根因） |
| S02 | 修正前に実HTMLハンドラVMで `store_not_found` を注入、期待する loginErr との差異を assert exit1で再現 | PASS（RED） |
| S03 | `src/loginAuth.js` の `employees WHERE store_id = ? AND login_id = ? AND status='在籍'` と password hash検証を読み、ユーザー/PW失敗はどちらも `auth` と確認 | PASS |
| S04 | `src/controlPlaneWorker.js` の `tenant_registry` 存在チェックと `tenantRoute` 404を読み、欠落店が `store_not_found` になる経路を追跡 | PASS |
| S05 | `mobile-app/web/api.js` の HTTP4xx JSON preservation と `!json.ok → new Error(json.error)` を読み、UIまでエラーコードが到達することを確認 | PASS |
| S06 | `email_unverified` と `login_rate_limited` が共通の資格不一致へ誤分類されないことを Native/Web各日英 VMでassert | PASS |
| S07 | `http_503` と `auth_storage_unavailable` を注入、ログインID/PW不一致とは表示上明確に分離していることをassert | PASS |
| S08 | 認証失敗の送信ボタンの再有効化・1回だけの要求・未入力／認証設定NG時の0回送信をVM検証。失敗時に新token受理経路なし | PASS |
| S09 | Native `index.html` と `manage.html` の SHA256 `A780C86422B8E47F72A005E5BAAAED8885F2D46B6F8B2015FD3861EE53A18BA1` 一致をファイルハッシュで確認 | PASS |
| S10 | `git diff --stat` を4画面限定で確認（Native各4行差、Hosted各3行差）。技術エラー分岐を丸ごと消さず `store_not_found` を追加する最小パッチ、after exit0 | PASS |

## 横展開レビュー H01〜H10（独立した入口／境界）

| No. | 開始点→探索・実測／対応 | 判定 |
|---|---|---|
| H01 | Android Nativeログイン `index.html` → Native WebViewホーム `manage.html` のログインcatch → 完全同SHAを確認。Android側ソースのみ欠落なし | PASS（SOURCE） |
| H02 | Native source → iOS Capacitorで利用する同じ `mobile-app/web` HTML → 個別iOSハンドラなし。ただし IPA は再生成未実施 | PASS（SOURCE）／iOS DEVICE PENDING |
| H03 | Hosted PROD `docs/yuwaku/manage.html` → Hosted TEST `docs/yuwaku/test/manage.html` → SHA256 `662719F285FAD1EEFA8A0F53E5CF2061FC9CEAD5DF7A88253631A75556CF9356` 同一 | PASS（SOURCE） |
| H04 | Native動的 `workspaceId` 入力 → `API.post('login',{storeId,...})`、Hosted固定店舗→`{loginId,pass}`。テナント入力UIをHostedへ誤コピーしていない | PASS |
| H05 | `src/gasApi.js` の `login` → `src/loginAuth.js` の `auth` と照合。`node test/gas_compat_smoke_test.mjs` 562 checks exit0 | PASS |
| H06 | `src/index.js::handleLogin` → `src/loginAuth.js` → `401 auth`、Controlの404と別契約のまま維持。`tenant_fail_closed_config_matrix_test` 19 checks exit0 | PASS |
| H07 | `mobile-app/web/api.js` の `_fetchOnce` 4xx JSON処理 → `API.post` 失敗throw → doLogin catch。非JSON/5xxは通常の通信・認証環境エラーのまま | PASS |
| H08 | ログインからリンクするパスワード変更 `window.doChangePw` と店舗登録 `window.doSignup` のエラー分岐を別途見直し。ログイン限定の認証不一致統一を流用しない | PASS（別フロー） |
| H09 | 元 `loginErr` 翻訳/言語トグルをNativeとHostedの日英でVM照合。ログイン率制限/メール確認による専用フローへの混入0件 | PASS |
| H10 | `rg` で `store_not_found`/`auth` UI と4画面を逆引き。顧客向け公開予約／注文 API の `store_not_found` は本人ログインではないため文言変更の対象外。恒久runner登録・パッケージ外の既存dirtyは保護 | PASS（SOURCE） |

**結論**：修正範囲の自己10巡＋横展開10巡はソース・VMレベルで確認。**APK/iOS配布/Web公開、ユーザー操作・正式Playwright QA、全体190段統合テストは別ゲート**。他担当の migration 47対46不整合解消後、全体回帰→許可済み配布経路→最新APK/IPAでの実機受入が必要。
