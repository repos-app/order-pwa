# izakanpai AIメニュー取込｜言語補完による仮登録大量発生の恒久対策

2026-11-07 PHT。検証店舗 `yuwakubar`、選択PDF `Final menue.pdf`、iPhoneのYuwaku Bar Owner画面で、商品名が英語のみのカクテルに多数の仮登録が発生した事象。

## 実データによる原因確定

- 物理D1 `izakanpai-yuwakubar` を read-only 照合。全35商品中仮登録17件、販売中18件。
- 仮登録17件を `menu_items.ai_review_reasons_json` で分類: `missing_name_translation`のみ10件、`category_english_disagreement` + `missing_category_translation` のみ7件。
- 10件は最初の画像OCRで正しい英語名・価格を取得し、2回目のGemmaが日本語名の印刷不在を確認したが、カタログ用の `translatedNameJa` が空欄。名前は `name=name_en` のまま。
- 7件は `JAPANESE SAKE COCKTAILS` の見出しを最初のOCRが日本語カテゴリ欄に入れ、英語カテゴリ欄を空欄にした。2回目は同一の英語カテゴリを正確に返しているのに、列の誤りを復旧できず、英語のまま保存された。
- ジョブ `scan-5de2dbd1-fffc-4643-a1d5-17384178be45` が27件認識・10件販売登録・17件仮登録。次の同一PDFジョブは27件重複・追加AIポイント消費0。前回のサーバー誤失敗表示は別件 `docs/IZK_MENU_AI_FALSE_FAILURE_20261107.md` に記録。

## 既存17件に対する正式データ修正

- 正本OCR結果を、既存の物理D1 AI credit result JSON と商品行を`item_id`・`name_en`・価格で結合して読戻した。条件不一致、異なる価格単位、追加の要確認理由があれば変更拒否。
- 既存共通関数 `recoverMissingCatalogTranslations` をGemma text-only実推論で実行。最初は14件のみ埋まり、独自カクテル名3件は空欄。固有名詞を無理に意味翻訳せず正確なカタカナ音訳を許す汎用プロンプト改善後、17件すべてに日本語案が返った。
- 出力校正: 商品原文英語・価格・カテゴリ英語・item_idを不変にし、欠落していた日本語名10件／日本語カテゴリ7件を補完。あらゆるD1更新について `store_id='yuwakubar'`、元の `item_id`、元のJA/EN/価格/カテゴリ、`status='draft'`、元のレビュー理由をSQL WHEREの完全一致条件にした。
- 変更前 `on_sale=18, draft=17`、変更後 `on_sale=35, draft=0`。**17/17件のJA名/EN名/カテゴリ/価格/status/reviewReasonsを独立D1 readback比較し、差異0**。`ai_credit_wallets.paid_balance=53`で不変、再OCR・追加ポイント消費なし。
- 保存した不変証拠: `test-results/menu-ai-draft-recovery-source-20261107.json`（実行前D1/OCR）、`test-results/menu-ai-draft-recovery-catalog-before-20261107.json`、`test-results/menu-ai-draft-translation-repair-preview-20261107.json`、`test-results/menu-ai-draft-translation-repair-20261107.sql`、`test-results/menu-ai-draft-recovery-catalog-after-20261107.json`。`test-results`はgit-ignoredのローカル証拠で、再実行しない。
- 既存Workflow job台帳の `draftCount=17` は当時の結果として正しく維持。商品一覧の現在の `draft` 件数とは区別し、ジョブ履歴を書き換えない。

## 再発防止 SOURCE

