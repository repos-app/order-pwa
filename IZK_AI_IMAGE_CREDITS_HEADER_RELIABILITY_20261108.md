# メニュー編集｜AI残高ヘッダと画像生成（2026-11-08）

## 受付・期待

- iPhoneのYuwaku Bar Ownerメニュー編集画面で、AIポイントが共通ヘッダに表示されないことがある（時間経過で表示される）。
- AI画像生成の確認画面に現在残高・単価・利用後残高がなく、既存メニューAI取り込みと表現が統一されていない。
- 「生成できませんでした：処理を完了できませんでした。もう一度お試しください。」で画像生成が止まる。

## ソース調査で確認できた原因と対処

1. `header.js`: 初期認証未復元時にAIハブscriptを読み込まない。後続ログイン回復でも再同期されない。さらにscriptのロード失敗後にはDOM markerが残り、再試行できない。認証回復時と有限回の初期再同期、ロード失敗時のmarker解放と1回再試行をNative/Web/TESTの3面へ適用。ヘルプ、言語、更新、戻るは残す。
2. `menu_editor.html`: 単価を持たない `getAiCreditBalanceSummary` の結果と固定文言で同意していた。既存 `getAiCreditWallet` + `AICreditUI.quote/confirmation/confirm` に一本化。プロンプトから生成を依頼する直前に新しいウォレットを読み、残高と費用、生成成功後の見込み残高を日本語/英語で表示。未検証残高や不足残高では新規生成しない。
3. `menu_editor.html`: 不確実な通信失敗で生成自体が完了した可能性があるため、同一requestIdでの結果回収を保持（回収時は残高0でも再課金しない）。返金済み/確定失敗時は古いrequestIdを使い続けない。成功/エラー時に残高表示とヘッダへ再取得を通知。エラーは共有 `AICreditUI.imageGenerationError` の日英・安全なコード説明へ。
4. `src/commonTenantGateway.js`: バインディングの非列挙性により `AI_CREDIT_FEATURE_ENABLED` と `AI_CREDIT_PACK_PRODUCT_IDS` が物理テナント環境へ伝わらないケースを再現。明示転送を追加。**本番写真の失敗と同一原因だったと断定するログは未取得**。
5. `src/menuImageGeneration.js`: Gemma翻訳のJSONオブジェクト応答を解釈できないケースを修正。翻訳のみ失敗したら元の入力文を使う経路へ移し、FLUX・R2保存成功時のみ既存の1ポイント決済を確定する。
6. 配信キャッシュ: Native/Web本番/Web TESTの `config.js` の共通ヘッダーversion pinを更新し、各 `sw.js` のキャッシュ世代も更新。Webの `ai-credit-ui.js` は `auth2` に統一（メニュー編集・在庫画面・SW SHELL）。Nativeは従来の `ai-credit-hub.js?v=auth4` のオフラインprecacheを現行ヘッダーが使用する `auth7` へ合わせた。キャッシュが古いまま修正不能になる再発を防ぐ。

## ローカル検証結果と正式反映を区別

- `node --test test/ai_credit_header_recovery_test.mjs test/ai_credit_hub_ui_test.mjs test/qa2_header_two_row_regression_test.mjs test/menu_image_feature_ui_test.mjs test/menu_image_generation_credit_test.mjs test/ai_credit_failure_persistence_test.mjs test/common_tenant_gateway_e2e_test.mjs` — **70/70 PASS、exit 0**。Chromium実ブラウザーで共通ヘッダ3面、認証復旧、Help等の既存操作も確認。
- `test/common_tenant_gateway_e2e_test.mjs` — **251 checks PASS（7ファイルのNode集約テストの中の1ケース）**。本番Cloudflare実際の環境値に対する検証ではない。
- `node scripts/ci/critical-ui-preservation-gate.mjs` — PASS。`git diff --check` — exit 0。`node --check src/commonTenantGateway.js` と `node --check src/menuImageGeneration.js` — exit 0。
- キャッシュpin追加後の `node --test test/header_component_test.mjs test/ai_credit_header_recovery_test.mjs test/menu_image_feature_ui_test.mjs test/sixth_pass_distribution_references_test.mjs` — **34/34 PASS**。静的SHELL 7スコープ、全参照1134件に欠損0。共通ヘッダーpinは固定値 `auth20` のテストハードコードを撤去し「最低版＋SW一致」で検証。
- `test/distribution_parity_test.mjs` の前提は `npm run mobile:sync` **実行後**。現在はNativeソースの修正に対して既存 `mobile-dist` / iOS / Android配布コピーが旧版のため、この比較は **FAIL（未同期）**。Web本番/TEST差分は0、SWの記載アセット存在チェックはPASS。配布コピーの更新はリリース時のmobile:sync/ビルドで行い、そこで再判定する（このFAILを隠さない）。
- 両テスト店舗の `menu_photo` 台帳を読み取りのみで確認した時点では0件。今回報告された実店舗でポイント変動や画像の真正な生成履歴を照合した証拠ではない。
- **2026-11-08追加反映**：`main` / `35cdb5fcd2d5a285a6b884d35413f7ee72747a3a` までGitHubにpush。影響する2Worker（common Gateway/API）の本番デプロイ成功・Cloudflare 100%、全13店舗のD1 schema / R2所有者 / 公開読取52件PASS。バージョンと実配備証跡は `docs/IZK_WORKER_PRODUCTION_RELEASE_20261108.md` に追記した。
- **引き続き未実施**：`mobile:sync`、iOS/Android新ビルド/配布、Web/PWA静的配信、現行iPhone画面での修正版表示、実Cloudflare AI/R2/ポイント台帳の生成統合実行、正式実機QA。正式QA新規PASS **0件**。Workerのサーバー修正は反映済みだが、画面側の修正は現行アプリにはまだ反映されていない。

