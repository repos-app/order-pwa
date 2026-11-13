# IZK-UT-147｜パスワード変更時のログインID初期表示

## 受入条件と実施内容（2026-11-08 PHT）

- ログイン画面の「パスワードを変更」を押すと、現在入力されている `loginId` を変更画面の `cpLoginId` に初期表示する。
- 戻る操作でログイン側IDを変えない。再入場時はその時点のログイン側IDを使い、空欄時に以前の別IDを残さない。
- パスワードはコピーしない。Nativeの既存ワークスペース初期表示・パスワード変更API・保存ID機能を変更しない。
- 対象ソース：`mobile-app/web/{index,manage}.html`、`docs/yuwaku/{manage.html,test/manage.html}`。
- 実装：既存 `toggleChgPw(show)` の `show=true` 分岐で、現在のログインID入力欄からパスワード変更ID入力欄へ直接値を渡す。新しい保存・認証・通信経路はない。

## 独立ソースレビュー S01–S10

| ID | 観点・実際の確認方法 | 結果 |
| --- | --- | --- |
| S01 | 四画面の `loginId` DOMの実在をテスト入力の前に検査 | PASS |
| S02 | 四画面の `cpLoginId` DOMの実在をテスト入力の前に検査 | PASS |
| S03 | 各画面のリンクから `toggleChgPw(true)` が呼ばれることをHTML逆引き | PASS |
| S04 | 実ハンドラで `show=true` のときだけID転記することをソース検査 | PASS |
| S05 | `show=false` でログインIDを変更しないことを実ハンドラ実行 | PASS |
| S06 | 変更画面でIDを手入力した後、戻って再び開くと現在IDに戻ることを実行 | PASS |
| S07 | ログインIDが空欄の場合、変更画面の古いIDをクリアすることを実行 | PASS |
| S08 | `loginPass` が `cpOldPass` へ転記されないことを実行 | PASS |
| S09 | Nativeの既存 `cpWorkspace` 引き継ぎが以前どおり動くことを実行 | PASS |
| S10 | 新しいAPI呼出し・資格情報永続化がないことを実ハンドラ抽出・実行（API未提供でも成功）で確認 | PASS |

## 独立横展開レビュー H01–H10

| ID | 異なる入口・逆引き・配布面 | 結果 |
| --- | --- | --- |
| H01 | Nativeホーム `mobile-app/web/index.html` をソース検査し実ハンドラテスト | PASS |
| H02 | Native管理 `mobile-app/web/manage.html` を同上 | PASS |
| H03 | Nativeのindex/manageをSHA-256比較し一致を確認 | PASS |
| H04 | Web本番 `docs/yuwaku/manage.html` を実ハンドラテスト | PASS |
| H05 | Web TEST `docs/yuwaku/test/manage.html` を実ハンドラテスト | PASS |
| H06 | Web本番/TESTのSHA-256が一致することを検査 | PASS |
| H07 | `toggleChgPw` の全呼出元・定義を`rg`で検索し4画面以外の対象なし | PASS |
| H08 | `doChangePw` のID取得は以前どおり `cpLoginId` であることをソース検査 | PASS |
| H09 | ログアウト後の `loginId` / `cpLoginId` 消去を既存164チェックで検証 | PASS |
| H10 | Native保存ID復元とパスワード無効化を既存14テスト、共通Help/言語/更新/戻る/AIを保全ゲートで検証 | PASS |

## 検証証拠（ローカル、実機QAとは別）

- 先に追加した `test/login_change_password_prefill_regression_test.mjs` は修正前に **0/4 PASS、4/4 FAIL**（ID転記不足）を再現。
- 修正後 `node --test test/login_change_password_prefill_regression_test.mjs test/login_missing_credentials_ui_regression_test.mjs`：**5/5 PASS、exit 0**（後者は既存スクリプトを1ファイル扱い）。
- `node scripts/ci/critical-ui-preservation-gate.mjs`：PASS、exit 0。
- `node test/izk_ut_071_logout_privacy_regression_test.mjs`：164チェックPASS、exit 0。
- `node --test test/izk_ut_082_remember_login_optin_test.mjs`：14/14 PASS、exit 0。
- `node scripts/qa-modernization/business-journey-review.mjs --changed`：exit 0。認証画面は既存業務ジャーニーマップの対象外。候補から正式QAへ昇格した件数0。
- `git diff --check`：exit 0。
- **未実施**：本番配信、Git commit/Push、Android/iOSビルド、ユーザー実機QA。既存正式QAの判定は変更していない。
