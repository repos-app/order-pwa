# AIメニュー取り込み v23 — 実Gemma・アプリ共通経路検証（2026-11-07）

## ゴールと比較結果

同一の原本 menu.pdf 由来の5ページ、55商品を使用。

| 指標 | 直近本番v20 | 隔離v21 | 隔離v22 | 隔離v23 |
|---|---:|---:|---:|---:|
| 認識 | 55 | 55 | 55 | **55** |
| 販売中 | 36 | 29 | 45 | **45** |
| 仮登録 | 19 | 26 | 10 | **10** |
| 商品名・金額・販売単位一致 | 未測定 | 54/55 | 55/55 | **55/55** |
| 日英名・日英カテゴリ・金額の全項目一致 | 未測定 | 50/55 | 49/55 | **48/55** |
| 登録失敗 | 0 | 0 | 0 | **0** |
| 正解データと一致しない販売中商品 | 未測定 | 未判定 | 0 | **0** |

モデル出力には揺れがある。v23の全項目一致がv22より1件減ったのは、仮登録へ隔離されたNachosで日本語名「魅惑」と原本「誘惑」が異なったため。販売中45商品は、日英名・両カテゴリ・価格・販売単位すべて原本正解と一致する（表記上の空白・中黒・アポストロフィは正規化して比較）。

## アプリと同じ処理、および隔離した範囲

ユーザーPDFの画像に対応するアーカイブラスター画像5枚についてmanifest SHA照合。アプリと同じ画像変換／四分割拡大機構を使用。Cloudflare Workers AI の実Gemma 4に送信し、一次・二次推論および必要なカテゴリcrop解析を行った。アプリが使う同じ関数 stagePage、startJob、runPage、prepareRegistration、registerOne、publishCompletedBatch、jobStatus により、ページ単位の確定、ポイント処理、仮登録判定、メニュー保存を実行した。

安全のため、**実際のCloudflare本番Workflowインスタンスとユーザー店舗DBでは実行していない**。顧客側D1の代わりに本番と同じテーブル・SQLを備えたSQLiteインメモリテストDB、R2の代わりにテスト用メモリMap、Workflow起動の代わりにスタブを利用した。実Gemma・アプリの共通サーバー処理は本物だが、ネイティブiPhone画面操作や本番Workflowランタイムの正式検証ではない。本番顧客データとAIクレジットの変更は0。

## 共通修正

- src/menuDocumentImport.js：二次Gemmaがグラス／ボトルと同額の余剰single価格を加えた際、厳密な価格・単位証拠がある場合のみ余剰価格スロットを除外。元金額は推測で変更しない。
- 同ファイル：商品がビール等であるという理由だけで印字のない単品価格をボトルへ変換しない。単品ページの形式、名称・カテゴリ・価格・印字マーカーの一致を照合する。
- src/menuCategoryCropAudit.js：複数商品に共通する日本語カテゴリを、異なる2画像領域の独立した見出し読み取りで確認した場合にのみ、分類警告を解除。
- scripts/menu-ai-live-workflow-quality-gate.mjs：同一画像SHA・解析版・モデル・処理完了・全件一致・誤自動登録ゼロを評価するCLI品質ゲートを追加。従来49/55の完全一致に対し、人確認に隔離した項目のランダムな1件分のみを許容する最低48/55とする。販売中の誤登録は1件も許容しない。
- package.json：品質ゲート実行コマンドと、ゲート経由の共通Workerデプロイ専用コマンドを追加（デプロイ自体は未実施）。

## 実際のカテゴリ回復5件

v23の2ページ目で、日本語見出し「ジャパニーズウイスキー」を拡大領域tile 0・2双方から確認。Yamazaki、Hibiki、Hakushu、Chita、Suntory Kakubinの5商品についてカテゴリに関する警告を除外。cropで確認した実件数は5件。その他の警告を無条件に除外していない。

## v23に残った仮登録10件

- SUI Gin & Soda：日本語カテゴリの濁点の疑い
- Jose Cuervo Especial Gold / Jose Cuervo Large / 1800 Silver 750ml：日本語カテゴリの確認不足
- Jinro Chamisul - Various Flavors：ソジュのカテゴリの独立確認不足
- Chivas：日本語名を二次画像で補ったが独立根拠不足
- Nachos：原本日本語名と一次・二次の読み取りに不一致
- Japanese Curry Rice / Fried Rice / Mazesoba：日本語の「〆の一皿」の先頭1文字、英語見出し印字の有無が不確実

## 実行と残件

- ローカル自動テスト：test-results/menu-ai-v23-local-regression-20261107.log。98 PASS、0 FAIL、1 SKIP（本物のGemma実行は個別に行う）。
- 実Gemma 5ページ／共通アプリサービス関数による隔離DB一貫試験：test-results/menu-ai-v23-live-app-flow-20261107.log。1 PASS、0 FAIL、実モデル11呼出、実登録45件・仮登録10件・失敗0件。
- 各商品・理由・モデル出力の証拠JSON：test-results/menu-document-cloudflare/real-input-20261104/live-v23-isolated-full-workflow-20261107.json。Git対象外のローカル証拠。
- 品質ゲート：npm run test:menu-ai:real-workflow-gate。初回の49/55厳格条件でFAIL→不確実品が隔離済みであることを確認し、安全な1件の揺れを許容したゲートではPASS。公開45件に原本不一致0件。
- 本番構成Workerのdry-run：test-results/menu-ai-v23-worker-dryrun-20261107.log。正常終了0。
- **未実施**：実機iOSの画面操作、本番Cloudflare Workflowインスタンスの起動、正式OS QA、git commit/push、本番Workerデプロイ。従って現時点では本番のyuwakubarには改善コード未反映。
