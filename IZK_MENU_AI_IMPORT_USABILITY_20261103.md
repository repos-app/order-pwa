# izakanpai / 2026-11-03 メニューAI読取・ヘッダー修正

## 2026-11-03 18:54 PHT 原本PDFを受領後の追跡（前段の「原本未提供」を更新）

- `menu(1).pdf`の提供を受けた。SHA256 `3b8d5f652a6788e4532f13f952671f6cf7f292823b6813404d4d5a81896b8f68`、5ページ全てPDFテキスト層0文字、画像主体の印刷メニュー。
- 原本を視認して**55商品（ページ別10/9/9/10/17）**の日本語／英語／分類／単一・グラス・ボトル価格を独立基準データ化。参照 `test/fixtures/yuwaku-menu-image-only-20261103.tsv`。
- 英語先行のドリンクと日本語先行のフードを同一商品に対応付けるプロンプト契約、PDFページの高解像度化＋日本語再照合時の同一ページ拡大2画像、読み取った日本語・英語を別欄へ保存するUIマッピング、G/B両価格を追加額付き選択肢として保持する処理を実装。
- 個別ソースレビューS01–S10と横展開レビューH01–H10は `docs/IZK_MENU_BILINGUAL_PDF_20261103.md`。Windows Node/Chrome回帰 **68/68 PASS、exit0**（AIモデル実実行・実機正式QA・本番商品書き込みではない）。
- 前段で「原本未提供」と記した留保はこの追記で解消した。一方で、同じPDFの**新しいWorkers AI推論結果・モデルの55/55読取保証**は未検証である。原本と正解データの存在をAIの正式読取成功と混同しない。

## 完了境界と実態

- 受付：メニュー共通ヘッダーAI残高表示後の氏名表示が16 UTF-8バイト未満に見える／PDF AI分析の所要時間が説明されない／約30件の「読めなかった」表示が出た
- 根因（氏名）：省略処理は従来どおり16 UTF-8バイトだが、共通ヘッダーの名前要素と親metaにoverflow clippingがあり、追加省略され得た
- 根因（所要時間）：2つの画像推論を1ページごとに逐次実行するのに、開始時の確認がクレジット数のみを示していた
- 品質関連の既知問題：すべてのreviewReasonsが「読めなかった／確認が必要」に混在し、glass/bottle複数価格や英語のみの名称が失敗に見える。PDFは画像化のみで正確な埋込テキスト情報を捨てていた
- **留保**：利用者が直近に読み取らせた原本PDFとAI出力はこの作業環境で取得できていない。実際の約30件のうち、表示上の誤警告と真の抽出漏れが各何件かは未確定。精度向上の実証値や本番実機PASSは報告しない
- ソース更新：Native/Android/iOS共通の `mobile-app/web/header.js`, `menu-ai-import.js`, `menu-ai-review.js`, `menu_editor.html`、Web本番/TESTの `header.js`、Workerの `src/menuDocumentImport.js` と `src/aiCreditActions.js`
- 安全：原本PDFを送信せず、各ページ画像と最大6000文字の同ページテキスト補助情報のみ送信。商品の自動保存なし。既存のページごと冪等なAIクレジット決済に変更なし
- 初回評価時点：ソース修正＋ローカル回帰まで。commit、push、Worker deploy、iOS/Android build、TestFlight配布、正式831 QA台帳の判定更新は未実施だった。後続のAI自動登録の対応・反映状況は `IZK_MENU_AI_AUTO_REGISTER_20261103.md` を参照する
- Web本番/TESTのService Worker cacheをそれぞれv292/v293へ更新。後日の承認済みWeb配布時に旧header.jsを再利用させない

## 案件A：氏名16 UTF-8バイト枠 — S01〜S10 ソース自己レビュー

| ID | 確認対象と独立観点 | 結果 |
|---|---|---|
| S01 | `header.js/abbreviateUtf8` がUTF-8バイト数で判断し文字数で誤カットしない | SOURCE PASS |
| S02 | 同関数が絵文字のsurrogate pair/グラフェムを途中で破壊しない | SOURCE PASS |
| S03 | 16バイト以内の入力では名称を加工しない | SOURCE PASS |
| S04 | 16超過時の`...`が16バイトの範囲内に含まれる | SOURCE PASS |
| S05 | `#izHeaderMeta`の`overflow:hidden`を解除しユーザー枠の再省略を防ぐ | SOURCE PASS |
| S06 | `.iz-header-user`の`text-overflow:ellipsis`と`max-width:240px`を解除する | SOURCE PASS |
| S07 | 狭い画面の720pxメディアクエリでも再度max-width制限を掛けない | SOURCE PASS |
| S08 | 430pxメディアクエリの親metaで`overflow:hidden`を再導入しない | SOURCE PASS |
| S09 | `renderLanguage`は16バイトの同じヘルパーを再利用する | SOURCE PASS |
| S10 | `syncAuthDisplay`はログイン切替ごとに名前表示を更新する | SOURCE PASS |