- `src/menuDocumentImport.js`: OCR後の補完段階で、**一次カテゴリJA欄にある英語見出しと二次カテゴリEN欄が厳密一致し、かつ二次が日本語印刷なしと判定した場合**のみ、列をENへ是正。異なるカテゴリ原文や読めない日本語の不確実性は救済しない。
- `recoverMissingCatalogTranslations`: 同じGemma `@cf/google/gemma-4-26b-a4b-it` で**不足分だけを1ページ最大1回のテキスト一括翻訳**。複数商品が共有するカテゴリは1回だけ翻訳。出力はIDと原文の完全一致、言語文字種、元の価格/原文/視覚証拠、明確なレビュー理由により検証。曖昧・欠損・通信失敗・タイムアウト時は従来どおり仮登録。1ページ単位の従来AIクレジット規約は変更なし。
- 英語のみ・日本語のみ両方向の欠落補完に対応。商品名の音訳、カテゴリの自然な翻訳を区別し、実際に印刷された別言語の名前を生成翻訳として上書きしない。
- 既存 `classifyImport`, `registerOne`, Workflow、AIクレジット幂等、Web/iOS共有ソース、店舗別D1/R2を再利用。商品専用の辞書や店舗別例外分岐を増やさない。
- PROMPT_VERSIONは翻訳・カテゴリ修正v29からさらに単価誤読改善を取り込んだ `menu-document-v30-batched-catalog-and-unmarked-unit-recovery` に更新。新ソースで旧OCRキャッシュを誤って再利用しない。
- 実Cloudflare Gemmaとアプリ同一の画像切出しを使った**v29実測**: カクテル20/20、カクテル別ページ7/7、ワイン8/8の名前・価格照合成功。販売可判定は順に14/20、7/7、6/8。初頁の要確認6件を詳査すると、一次がG/B印字のない `single=300/350/320/380`、二次が**金額は一致したまま**G印字を観測せず`glass=同額`に勝手に配置していた。
- この同型不具合に対し、**一次ページがsingle価格、一商品がsingleのみ、二次が単一glass同額、印刷G/B証拠なし、原文EN商品名と英語カテゴリが一致、一次に価格疑義なし**のときだけ二次の単位推測を排除し、単品価格を維持。明示G印字、金額不一致、商品/カテゴリ不一致、単品以外のページ、明示単位をそれぞれ負例でブロック。明示グラス/ボトル価格の意味は変更しない。
- **v30実Cloudflare Gemma・同一アプリ領域切出し・同じメニュー第一ページ**で再検証：一次価格スコープ`single`、認識20/20、原本名・価格20/20、**販売可能20/20／仮登録0**、追加Gemmaテキスト翻訳で10件のJA名を補完、4モデル呼出し。改修前v29は同ページ14販売可/6仮登録（同額をglassへ誤置換）。ローカル証拠`test-results/menu-document-cloudflare/real-input-20261104/live-v30-cocktail-page1-20261107.json`。
- **v30横展開実測**：カクテル別ページ7/7商品検出・英語名/金額一致・自動登録可能7/7／仮登録0。ワイン別形式8/8検出・英語名/金額一致・自動可能6/8／要確認2/8（Moët系の英語名の視覚表記差分、WOODBRIDGEの日本語第二パス確認等）。ワインの不確実な2件を無理に販売中扱いしない。3ページ累計 **35/35検出、35/35英語名/金額照合、33自動候補、2要確認**。`scripts/menu-ai-multi-format-real-gate.mjs` の独立v30実モデル版ゲート **PASS、0 error、exit0**。実行器 `scripts/menu-ai-real-multiformat-probe.mjs` を複数形式で再利用（モデル証拠 `test-results/menu-document-cloudflare/real-input-20261104/live-v30-*-20261107.json`）。
- `scripts/menu-ai-draft-translation-repair.mjs` はモデル呼出しと**SQL作成まで**、自らD1を更新しない。今回の17件には既存の明示許可に基づいて生成SQLを別操作で適用・読戻し検証した。

## 検証・未実施区分

- 既存/追加 `test/menu_document_import_test.mjs` + `test/menu_ai_generic_quality_rules_test.mjs` は**77/77 PASS、0 FAIL**。さらにWorkflow/仮登録ライフサイクル/レビュー規則込みの5ファイル回帰は**111 PASS、0 FAIL、実Gemma 5ページの高負荷テスト1 SKIP**（exit0）。カラム誤配置、ENのみ3商品＋共通カテゴリを1回のGemmaで補完、価格不一致・別商品名・言語違い・通信失敗、single/glass誤分類のすべての負例を実行。
- Gemma本番推論APIへのテキスト一括補完を実実行済み（最終17/17候補、入力データ当時D1の保存証拠）で、一般的なカクテル名と独自商品名を両方カバー。
- 物理D1更新/読戻しは真正に完了。これは**正式iPhone/Android QAをPASSにしたこととは異なる**。
- 新版AIエンジンのWorker本番デプロイ、新規署名iOSビルド/TestFlight配布、実iPhoneの新版JSからの再解析は別工程。許可されていないmobileビルドは実行しない。正式QA PASS増分0。

## 2026-11-07 16時台 PHT｜低コスト化と安全ゲートの追加（①〜③対応）

