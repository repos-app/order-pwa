# 方式A「AI補正 + 画像検索API + AI再ランキング」実検証（2026-11-07）

## 要件変更（2026-11-07、ユーザー確認済み）
- **商品写真の背景・構図・他の小物は一致判定の条件にしない**。ブランド名・実際の商品種別・指定された銘柄の一致を優先。
- 「モエのボトル＋グラスやブドウ、黒背景」は検索候補として表示してよい。店舗側で統一したい場合は自店商品の撮影画像を登録する。
- 画像検索はAI推薦を出すのみで、**ユーザーが選択する**。自動画像保存しない。
- `src/menuImageSearchA.js` のAI判定から `whiteBackground`、`noOtherObjects`、`frontFacing`、`fullBottleVisible` の必須条件・採点を廃止し、`requiresUserSelection=true`、`autoSelectReady=false` とした。以前の白背景前提の計測・所見は旧評価基準であり、新仕様の合否条件には使わない。

## 目的と要求
- 店舗のメニュー画像検索「モエエシャンドン」について、現行Pixabayとは異なる**方式Aそのもの**を、ローカルモックではなく実検索サービス・実Cloudflare Workers AIで再現する。
- 比較対象はユーザー提示の「Moët & Chandon Impérial Brut」の**白背景・正面のボトル単体**商品画像。
- **商品種別・バリアントは未指定**の入力であり、補正段階では「Impérial Brut」を勝手に確定しない。参考写真は検索入力ではなく、人間側の期待画像として用いる。

## 実装（既存アプリと分離した非本番PoC）
- 共通ロジック: `src/menuImageSearchA.js`
- Cloudflare Workers AI 接続: 既存の `@cf/google/gemma-4-26b-a4b-it` モデルを利用（テキスト補正・画像理解）
- 画像検索API: **Openverse** `https://api.openverse.org/v1/images/` の実API。匿名上限が1回20件のため `page_size=20` に修正。非商用ライセンス（`by-nc` 等）を除外、URL重複を除く。
- 検証入口: `scripts/menu-image-search-a-preview-worker.mjs` + `scripts/menu-image-search-a-preview.toml`。一時ローカルWrangler Workerがモデルを実行し、Openverseへ実HTTPアクセス。
- 実API実行: `node scripts/menu-image-search-a-live-call.mjs`（ローカルWrangler `127.0.0.1:8790` 接続）、詳細 `test-results/image-search-a-live-moe-20261107.json`。
- 独立検証: `node scripts/menu-image-search-a-live-node.mjs`（同一の共通ロジックをNodeホストで実行し、Cloudflare AIは一時ローカルWranglerのAI bindingを経由）、結果 `test-results/image-search-a-live-moe-20261107-node.json`。
- 自動テスト `node test/menu_image_search_a_test.mjs` 8/8 PASS。現行のプロジェクト実行リストにも登録。

## 実API結果（最終Worker実行）
- 入力 `モエエシャンドン`。AI補正結果 `Moët & Chandon`、`productVariant` は空。
- AI検索語 `Moët & Chandon champagne bottle`（2件）+ `Moët & Chandon`（20件）。
- Openverseから22件、ライセンス・重複・表示条件後に10件。Workers AI Visionで4件実画像を評価。
- AI自身がブランド一致としたものは2件。ただし2件目はプロモーション展示画像であり、**商品として採用すべき画像ではない**。画像の説明が展示を示すため、自動採用を抑止する。
- 第1候補：`Moët & Chandon Champagne grapes`、[提供元](https://www.rawpixel.com/image/6112343/photo-image-public-domain-plant-green)、[検索API返却のプレビュー](https://api.openverse.org/v1/images/d92c30cb-41c9-4e63-bdf0-7e0772ef5962/thumb/)、検索結果ライセンス `cc0`。実画像にはモエの金色ネック／赤い紋章／ブリュット・アンペリアルのラベルが見える。ただし黒背景でグラスとブドウが添えられている。AI算定85/100。
- **白背景＋ボトル単体の商品写真：確認された理想画像は0件**。 `preferredPresentationMatches=0`、`autoSelectReady=false`。
- 最終ローカルWorker全段実測：HTTP 200、`complete=true`、所要約11.8秒（Workers AIの処理時間によって変動、初回約28秒の実績もある）。これは品質・速度SLAを保証しない。

## 重要な区別
- **実行済**：同じコードが検索条件正規化 → Openverse実画像検索 → Cloudflare Workers AI画像再評価の3段階をローカルWorkerから完了。テスト用モデル応答・検索レスポンスの置き換えはしていない。
- **未実施**：既存iPhoneアプリの `searchMenuImages` RPCへの組込み、iOS UI切替、ユーザー店舗での実機QA、本番Workerのデプロイ、事業者ライセンスの最終確認、利用者への表示、候補画像の保存。
- **未達**：ユーザー例の白背景／単独ボトルと一致する画像。Openverseのみでは品揃えが不足する。Brave Image Search APIを正式候補として調査したが、既存の中央WorkerにBrave専用Secretは存在せず、**Braveの実画像検索APIは未実行**。Google Custom Search JSON APIは新規顧客受付終了、2027-01-01移行期限のため採用しない。
- ライセンス表示はOpenverseのメタ情報であり、実際の著作権・商標・使用許諾の法的保証ではない。店舗画像へ自動保存しない。

## 次の本番化条件
1. 利用許諾・コストの見通しを確認した高網羅な画像検索API（Brave等）の運営側APIキーを取得し、安全なSecret経路に設定する。検索APIの実呼出・単体ボトル再現率を再測定する。
2. 既存の店舗認証RPCと共通Workerに統合し、検索・生成のUIを分離。AI生成は別プロンプトと明示料金にする。検索画像は利用者が明示的に選択し、出典・ライセンスを表示する。
3. 既存QAパイプラインと実機で「ブランド一致・別ブランド排除・理想構図・429リトライ・テナント分離・中断復旧・保存/取消」を評価する。根拠のない正式PASSは付けない。
