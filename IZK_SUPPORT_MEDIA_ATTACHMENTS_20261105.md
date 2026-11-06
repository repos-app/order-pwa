# izakanpai サポートフォーム｜複数画像・動画添付

日付：2026-11-05 PHT。対象：ログイン済み Native 管理画面の「サポート → 不具合・要望を送る」。

## 完了条件・実装

- 画像・動画を混在で5件まで選択可能。1件25 MiB、合計50 MiB。JPEG/PNG/GIF/WebP/HEIC/HEIF/MP4/MOV/WebM。選択一覧・個別削除・エラー・アップロード進捗・日本語/英語を提供。元のカテゴリ／本文入力、メール送信・既存共通ヘッダーは維持。
- 添付を512 KiB単位で順次送信するGAS互換RPC：`beginSupportAttachmentUpload` → `uploadSupportAttachmentChunk` → `completeSupportAttachmentUpload`。完了した添付IDだけ `submitSupportMessage` に渡す。通信失敗時は元ファイルと同じclientRequestIdを保ち、完了分を再アップロードしない。成功確認後だけ本文・添付をクリア。
- サーバーで店舗・actor・clientRequestId・**拡張子とMIMEの対応**・byte size・先頭magicを検証。たとえば `evil.html` / `.png.html` をPNGとして装う入力はR2保存前に拒否。店舗別の非公開R2へ保管し、メールには30日有効の署名付き閲覧リンクを入れる。既存の公開 `/images` 経路は `/private/` を提供しない。リンクの署名・失効・店舗・環境・R2 metadataを検証しダウンロードは添付形式（非インライン）とする。
- 添付なしの従来テキスト送信は互換維持。送信は既存 `sendPlatformEmailIdempotent` に依存し、不確定な再送で同じ連絡を二重通知しない。
- 本変更は **SOURCE**。ビルド、commit、push、本番Worker deploy、R2へのライブ送信、実機正式QAはこの作業では実施していない。

## ソースレビュー10観点（S01–S10）

| ID | 独立した追跡・検証 | 観測した根拠 | 判定 |
| --- | --- | --- | --- |
| S01 | 元フォーム → 新UIを比較 | `mobile-app/web/support.html` 旧テキストのみ。複数選択input・個別削除リスト追加 | PASS |
| S02 | ボタン押下から通知まで追跡 | `support.html` upload → `gasApi.js` RPC → `supportAttachments.js` private R2 → `support.js` email | PASS |
| S03 | 入力と異常ファイルを横断確認 | `support.html` MIME/サイズ/件数、`supportAttachments.js` size/magic/ID再検証、負例テスト | PASS |
| S04 | 認証済みstore/actorの再検証 | `API.pageReady({auth:'required'})`、GAS `RPC_AUTH_ONLY`、R2 metadata `matches`、異店舗テスト | PASS（ソース） |
| S05 | 失敗・再送・二重通知 | `support.html` `supportRequestSig` / `uploadedRequestId`、backend completed HEAD、`sendPlatformEmailIdempotent` | PASS |
| S06 | 旧テキストのみ送信と依存データ | `attachments:[]`を処理し、`attachedFiles(null/[])`は空配列を返す。既存`support_request_test.mjs` | PASS |
| S07 | iPhone系の画面幅・操作性・locale | file inputは複数選択、削除44px、リストの名前折返し、aria-live、日英文言を確認（実機は別） | PASS（ソース） |
| S08 | async中の状態と後始末 | UIのbusy + ファイル/本文/カテゴリ操作固定、`try/catch/finally`、成功時のみクリア、失敗保持 | PASS |
| S09 | 肯定・否定・リトライテスト源を精査 | `test/support_media_attachment_ui_test.mjs` 画像/動画・削除・異常値・英日・再送、backend別テスト | PASS（ソース） |
| S10 | dirty差分と変更の最小性 | 既存AIメニュー等の差分は開始前からdirtyとして隔離。新規変更はsupport画面・backend関連に限定 | PASS |

## 横展開レビュー10観点（H01–H10）