### 案件A — H01〜H10 横展開ソースレビュー

| ID | 関連ソース観点 | 結果 |
|---|---|---|
| H01 | iOS/Androidが同じNative `mobile-app/web/header.js`を同梱するため片OS専用分岐なし | SOURCE PASS |
| H02 | Web本番`docs/yuwaku/header.js`へ同じmeta・user CSS方針を適用 | SOURCE PASS |
| H03 | Web TEST `docs/yuwaku/test/header.js`はWeb本番と同一内容 | SOURCE PASS |
| H04 | 320 CSS pxではタイトルが可変幅、氏名metaは内容幅を確保できる | SOURCE PASS／Chrome補足PASS |
| H05 | 360 CSS pxでもAIポイントのツールバー行が氏名の上段を侵食しない | SOURCE PASS／Chrome補足PASS |
| H06 | 720 CSS pxでも同じCSS方針で余計な省略なし | SOURCE PASS／Chrome補足PASS |
| H07 | 16バイトASCII名でもUI上のスクロール文字幅と要素幅を独立比較 | SOURCE PASS／Chrome補足PASS |
| H08 | 16バイト日本語名でも表示関数のバイト上限を独立検査 | SOURCE PASS／Node補足PASS |
| H09 | 絵文字を含む名前のUTF-8文字境界・省略を独立検査 | SOURCE PASS／Node補足PASS |
| H10 | AI chipは下段のHelp slotを共有し高さ・氏名上段の構造を増やさない | SOURCE PASS |

## 案件B：分析前の所要時間＋ポイント確認 — S01〜S10 自己レビュー

| ID | 確認対象と独立観点 | 結果 |
|---|---|---|
| S01 | `menu-ai-import.js`がPDFページ数を直接取得して推定時間に利用する | SOURCE PASS |
| S02 | 残高不足の場合は`min(pages,balance)`で推定処理件数を縮小 | SOURCE PASS |
| S03 | 目安を1ページ約60秒として明示し測定確約とはしない | SOURCE PASS |
| S04 | 5ページ・5ポイント時は確認文言が約5分・最大5ポイントになる | SOURCE PASS／Chrome補足PASS |
| S05 | `getAiMenuImportContext`で認証済み残高と単価を取得する | SOURCE PASS |
| S06 | 既存の`AICreditUI.confirmation`で単価・残高・最大消費・成功時残高を表示 | SOURCE PASS |
| S07 | 既存`AICreditUI.confirm`を1回だけ呼び、確認前には画像解析しない | SOURCE PASS |
| S08 | 日本語・英語の所要時間表示を共通langで分岐 | SOURCE PASS |
| S09 | 残高RPC失敗時は推定課金を作らず処理開始を拒否 | SOURCE PASS |
| S10 | Cancelは新しいページ解析を実行せず、finallyで操作を再有効化 | SOURCE PASS |

### 案件B — H01〜H10 横展開レビュー

| ID | 関連ソース観点 | 結果 |
|---|---|---|
| H01 | 在庫AIの`AICreditUI.confirmation`と共通実装を再利用し分岐重複なし | SOURCE PASS |
| H02 | `ai-credit-ui.js`はNative/Web用同一部品、メニューはNative側で明示読み込み | SOURCE PASS |
| H03 | JPEG/PNG/WebP写真も1ページとして同じポイント・時間確認 | SOURCE PASS |
| H04 | PDF 15ページ上限の既存防御は維持 | SOURCE PASS |
| H05 | 0ポイント時は解析ボタン無効・開始時にも再度残高確認 | SOURCE PASS |
| H06 | Freeメニュー10商品上限と解析の途中停止は従来どおり | SOURCE PASS |
| H07 | 解析途中のページ障害で次ページへ継続し自動リトライしない | SOURCE PASS |
| H08 | RPCは毎ページ現在の認証tokenを送信し店IDはクライアント指定しない | SOURCE PASS |
| H09 | 英語UIでポイント上限とminute(s)の目安を明記 | SOURCE PASS |
| H10 | iOS/Android双方が共通`mobile-app/web/menu_editor.html`を利用 | SOURCE PASS |

