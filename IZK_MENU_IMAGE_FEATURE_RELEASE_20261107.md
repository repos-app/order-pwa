# 画像検索V2・AI画像生成（2026-11-07）

## 要求

- メニュー編集画面に「画像検索」「AI画像生成」の明示切替を追加。生成時は自由プロンプト入力。
- 画像検索は Workers AI による検索語補正 → Openverse API 画像検索 → Workers AI 実画像評価。ブランド・商品同一性を優先し、背景や他の小物を理由に不採用としない。画像の採用はユーザー自身が決める。
- AI画像生成は成功1回につき1クレジット。再生成も1クレジット。重複要求の再送は二重課金せず、失敗時は既存台帳から返却する。

## ソース

- src/menuImageSearchA.js: 検索語補正、実画像API、再ランキング。
- src/menuImageSearchHandlers.js: 認証済み店舗ごとの検索、結果キャッシュ、RPC応答整形。
- src/menuImageGeneration.js: AI指示の英語補正、FLUX.1 schnell画像生成、店舗R2への保存。
- src/gasApi.js: searchMenuImagesV2 と generateMenuImage の認証/権限RPC。
- mobile-app/web/menu_editor.html と docs/yuwaku/menu_editor.html / docs/yuwaku/test/menu_editor.html: 二分岐UI、日英辞書、1ポイント同意、結果プレビュー、商品保存。
- 3系統の api.js: 新画像検索のバックグラウンド要求配線。
- 既存 aiCredits.js の menu_photo=1 と aiCreditRuntime.js の予約・精算を再利用。検索は無料。

## QA（開発テストであり正式実機QAではない）

| 検証 | 結果 |
|---|---|
| 方式A検索の自動テスト | 10/10 PASS |
| SQLite台帳とR2モックによる1ポイント課金・重複/失敗復旧 | 8/8 PASS |
| iOS/Web本番/WebテストのUI導線と再送ID | 12/12 PASS |
| 既存画像取得回帰 | 23/23 PASS |
| AI課金失敗時の既存回帰 | 12/12 PASS |
| GAS互換API広範囲回帰 | 561/561 PASS |
| 共通ソースゲート | 21 PASS |
| 日英自動UIゲート | PASS（不足辞書2件を修正済み） |
| 重要UI保存ゲート | PASS |
| Cloudflare Workers AI実画像生成 | JPEG出力に成功。実店舗の残高/R2は変更していない |

## 注意点・今後

- 実生成モデルに「唐揚げ4個」を指定した画像は、2回の実行で5個程度に見えた。**生成個数の厳密一致は未達**。別の上位モデルはAI Gateway credits不足で実行不可。プロンプトによる完全保証はない。
- 画像生成の課金は、R2保存まで成功した時点で確定する。画像を商品として採用せず破棄しても、生成済み1回分のクレジットは消費する。
- 本番配備、Gitコミット/プッシュ、実店舗のクレジット・R2実接続・実機正式QAは未実施。未コミットの他作業差分は破棄していない。
- 次は共通Gatewayへの統合反映、teatで生成→財布→R2→メニュー保存の実RPC証明、iOS/Androidビルド配布と正式QA判定が必要。