| ID | 別起点からの追跡 | 観測した根拠 | 判定 |
| --- | --- | --- | --- |
| H01 | Android配布起点 → 画面 | `capacitor.config.json` とNative一次ソース `mobile-app/web/support.html` を参照。別Android実装なし | PASS（ソース） |
| H02 | iOS配布起点 → 添付タイプ | 同じNative HTML、iPhone写真HEIC/HEIFと録画MOV、File.slice + 共通 `API.fileToBase64` | PASS（ソース） |
| H03 | Web本番ページから逆引き | `docs/yuwaku/` に`support.html`なし。管理Native内独立サポート導線のみ | PASS（対象外確認） |
| H04 | Web TEST / publicから逆引き | `docs/yuwaku/test/` / `docs/public/` に同じサポートフォームなし、既存Webの別お問合せと混同しない | PASS（対象外確認） |
| H05 | 管理メニュー/ヘッダーから入口確認 | `manage.html` と `index.html` から`support.html`、共有Help/言語/更新/戻る保持ゲート | PASS |
| H06 | APIルーターを逆向きに追跡 | Hybrid Router → Control → 共通Gateway（B modeも）/tenant → GAS RPC・署名GET。private R2は店舗へpin | PASS（ソース） |
| H07 | SQL/保存・公開配信の逆引き | D1に添付バイナリを追加せず既存store-scoped idempotencyを使用。R2`private/support`を`/images`で拒否 | PASS |
| H08 | 言語切替と送信後メッセージ | 静的label・動的削除ラベル・status・placeholder・メールカテゴリの日本語/英語を別々に確認 | PASS |
| H09 | role・plan・offline・境界逆引き | ログイン必須、support独自のPro制限なし。未送信ファイルは端末に保持、サーバーで他store/他actor参照拒否 | PASS（ソース） |
| H10 | 変更後に旧パターンの逆引き | `submitSupportMessage`/ `support.html`/ `support-attachments` の使用元を検索。独立フォームの取りこぼしはなし | PASS |

上記は**静的ソースレビュー結果**であり、iOS/Androidの実機確認・実環境にアップロードしてダウンロードできた正式なQA判定を意味しない。

## ローカル試験と残件

- Native画面の画像+MOV 2件アップロード、送信失敗→同じID再送成功、削除、非対応ファイル/上限拒否、日英：`node test/support_media_attachment_ui_test.mjs`。
- 旧サポート画面/通知・browser/landscape・API処理の回帰：`node test/android_qa_support_language_test.mjs`、`node test/support_request_test.mjs`、`node test/frontend_offline_audit_regression_test.mjs`、`node test/mobile_navigation_test.mjs`、`node test/android_qa_remaining_landscape_ime_regression_test.mjs`、`node scripts/ci/critical-ui-preservation-gate.mjs`。
- R2本物でのmultipart/URL受信とResendメールクリック、実機写真ライブラリ/MOV選択、他店舗・他機種での正式QAは**NOT_RUN**。OS正式PASS増分0。
- サーバーmock R2・Control共通経路のローカル証拠：`node test/support_media_backend_test.mjs` **40/40 PASS**、`node test/support_request_test.mjs` **8/8 PASS**、`node test/common_tenant_control_internal_boundary_test.mjs` **8/8 PASS**、`node test/common_tenant_gateway_e2e_test.mjs` **251検査PASS**、`node test/common_tenant_guest_route_boundary_test.mjs` **12/12 PASS**。Nativeの画像/動画複合UIと曖昧再送のテストもPASS。
- 保持済みR2添付の自動削除期限は本件では設定していない。30日後に署名リンクは失効するが、保存ファイル自体のretention運用は本番公開時に別途定義が必要。未完了stagingは既存アップロード時の期限超過パージをベストエフォートで実行する。

## 2026-11-05 本番リリース実施証跡

- **Git**: 本件とAIメニュー関連の未コミット25ファイルを `ed0c06fcc28c93adf6f53c8ceb59466d4dbb69dc` として `main` へコミットし、`origin/main` へプッシュ。並行して追加されたiPhone実入力の同等性ゲートは先行コミット `e0efc68` として本番リポジトリに存在。
- **Worker**: 現行共有構成のみを再デプロイ。非公開共通 `izakanpai-common-gateway` Version `49f7a3f3-60a9-4fef-a64f-3a56542cc096`、`izakanpai-control-plane` Version `2798c214-673f-4f18-9d08-684ba221ca36`、公開 `izakanpai-api` Version `fdc48c0b-515a-4c16-bb8b-6de0d317d3f3`。3つともWrangler deploy exit0、独立した `deployments status` で新Versionが各100%。
- **物理分離/正常系**: 最新の稼働店舗13件から共通Gateway設定を再生成（各店舗独立D1/R2）。本番R2 owner GET **13/13 PASS**、公開Router `/health` HTTP 200、13店舗× `bootstrap`・`getMenu`・`getSettings`・`getTables` の匿名公開**読取52/52 PASS、0 FAIL**。R2/メールへの実添付アップロードは行っていない。
- **source QA**: 正本の画面監査・フロントJS監査を新しい画面/ソースから再生成後、`node scripts/run-project-test-pipeline.mjs` の**208/208工程が一括PASS**、Git pre-commit UI保全24/24 PASS。公式端末QA PASSは増えていない。
- **配布の境界**: iOS/Android署名ビルドとTestFlightは未実施。Worker反映が成功しても端末アプリに新しい `support.html` は自動同梱されないため、利用者側の新規ビルドで初めて添付UIが使える。公開前の実端末送信、Resend到達、署名URLダウンロード、保管期限設定は未検証・残条件。
