# izakanpai｜メニューAI 汎用領域再解析・手書き対応 SOURCE 実装／QA（2026-11-04 PHT）

## 目的と受入条件

ユーザーは、YUWAKUの5ページ・55商品だけに最適化せず、手書き／撮影画像／印刷／日本語・英語混在／複数列／複数単価に横断的に対応する読み取り精度改善を求めた。正常に認識できた新規商品の一括登録と、判断困難な商品のみ手動確認する既存運用を維持する。モデル切替、読み取り箇所、モデル使用量、実際の精度が可視化／評価可能であること。

**今回の実装はローカルソース修正まで**。Worker本番デプロイ、アプリ署名ビルド、TestFlight公開、Git commit/push、端末正式QA判定は実施していない。元PDFによる「新方式」の実Workers AI認識結果は未取得であり、**精度向上率は未計測**。後述のローカルテストPASSをOCR精度PASSとして報告しない。

## 現行ソースへの共通追加（ケースごとの特例なし）

1. **一次読み取り時の領域検出**：同一ページ全体から `bbox`（0〜1000の正規化座標）と `textStyle`（handwritten / printed / unknown）、ページの `layoutKind`（printed / handwritten / mixed / unknown）を出す汎用プロンプト付録を追加。管理画面から公開済みの基本プロンプト本文は変更せず、実行時のみ付録を足す。
2. **候補画像作成**：`mobile-app/web/menu-ai-regions.js` を共通モジュールとして追加。PDF・写真とも、汎用の重複2×2領域を最大4枚用意。必要時のみ、一次モデルが出した位置情報と交差する領域を最大2枚選択し、**既存の第二推論に同時投入**。位置情報が使えないときのエッジ量は弱い代替指標であり、文字の正確さそのものを証明しない。以前の「常にページ上下を再送」の固定方式は廃止。
3. **モデル使い分け**：通常の印刷ページは既存Gemmaで再照合。手書き判定または入力に不確実な箇所があれば、Cloudflare提供の `@cf/mistralai/mistral-small-3.1-24b-instruct` を第二視覚モデルとして利用。既存と合わせて原則 **最大2モデル呼出／ページ**。有効なWorker環境変数 `MENU_DOCUMENT_RECHECK_MODEL` は許可した2モデル名のみ採用する。
4. **照合と誤登録防止**：二回目に日本語だけでなく独立して見えた英語名・カテゴリ・価格（single/glass/bottle）を返すよう指示。二回の価格読取が異なる場合は元の金額を勝手に更新せず、人の確認へ。手書きは異なる2モデルの日本語・英語・カテゴリ・すべての単価が一致した場合だけ `handwriting_review_required` を解除。**一次で日本語が欠け、二次だけが認識した場合は単独観測なので自動確定しない**。
5. **取りこぼし対応**：一次で0件返ったページは、通常の空白ページ扱いにせず別モデルで同ページを一度だけ読み直す。ただし後者単独で発見した商品は `recovered_from_empty_primary_requires_review` として登録保留。
6. **計測**：モデルが返す使用トークン（存在する場合）／モデル呼出回数／追加参照した領域画像枚数／推論所要時間をWorker結果に含め、メニュー取込のローカル結果表示に集計。旧Workerから値が返らなければ0秒・0回を捏造せず非表示。
7. **課金・分離**：従来の `analyzeMenuImageWithCredits` → 認証storeId → `executeCreditedAi` で **1ページ1クレジット**。追加領域画像は同じページ1リクエストに含め、ハッシュには画素・座標・edgeScoreを含める。領域は最大4件、各JPEGデータ長／bbox／edgeScoreを課金前に検証する。失敗時の既存refund・冪等・途中停止契約を継承。
8. **オフライン**：Native共通 `mobile-app/web/sw.js` のcache世代をv321に上げ、新規領域モジュールと既存取込・PDF.js関連のシェル7資産を同梱対象に追加。105/105のSHELLパスが存在。

### 11月4日 続行対応（全ページの見落とし／高解像度写真／課金保護）