## ソース/横展開レビュー記録（各観点は正式実機QAに換算しない）

| 観点 | 確認元 | 判定 |
|---|---|---|
| S01 現象→コード | iPhone2画面、固定の同意文言、ヘッダの初期判定 | ソース要因確認 |
| S02 根因・修正因果 | Header読み込み条件、Gateway非列挙env、Gemma応答形式 | ローカル再現・回帰PASS |
| S03 入力境界 | prompt空/700文字超、残高不明/不足、不正画像 | 負例回帰PASS |
| S04 認証・店舗 | getAiCreditWallet認証RPC、物理テナントenvironment限定 | ソース＋ローカルtenant E2E確認 |
| S05 再送と失敗 | 通信途絶・処理中・返金済・重複requestId | ローカル回帰PASS |
| S06 台帳整合 | SQLiteポイント予約・確定・返金・別店舗不変 | ローカル回帰PASS |
| S07 表示と言語 | 共通AICreditUI、日英、Native/Web/TEST | ローカル回帰PASS |
| S08 ロード競合 | 認証後着、script失敗、回復時更新 | ローカルブラウザーPASS |
| S09 回帰の負例 | 確認拒否/残高0/通信失敗/モデル失敗/R2失敗 | ローカル回帰PASS |
| S10 変更差分 | git diff、既存dirtyファイル保護、構文、差分余白 | 変更範囲確認・構文PASS |
| H01 Native共通ヘッダ | mobile-app/web/header.js / menu_editor.html | 確認 |
| H02 Web本番 | docs/yuwaku/header.js / menu_editor.html | 確認 |
| H03 Web TEST | docs/yuwaku/test/header.js / menu_editor.html | 確認 |
| H04 共通残高見積 | ai-credit-ui.jsの3面一致・旧メニューAI取り込み | 確認 |
| H05 既存共通操作 | Help/言語/更新/戻るのUI保護 | ブラウザーPASS |
| H06 AIメニュー取込 | 共通confirmationの旧menu_page挙動 | ローカル回帰PASS |
| H07 AI在庫解析 | 共有confirmation inventory_image 呼出箇所、費用変更なし | ソース確認、実機未確認 |
| H08 Gateway | 非列挙バインディングと物理テナントenv | ローカルE2E PASS |
| H09 AI生成/R2 | 返金と保存後の決済確定 | SQLite+モックR2 PASS、実R2未確認 |
| H10 リリース境界 | ソース・配布・実機・正式台帳の区分 | 未リリースを明記 |

本記録のソース検証は正式実機PASSではない。追加Worker配備は上記2バージョンで独立検証済みだが、ユーザー画面の本番再現原因の確定や実機の不具合解消完了は未証明。

## 11月8日追加: `ai_account_budget_unavailable` の具体的なソース原因を再現

- `generateMenuImage` は共通ウォレットに登録済みの `menu_photo` を予算ガードへ送る。一方、`src/aiCreditBudgetWorker.js` の許可リストは `menu_page` / `inventory_image` だけで、画像生成を **HTTP 400 `unknown_budget_category`** で拒否する状態だった。
- `test/ai_credit_platform_relay_test.mjs` を実際の内部ルーター経由で先に実行し、`menu_photo must not be rejected as unknown_budget_category` で **FAIL (400 != 200)** を再現。従来の画像生成単体テストでは予算応答を `allowed:true` にモックしていたため、この不整合は検出できなかった。
- `src/aiCreditBudgetWorker.js` の許可対象を `src/aiCredits.js` の唯一の `FEATURE_COSTS` 定義に統一。不明な機能・異なる `reservedNeurons` は引き続き拒否。
- 実ルーター・プラットフォームSQLite・テナントSQLite・モックAI・モックR2を接続したE2Eで、予算承認→生成→R2保存→消費1ポイント→同一ID再送時の非二重課金を確認。
- `test/ai_credit_platform_relay_test.mjs` を既存222ステップの npm full manifestに登録し、`CI_TIER: SMOKE` でpush/PRの軽量CIにも登録。新しいテスト基盤は追加していない。
- 関連テスト実測: **66/66 PASS**（`ai_credit_platform_relay_test` / `ai_credit_budget_and_api_test` / `menu_image_generation_credit_test` / `ai_credit_failure_persistence_test` / `ai_credit_header_recovery_test` / `menu_image_feature_ui_test`）。`npm run test:lanes` は222 full / 19 CI smoke として認識。`git diff --check` exit 0。
- この追記時点では**ローカルソースのみ修正済み**。新しいコミット・push・Cloudflare本番Workerデプロイ、実AI/R2のライブ統合確認、実機による正式QA判定は未実施。本番反映後に本件が解消したかを別途検証する必要がある。
