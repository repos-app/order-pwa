# IZK-UT-098 — 初回設定・サンプル案内重なりのソース修正

2026-10-25 / 対象: `mobile-app/web/index.html`、`manage.html`。

## 発生と原因

iPhone TestFlight 初期設定 Step 3 の「サンプルメニュー3品を追加する」で、説明文の背景が各行に重なり、直下の「まずは店員端末1台だけで始められます」に侵入して見える。
原因は `.setup-note`（padding、背景、margin を持つブロック向け CSS）をネストした **inline span** に指定し、折返しの各行に背景と padding が描かれたこと。高さの十分な block を確保できていない。

## 変更

- 本来の tax/country/store の `.setup-note` は触らず、チェック付きサンプル案内のみ `.setup-sample` を独立した flex card にする。
- タイトルと説明はそれぞれ block flow とし、説明を `.setup-sample-description` に分離。
- テキスト列の `min-width:0` と `overflow-wrap:anywhere` で狭い幅にも対応。
- チェックボックスの ID/制御/文言、ステップ数、保存処理を変更しない。
- 同一ソースである index / manage の両方に適用し、既存の Capacitor 手順 `npm run mobile:sync` で iOS/Android 資産へ同期。

## 修正後のソース再レビュー10項目（実施・各PASS）

1. 原因の inline padded `span.setup-note` をサンプル領域から排除。
2. サンプル説明を `display:block` とし、行ごとの背景・padding をなくした。
3. タイトルを `display:block` とし、説明までの6px gapを独立させた。
4. チェック付きカード全体を独立した `label` に維持。
5. `setupSampleMenu` ID を変更せず、既存のクリック/保存処理と接続。
6. テキスト列を `min-width:0` とし、列幅縮小時のはみ出しを防止。
7. 長い英単語を含む翻訳にも `overflow-wrap:anywhere` を適用。
8. カード下 `margin` を確保し、次の `.setup-use-guide` と独立。
9. `.setup-shell` 既存の `max-height:100%; overflow-y:auto` を維持。
10. `.setup-actions` と Save/Back 操作、税率・サービス料入力を変更しない。

## 横展開10観点（各 index / manage でブラウザ描画検証、計20 PASS）

1. 320×568 日本語。
2. 360×640 日本語。
3. 375×667 日本語。
4. 390×844 日本語。
5. 430×932 日本語。
6. 320×568 英語（長文説明）。
7. 360×640 英語（長文説明）。
8. 390×844 英語（長文説明）。
9. 568×320 日本語（低い横向き画面）。
10. 720×800 英語（タブレット相当）。

`node --test test/setup_modal_layout_regression.test.mjs` は実ソースから DOM と CSS を抽出し、**説明とタイトル・次の案内・フッターとの境界、横溢れ、スクロール、チェックボックス操作、保存ボタン到達**を各画面サイズで確認する。結果 **20 PASS / 0 FAIL**。

## 配布・検証の状態

- `npm run mobile:sync`: **成功**。iOS/Android と mobile-dist のソース同期。
- `node test/distribution_parity_test.mjs`: **PASS**。各 Native 101ソース、iOS/Android間 103資産が一致。
- `node test/sample_demo_test.mjs`: **37 PASS**。サンプル作成・削除・デモ会計の既存仕様に変更なし。
- `node test/mobile_navigation_test.mjs`: **FAIL**（1292行目: 新規登録直後のメール確認・認証トークンに関する既存アサーション）。今回のサンプル表示チェック到達前。独立したテストで今回の回帰は検証済み。既存の失敗を PASS に変更しない。
- **iPhone TestFlight / Android実機 / 公式QA台帳の正式判定は未実施**。本ドキュメントと20件の確認はソース・オフラインブラウザの検証であり、正式OS QA PASS件数には加算しない。