- **既存の一次認識を前提にしない検出率改善**：二次推論のプロンプトにページ全体の独立走査を追加。一次の項目一覧に含まれない、実際に見える「名称＋少なくとも1価格」の行を最大15件 `additionalItems` として返す。正規化した日英商品名と高重複するbboxにより既存商品や拡大コピーを除外し、`recovered_from_secondary_requires_review` を付ける。**追加発見は自動登録禁止**。一次0件からの独立再走査も維持。二次の追加項目が不正なら追加分のみ捨てて警告し、一次の読み取りを巻き添えにしない。
- **請求前に無効画像拒否**：`aiCreditActions.js` の共通分析APIへ、元画像／追加JPEG双方のbase64エンコーディング事前検査を追加。元画像に不正文字があると `invalid_image_encoding`、追加画像が壊れていると `invalid_menu_detail_image` を返し、`executeCreditedAi`（残高予約）へ進まない。
- **大きな撮影画像を処理**：汎用領域画像の最大辺を1280pxへ抑え、JPEG長さが上限を超える場合に品質を減らして調整。過大な画像はその領域のみ省略し、ページ全体を拒否しない。Chromium実canvasで2400×3200pxの高解像度領域を作成し最大2,400,000base64文字以内を検証。
- **見落としの可視化**：AI結果の `count` は再走査で増えた商品の数も含めて計上し、確認画面に「再確認で追加発見：X件（要確認）」と計測値を表示。一次・二次推論の処理時間・使用トークン計測も継承。版識別 `PROMPT_VERSION=menu-document-v7-adaptive-layout-recovery`。
- **独立レビュー時の安全修正**：一次で日本語が欠け、二次だけが読んだ手書き名をAI二者一致とみなさず未確認にする。認証済み店舗や既存メニューを無条件で上書きしない。ユーザーが要求する自動一括登録は、既存の安全判定を通るものだけ継続。

## 既存の機能を維持

- `menu-ai-bulk.js` の正常読取の一括保存、疑わしい読み取りだけレビュー、Free上限10、類似重複／既存商品上書き抑止、店舗認証、失敗時継続を再利用。全画面共通ヘッダー／課金購入／他画面のOCR機能を無闇に書き換えない。
- 人の最終照合のための `test/fixtures/yuwaku-menu-image-only-20261103.tsv`（5ページ・55商品）をそのまま再利用。これ以外のメニューに特定商品名・価格をハードコードしない。
- `scripts/menu-document-quality-compare.mjs` の既存評価計算へバイリンガル正解TSV評価を追加。日本語名・英語名・カテゴリ両言語・単価種類・全項目正答率・検出率・余計な項目数をページ別に算出。結果は外部から指定した原本SHA256および有効な実モデル試行記録を満たした場合のみ `EVALUATED`。見かけだけのmockとSHA不一致は `INVALID_EVIDENCE`。

## 自己ソースレビュー S01〜S10（独立観点・各ソースと負例を点検）

| ID | 観点・確認箇所 | 判定 |
|---|---|---|
| S01 | `menuDocumentImport.js`：古い公開プロンプトを直接改変せず、ランタイム付録で汎用のレイアウト契約だけを追加（公開・内部リレーの整合性） | SOURCE PASS |
| S02 | `normalizeMenuBBox`：負値・範囲外・ゼロ面積・非整数を拒否。ページの画像位置を信頼せず課金権限とも分離 | SOURCE PASS |
| S03 | `menu-ai-regions.js`：縦横画像の各象限へ内容非依存の候補を作る。上下2帯だけに固定されない | SOURCE PASS |
| S04 | `selectRecheckRegions`：不明商品／手書き／価格疑義の原位置を優先、座標がなければエッジ量の有限フォールバック | SOURCE PASS |
| S05 | `MAX_CLIENT_REGIONS=4`／`MAX_RECHECK_REGIONS=2`／画像サイズ検証／余計な追加推論なしを照合 | SOURCE PASS |
| S06 | `MENU_DOCUMENT_RECHECK_MODEL` を2モデル許可リストに限定。手書き・不明はMistral、それ以外は通常経路 | SOURCE PASS |
| S07 | `parseJapaneseLabels`／`reconcileJapaneseLabels`：日本語単独読取を偽の二重一致と見なさず、価格差・英語差を要確認 | SOURCE PASS |
| S08 | `analyzeMenuDocumentPage`：一次0件時は一度だけ別モデル、一次で一部見落とした項目は二次の独立全ページ走査と重複排除、両者とも自動登録禁止 | SOURCE PASS |
| S09 | `aiCreditActions.js`：追加画像4件・位置メタデータ・ハッシュ、元／追加画像両方のbase64不正を**請求前**に拒否、認証店舗の継続 | SOURCE PASS |
| S10 | `modelTokenUsage`／`pageModelStats`：実測メタデータのみ表示、旧Workerでは架空のゼロ使用量を作らない | SOURCE PASS |

