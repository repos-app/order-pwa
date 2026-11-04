# izakanpai｜2026-10-15 未修正入力障害のソース是正まとめ

**対応の境界:** 本報告は既存のAndroid正式FAILと追加の割引入力を元にした**ローカルソース修正とオフライン・VM回帰**を記録する。QA.apk 910017、実機Android/iOS、Cloudflare本番、実D1、正式831件の結果は変更していない。既存の他担当未コミット変更は保護した。**commit / push / deploy / production migration / QA status overwriteなし**。

## ソースで確認した根因と対応先

| 障害・正式ケース | 根因 | ソース対応 | 詳細・受入条件 |
| --- | --- | --- | --- |
| **IZK-UT-072**, QA2-KEEP-PT-INP-0317/0319 | 設定画面`min=0`のHTML制約が保存RPCに伝播せず、`-1`を店舗設定に保存可能 | Native/Web本番/TEST `settings.html`で事前拒否＋`src/regionalSettings.js`でNative/GAS経路の保存前検証。`0`は既定値に上書きしない | `docs/QA2_RATE_VALIDATION_FIX_20261015.md` |
| QA2-KEEP-PT-INP-0119/0120 | **別画面**Native `manage.html`店舗初期設定: UI契約`min0 max100 step0.1`なのに小数`0.11`が送信可能 | Native `manage.html`およびmirror `index.html`のウィザード送信前にブラウザ有効性+非空検証、無効なら一切RPCしない | `docs/QA2_RATE_VALIDATION_FIX_20261015.md`。Web本番/TESTのmanageにはこの初期設定wizard自体がない。通常`settings.html`の`step=any`を勝手に変更しない |
| QA2-KEEP-PT-INP-0345 | `src/discountRules.js`が割引表示順`1.5`を`Math.trunc()`で`1`として保存 | 整数かつ定義域内をサーバーで必須検証、Native/Web/TESTの画面でもエラー後return | `docs/QA2_DISCOUNT_LOYALTY_FIX_20261015.md` |
| QA2-KEEP-PT-INP-0375 | `Number(raw)||20`が入力`0`を既定値に置き換え、APIが不正値を通していた | Native/Web/TEST画面で0/負数/不正文字列を拒否、サーバーで明示的なロイヤルティ設定値を共通検証 | `docs/QA2_DISCOUNT_LOYALTY_FIX_20261015.md` |
| QA2-KEEP-PT-INP-0342 | 画面`maxlength40/80`に対し、直接RPCで超長文字列がサーバー`clean().slice`により無言で切り詰められる。ブラウザの貼付けでも無言トリムリスク | 入力長を正規化前の**元文字列**で検証、超過は保存前に明示エラー、サーバーでも保存しない。40文字コード/80文字日英名を維持 | `docs/QA2_DISCOUNT_OVERLENGTH_0342_20261015.md`。正式ケースは現時点でNOT_RUNだったためFAIL→PASSなどの変更はしていない |
| **IZK-UT-073/074** | 長文割引名称の横はみ出しとIME表示に加え、QAドライバーのSaveボタン位置「観察」自体が`scrollIntoView`を繰り返し呼び、独立したADB swipeと競合 | 073の既存共通CSS/表示省略/編集時フォーカス抑制を尊重し、074ではQAドライバーの**位置観察だけを純粋読取に**変更。明示的なowner付きADB swipe/座標ガードを保持 | `docs/IZK_UT_074_JITTER_SOURCE_INVESTIGATION_20261015.md`。旧動画の全振動原因がこれだと断定しない |

## 修正担当の共通手順へ横展開

**必読**: `handoff/IZAKANPAI_SOURCE_FIX_MASTER_RUNBOOK.md` と `AGENTS.md`。10回自己レビュー＋10回横展開レビューは、上記各個別報告のS01-S10/H01-H10を照合。ローカルソースやVMでできた検証を実機PASSに見せかけない。

**追加した恒久ルール**: 個別フィールドのQA仕様を確認してから`min/max/step/maxlength`を実装する。HTMLの制約だけに依存しない。無効な値はユーザーに説明し**RPC前**に止め、API直呼びでも拒否。元データを黙って切る・0をdefaultに化けさせる・小数を整数に丸めて成功と見せることを禁止。受付/表示名と管理コードは別の長さ・形式とし、元DB保存値とUIの省略表示は別扱い。

## 回帰と残る合格ゲート

実行可能な専用テスト: `test/qa2_rates_validation_regression.mjs`, `test/qa2_rates_validation_manage_setup.mjs`, `test/qa2_discount_loyalty_validation_boundary.mjs`, `test/qa2_discount_overlength_0342.mjs`, `test/izk_ut_074_native_scroll_probe_test.mjs`。これらを`npm test`へ登録済み。

### 全体テストで検出した別件のSQL監査レジストリ不一致

今回の最初の`npm test`では新規ソース修正ではなく、既存commit `a36d959`で導入済みの**QA専用会員削除・予約fixture API**がSQL静的監査の既存上限/登録に反映されていないことを検出。`src/crm.js`のraw SQL実呼出し54箇所に対して旧監査上限53、`src/qaReservationFixtureApi.js`の4箇所に対してモジュール未登録だった。

