# AIメニュー取込：正常読取品の一括自動登録（2026-11-03）

## 仕様・完了の境界

ユーザー指示：AIが読み取れた新規商品は一括登録し、読み取れなかった／確定できないものだけ確認を求める。全商品を手動確認させる従来の挙動は廃止。OCR・モデル出力の無警告は正答率の実測ではない。

- AIクレジットと所要時間の事前確認で、成功した新規商品が自動登録されることを明示する。
- `menu-ai-bulk.js` が商品名、価格、カテゴリ、言語、重複、価格単位の未確定要因を分類する。
- 自動登録可能な商品は既存の認証済み `saveMenuItem` RPCを再利用し、`createOnly` をサーバーで厳守する。
- 旧コードの「名前が同じとき暗黙のUPDATE」は自動取込には適用しない。重複は登録せず折りたたみに格納。
- 不確かな商品だけ編集フォームへの個別確認を提示する。保存結果不明のHTTP失敗は再送せず要確認に移す。
- Freeの10件上限、店舗トークン分離、日本語／英語別欄、Glass/Bottleの既存選択肢保存を維持。
- 現時点での検証はローカルNode・ChromeとモックRPC/DBのみ。正式実機QA判定ではない。実際の55商品がAIで正しく認識されるかは未測定。

## 10回：修正ソース自己レビュー

| ID | 調査対象・観点 | 具体的な確認 |
|---|---|---|
| S01 | `classifyImport` | 欠損名・欠損価格・カテゴリ欠損を自動登録しない |
| S02 | `admission` | JA/EN入替・日本語見解相違は要確認。同一ページの独立視覚再読取で回復できた一致日本語は確定扱い |
| S03 | 単価・複数単価 | 単価の空欄は要確認。G/Bの価格差分は既存オプション形式で保持 |
| S04 | `priceUnitEvidence` | 単位明記・ボトル専用ページの確定価格を登録。`unit_derived`警告や単位不明は確認を残す |
| S05 | 既存商品の衝突 | 重複は新規登録せず、曖昧な類似候補は人間確認 |
| S06 | 連番SKU | `New Product 1/2` 等は類似名でも別商品扱い、同名のみ重複 |
| S07 | `createOnly` | 実 `admin.saveMenuItem` のモックDB呼出で更新SQLゼロを確認 |
| S08 | 連続登録の失敗 | 2件目失敗でも3件目実行。結果不明は自動リトライなし |
| S09 | 画面更新・通知 | 自動登録済件数／要確認件数／重複／Free上限を別々に集計 |
| S10 | UI操作中の状態 | 二度押しを止め、解析中のファイル差替を止め、フォームへは不確定品のみ送る |

## 10回：同種画面・処理への横展開レビュー

| ID | 横展開対象・観点 | 具体的な確認 |
|---|---|---|
| H01 | iOS | Androidと同じNative web資産を使用。専用の片OSパッチは作らない |
| H02 | Android | iOSと同じインポータと登録APIを使用 |
| H03 | Web PROD/TEST | Native限定のPDF取込ボタンを勝手に公開しない |
| H04 | JPG/PNG/WebP | PDF以外も既存の1画像1ページ処理を経由し自動登録分類を共用 |
| H05 | Free | サーバー側 `canCreateMenuItem` とクライアント側候補／空き枠の両方で制限 |
| H06 | Pro/legacy | Free上限を課さず、同じ登録APIと衝突防止ロジックで登録 |
| H07 | ログイン・店舗切替 | 保存前トークン再照合、サーバーのstoreIdは認証情報由来 |
| H08 | 既存メニュー編集 | 通常の手動更新は従来どおり。`createOnly:true` の場合のみ暗黙UPDATE禁止 |
| H09 | UI/多言語 | JAとENを別フィールド保存。メニュー登録フォーム・価格選択肢は共通部品 |
| H10 | AI課金・再実行 | 解析は既存のページ冪等requestId。登録失敗の自動リトライや再解析による二重課金なし |

## 実施した検証

- `node --test test/menu_ai_bulk_register_test.mjs test/menu_ai_import_review_rules_test.mjs test/menu_ai_import_browser_test.mjs test/menu_ai_pdf_ui_integration_test.mjs test/menu_document_import_test.mjs test/menu_ai_bilingual_pdf_source_20261103_test.mjs`：55 PASS／0 FAIL（ローカル）。
- `node --test test/qa2_header_two_row_regression_test.mjs test/header_name_ai_balance_16_bytes_20261103_test.mjs`：ヘッダー回帰を再検査（正式OS判定ではない）。
- 公開Cloudflare・Apple TestFlightへの反映は別途実施・確認が必要。テストの緑表示だけを本番反映としない。