## 横展開ソースレビュー H01〜H10（10独立観点）

| ID | 範囲・ソース | 判定 |
|---|---|---|
| H01 | Android/iOS両アプリの共通 `mobile-app/web/menu-ai-import.js` 入口に領域処理が実装され、OS専用分岐が存在しない | SOURCE PASS |
| H02 | Web本番／TESTのメニューはこのNative PDF取込入口を持たず、既存画面に実行できないボタンを勝手に追加しない | SOURCE PASS／対象外理由記録 |
| H03 | PDF.jsのページ画像・手元のJPEG/PNG/WebP両方に `menuRegionDetailImages`、最大1280px/2.4M base64文字を共通適用 | SOURCE PASS |
| H04 | 画像単独／英語だけ／日本語だけ／日英併記の名前とカテゴリは従来の `menu-ai-review.js` と手動保存フォームに集約 | SOURCE PASS |
| H05 | G/B併記およびボトルのみの金額は従来の `menuRegistrationDraft` と既存選択肢で保持、価格不一致はレビュー | SOURCE PASS |
| H06 | `menu-ai-bulk.js` の既存重複・Free上限・createOnly・未確定応答は元のサーバーガードを再利用 | SOURCE PASS |
| H07 | 管理プロンプトの公開済みバージョン／内部リレーと `MENU_PROMPT`・`JAPANESE_LABEL_PROMPT` の原本文字列互換を確認 | SOURCE PASS（初回差分発見・付録移動後再試験） |
| H08 | スキャン0件、スキャン一部見落とし、二次モデル失敗、無効bbox／base64、不正追加スキーマ、偽合意、金額差は自動登録不可の負例 | SOURCE PASS |
| H09 | `mobile-app/web/sw.js` の新モジュール7資産／全105個の参照ファイルが実在することを確認 | SOURCE PASS |
| H10 | データ評価にライブD1書込み・正式QA runnerのPASS転記を使用せず、実モデル証拠のない5ページをNOT_RUNとして保持 | SOURCE PASS |

## QA証跡・残件

- Node／Chromium：`test/menu_ai_adaptive_regions_20261104_test.mjs` を新規追加。実canvasで4領域のJPEGを生成し、手書き価格の不一致、同一モデルの偽合意、一次0件復旧、位置情報不正、オプション・自動登録のガードを確認。
- 隣接menu/document/prompt/translation/browser全回帰 **97/97 PASS・0 FAIL・0 SKIP**（`test-results/menu-document-cloudflare/adaptive-20261104-local-regression.log`、exit0）。課金budget/wallet/画面/店舗分離等の独立した回帰 **57/57 PASS・0 FAIL**（同日ローカル実行、exit0）。合計154件の**ローカル**テスト（正式QAとは別）。最初に既存プロンプト厳密一致が失敗したため、ベースプロンプトを変更しない方式に切替後PASS。
- YUWAKU 5ページ原本は `test-results/menu-document-cloudflare/adaptive-20261104-quality-report.json` に記録：**55正解商品、EVALUATED 0ページ／NOT_RUN 5ページ、OCR実精度null**。スコアラー・構造・UIテストはOCRモデル実行ではない。
- 本番での真の測定には、同一原本と手書きサンプルの版管理、Cloudflare両モデル実行、ページ別の前後比較、課金／請求金額・latency観測が必要。モデル選別の改善効果はベンチマークで優越が立証されるまで保証できない。
- 署名iOS/Androidビルド、ストア配布、正式OS QA再実行は **BUILD_EXPLICIT_USER_AUTHORIZATION_REQUIRED**。承認なしのcommit/push、Worker deploy、テナントD1商品保存は実施しない。