- `src/crm.js`のQA専用削除では**`teat`専用・管理者・`QA_MEMBER_FIXTURE_CLEANUP_ENABLED=1`・Case+run SHA marker・既存履歴無し・store_id+対象ID原子的照合**の成立が削除条件であることをソース確認。`node test/qa_v2_worker_a_members_delete_api_test.mjs` **20/20 PASS**。
- `src/qaReservationFixtureApi.js`の4SQLはstore_id、parent/child ID、marker/name/email、削除時期と管理権限、`QA_RESERVATION_FIXTURE_CLEANUP_ENABLED=1`で制約される。`node test/qa_v2_worker_b_reservations_fixture_test.mjs` **36/36 PASS**、`node test/qa_v2_realme_parent_api_security_audit_test.mjs` **4/4 PASS**。
- 実SQL・ガードをレビューした後、`test/tenant_raw_sql_inventory_test.mjs`に2件の監査登録のみ追記。`node test/tenant_raw_sql_inventory_test.mjs` **exit0**、SQL 45モジュール・934 syntactic sites。**本番削除機能を有効化したことではない**。監査自体が完全な実行時SQLパーサー/権限保証ではないことも維持。

### 全回帰で発見した旧期待値と横展開ずれ

- `test/mobile_navigation_test.mjs`の注文Quickbar契約（狭い端末で**横スクロール無し・1列内で省略表示**）に対して、Native/Web/TEST共通CSSに `overflow-x:auto` が残存した。3配布面の`@media max-width:480px`のquickbarだけ`overflow-x:hidden`へ統一、ボタン縮小・ラベルellipsis/nowrapは従来どおり維持。`node test/mobile_navigation_test.mjs` **191項目PASS**。
- 同テストの割引値検証が旧 `value<=0` を期待していたが、最新正式仕様とサーバー実装は **`value<0.01`** の拒否。テストの旧文字列期待だけを`value<0.01`へ更新し、**実装の下限を弱めてはいない**。同じ191項目PASS。
- 変更後の`npm test` **exit0**。ログ: `test-results/qa2-source-input-remediation-npm-test-final2-20261015.log`。初期2回の中途FAILログは監査/契約の調査経緯として保持し、存在しなかったことにしない。

### 最終ローカル検証記録（2026-10-15）

- `npm test` **exit0**：`test-results/qa2-source-input-remediation-npm-test-final2-20261015.log`。
- `npm run mobile:sync` **exit0**：`test-results/qa2-source-input-mobile-sync-20261015.log`。生成物をローカル同期したのみでAPK・IPAはビルド/配布していない。
- `npm run verify:distribution` **exit0**：`test-results/qa2-source-input-verify-distribution-20261015.log`。Web production/TESTの`settings.html`・`styles.css`はbyte一致、Nativeの`index.html`と`manage.html`はbyte一致。
- `git diff --check` **exit0**。全5系統の専用テストもそれぞれexit0。`test/tenant_raw_sql_inventory_test.mjs`もSQL 45モジュール・934構文上呼出しを再監査しexit0。
- 検証時正式Androidは **PASS293 / FAIL47 / BLOCKED2 / NOT_RUN489**、iOSは **PASS12 / BLOCKED2 / NOT_RUN817**。**この数値をソースの修正成功によりPASSへ変更していない**。
- QA2-KEEP-PT-INP-0119/0120の`manage`は**step=0.1/max100のUI専用制約**であり、同じキーに対する一般`saveSettings`の`step=any`許容（例:0.11）は現行契約上継続。この点はバックエンドが呼出し元のUIを識別できないため、**登録ウィザードの正規RPC事前検証で無効値を止める**設計。全APIで0.11が無効という意味ではない。
- `IZK-UT-074`は画面上の長文一覧とQAドライバーの操作競合を一部是正したが、**録画の揺れが完全になくなったと判断できる実機証拠は未取得**。新APKと独立した手動操作/ドライバー操作比較が必要。

1. 修正後のソース全体で`npm test`、`npm run mobile:sync`、`npm run verify:distribution`、`git diff --check`を実行してexit codeとログを記録する。
2. 最新ビルドとして正確なAPK SHA/版を用意し、正式Realme 720物理pxで**負値・0・0.11・10.1・100.1・1.5・40/41文字・80/81文字・貼付け・IME**の画面操作とサーバー不変を独立確認する。
3. 既存の正式QA FAILは継続。新しく対象テストをrunner経由でclaimして正式PASSが確認できるまでは閉じない。**0342は現時点でNOT_RUN**。
4. 074は修正後APKで長文割引名・IMEあり/なし・QAドライバーあり/なしのスクロールを再録画し、「アプリ自身」「ドライバーが誘発」「両者」のどれかを検証する。旧長文データの無断再投入は禁止。

**本書はローカルソース対応を記録するための資料であり、修正版バイナリ・実機・本番の受入証拠ではない。**