- ① OCRと翻訳の分離：v30の原文画像2パス、JSONの印刷原文/翻訳別フィールド、検証済み原文に限る不足言語だけのGemmaテキスト一括補完を引き続き共通基盤として使用。既存手順を重複実装しない。
- ② 冗長推論削減：同じページに**原文/二次画像読取が完全一致・他言語の印字不在を確認済み・Gemma生成の翻訳であることを `translatedFields` から追跡可能**なカテゴリ対があり、別の商品でも同一の原文を持つ場合、対訳を安全に再利用する。競合する複数の日本語訳、二次画像不一致、印刷不在を確認できない場合、価格/視覚疑義のある場合、別店舗の既存カタログからの借用は禁止。`reusedTranslationCount` と `catalogTranslationReusedCount` で監査可能にした。余剰のテキスト翻訳対象が0件になった場合は**Gemmaを0回呼び出す**。従来のページ単位クレジットとWorkflowの冪等実行は変更なし。
- コスト削減の証拠：実Gemma v30カクテル20商品のJSONを読み、各カテゴリごとに最後の商品の翻訳済み日本語カテゴリを意図的に欠落させる回帰を実施。5件すべてを元ページにある同一原文の検証済み翻訳から復元し、追加モデル呼び出しは0回（**5件のテキスト補完を1回の実Gemma再翻訳なしで処理**）。これは保存済み実モデル結果からの入力再構成であり、新たなプロダクション推論の全ページで1呼出し削減が保証されたという主張ではない。
- ③ 登録判定安全性： `mobile-app/web/menu-ai-bulk.js` の共通分類で、AIが`price_variant_review`を付け忘れても、glass/bottleの価格スロットがあり印字G/Bまたは独立に証明されたbottle-onlyページ等の根拠がなければ、`price_unit_confirmation_required`で仮登録に固定。明示価格単位がある正しい商品や通常のsingleのみ価格は従来どおり自動登録を許可。金額や単位の勝手な変更はしない。
- 追加テスト：同一ページの共有カテゴリ翻訳を0呼出しで2件補完、対訳競合・視覚証拠不一致・価格相違・印刷有りによる禁止、単位確認の理由欠落時の未承認出版防止を追加。関連8ファイル統合回帰は**133件中132 PASS / 0 FAIL / 1 SKIP（実Gemma高負荷試験）**。さらにv30実Gemmaの保存済み35商品を修正版分類器で読み直し、35/35存在、33自動候補/2要確認、追加モデル呼び出し0、危険な自動候補0。
- 2026-11-07のリリースゲート `npm run test:menu-ai:real-workflow-gate` は最初、v30の**実Gemma 5ページワークフロー証拠が未存在**でFAIL（ENOENT）。ゲートを回避/閾値変更しない。既存のQAランナー＋ローカルCloudflareモデル中継を利用して5ページを改めて実行し、正しい証拠が揃った段階で判定する。
- 同日後刻、既存 `test/menu_ai_workflow_backend_test.mjs` の `LIVE SAME APP FLOW` を `MENU_AI_LIVE_WORKFLOW=1 / MENU_AI_LIVE_OUTPUT_VERSION=v30` で真正に実行し **PASS、exit 0**。実Gemma 5ページは10+9+9+10+17=55商品、各ページ正解照合10/10・9/9・9/9・10/10・17/17、**55/55名・価格一致、日英完全一致49/55、登録50、要確認5、失敗0、モデル呼出13**。アプリと同じ `stagePage→startJob→runPage→prepareRegistration→registerOne→publishCompletedBatch→jobStatus` で隔離されたメモリDBに保存し、最終state=completed・5/5ページ完了、tenant本番DB変更なし、tenant AIポイント変更なし。正本エビデンスは `test-results/menu-document-cloudflare/real-input-20261104/live-v30-isolated-full-workflow-20261107.json`。
- **正式リリース用の2品質ゲートがPASS**：`npm run test:menu-ai:real-workflow-gate` は55件照合・50自動・5仮登録・49件日英完全一致で `status=PASS / errors=[] / qualityGatePass=true`。`npm run test:menu-ai:real-format-gate` も英語のみカクテル7/7自動・別形式ワイン6/8自動（安全な保留2）で `status=PASS / errors=[]`。`node scripts/ci/critical-ui-preservation-gate.mjs` もPASS。これはソースのリリース品質ゲートであり、iOS/Android正式QAのPASSとは区別する。
- 修正後の **Git commit/push・Worker本番デプロイ・iOSアプリ署名ビルド/配布・修正版iPhone実機QAは未実施**。現行コードに対する検証に合格したことと本番反映を明確に区別する。
- Gitコミット/Push、Workerデプロイ、iOS署名ビルドと正式実機QAを同一の「実装完了」と混同しない。操作結果が確認できたものだけ最終報告する。