## 案件C：PDF読取品質と「約30件」警告 — S01〜S10 自己レビュー

| ID | 確認対象と独立観点 | 結果 |
|---|---|---|
| S01 | PDF.jsの`getTextContent`を画像と同じページから抽出 | SOURCE PASS |
| S02 | 原本PDFをAPIに送らず、画像は従来の単一ページ単位 | SOURCE PASS |
| S03 | クライアント/サーバーの両方で補助テキスト6000文字上限 | SOURCE PASS |
| S04 | テキストをuntrustedなJSON引用としてプロンプトに渡し指示と扱わない | SOURCE PASS |
| S05 | 視認できない文字・商品はテキストだけで自動創作しない指示 | SOURCE PASS |
| S06 | 日本語再確認にも同ページ補助情報を使用し、印字なし/読取不能を区別 | SOURCE PASS |
| S07 | `not_printed`は日本語訳を作らず誤`ja_not_read`警告を除去 | SOURCE PASS |
| S08 | `unreadable`は実読取不備として維持し偽PASSにしない | SOURCE PASS |
| S09 | 価格種類のreview理由と実際の名前・価格欠落を別カウントへ分離 | SOURCE PASS |
| S10 | 未確認項目は編集画面で確認後のみ保存。後続変更で正常読取品はcreate-onlyで自動登録し、重複は上書きしない | SOURCE PASS |

### 案件C — H01〜H10 横展開レビュー

| ID | 関連ソース観点 | 結果 |
|---|---|---|
| H01 | 写真画像はテキスト層無しでも従来推論経路で処理可能 | SOURCE PASS |
| H02 | スキャンPDFでテキスト層抽出不能でも画像解析は継続 | SOURCE PASS |
| H03 | 英語のみの印字は日本語を捏造しない`not_printed`で区別 | SOURCE PASS |
| H04 | 日本語ありの英文混在商品は視覚照合し不一致を要確認に維持 | SOURCE PASS |
| H05 | glass/bottle複数価格の警告は「読取不能」件数から除外しレビューへ残す | SOURCE PASS |
| H06 | セクション見出し誤商品化を防ぐ既存抽出処理はそのまま維持 | SOURCE PASS |
| H07 | JSON短縮・不正schema時のfail closedとクレジット成功誤確定を維持 | SOURCE PASS |
| H08 | 日本語第2推論失敗は`failed_review_required`として明示 | SOURCE PASS |
| H09 | 15ページ超・16MB以上写真等の既存入力制限は維持 | SOURCE PASS |
| H10 | `aiCreditActions.js`は同ページテキストを`sourceHash`に含め、店舗は認証済みコンテキスト由来 | SOURCE PASS |

## 検証証跡・反映区別

- 対象：`test/menu_ai_import_browser_test.mjs`、`test/menu_ai_import_review_rules_test.mjs`、`test/menu_ai_pdf_ui_integration_test.mjs`、`test/menu_document_import_test.mjs`、`test/menu_document_ai_batch_test.mjs`、`test/izk_ut_094_header_toolbar_alignment_test.mjs`、`test/header_name_ai_balance_16_bytes_20261103_test.mjs`、`test/ai_credit_hub_ui_test.mjs`
- 拡張対象として`test/menu_ai_prompt_management_test.mjs`も含むNode/Chromium回帰 **57/57 PASS（exit0）**。独立の`node test/header_component_test.mjs`は初回にNative `pagePolicy`でブラウザー外`document`参照エラーを検出、`typeof document !== 'undefined'`防御を追加した再実行で内部 **46/46 PASS（exit0）**。差分`git diff --check` exit0
- 正式QAではない。Node/Chromeのローカルテストのみ。テスト数・exitは実行結果で記録し、パッケージビルドやCloudflare本番への反映を示さない
- 画面の約30件の正否は原本PDFとAI結果のページ・商品単位の照合がまだ必要。過去の別PDF8ページ・90商品の評価結果をこのPDFの精度保証に流用しない
- HTML実装面：`docs/yuwaku/menu_editor.html`と`docs/yuwaku/test/menu_editor.html`にはNative専用`menu-ai-import.js`の読込入口がないため、Webに未提供のAI機能を勝手に追加しない。共通headerの氏名修正のみWeb/TESTにも横展開
