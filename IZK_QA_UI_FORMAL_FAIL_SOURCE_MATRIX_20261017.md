# Android正式FAILのUI系ソース再照合（2026-10-17・第2巡）

## 検査基準

- 読取元: `.qa-v2-official/android/state.json` の各 `cases[].result.summary / buildIdentity / evidenceRefs`。当該時点の `status=FAIL` から `QA2-UI-*` **27件** と `QA2-NEW-VIS-001/002`、`QA2-NEW-OS-002` **3件**、合計**30件**を抽出。全Android FAILの残余29件は今回の個別判定対象外。
- `LOCAL_FIXED_WITH_PROOF` は同じ根本原因に対する実際のローカルソース改修、専用回帰・ソースレビューが記録された場合のみ。旧APKの正式FAILは変更しない。`UNKNOWN` は失敗の全受入条件について根本修正を断定できない場合。`SOURCE_UNFIXED` は現行ソースの具体的な未修正行・到達経路まで確定した場合のみ。
- 製品仕様が10/16のIZK-UT-078で**日本語タイトル14 UTF-8バイト以内・ユーザー名10バイト以内（省略記号込）**へ変更された。旧「全画面でタイトル全文」FAILは新仕様と競合する。原FAILを訂正・抹消せず、新ビルド・画面・操作可能性で再判定する。
- 既存の修正資料: `docs/IZK_UT_073_NATURAL_WRAP_CROSS_SCREEN_20261017.md`（長文5画面+commission、Chrome一部）、`docs/IZK_UT_078_TWO_ROW_HEADER_LOCAL_FIX_20261016.md`（共通117画面、Chromium+9/9）、`docs/QA_V2_UI_HEADER_20_CASES_REMEDIATION_20261013.md`（旧版）、`docs/IZK_UT_088_LEGAL_NATIVE_HEADER_LANGUAGE_20261017.md`、`docs/IZK_UT_086_REGISTER_BLANK_CASH_COUNT_20261017.md`。075系は入力候補と部分修正であり画面全体合格の証明ではない。

## ケース別マトリクス

下記の「旧FAIL」はすべて**公式 state に残るFAIL**。ビルドIDは各ケースのFINAL `result.buildIdentity`。証拠源は各同一IDの `result.evidenceRefs`、補足は記載したローカル回帰資料。

| ケース | FINAL APK | 正式FAIL根拠（最終summary） | ローカル分類／証拠・不足条件 |
|---|---|---|---|
| QA2-NEW-OS-002 | 910017 | 回転安定後は正常、独立してIME中ログイン送信が隠れる | **UNKNOWN**：ログインIMEのIZK-UT-070は根因・現在の表示修正をソース上で追加確証できず。安定landscapeそのものはFAIL根因ではない |
| QA2-NEW-VIS-001 | 910017 | 注文管理・注文入力ヘッダ題名が省略 | **LOCAL_FIXED_WITH_PROOF（ヘッダ構造）**：078共通2段・14バイト仕様、9/9 Chromium。全文表示旧条件との仕様差および実APK再検証待ち |
| QA2-NEW-VIS-002 | uitest@910017 | Adminの長い商品名・価格と提供ボタンが重なる | **LOCAL_FIXED_WITH_PROOF（同一原因候補）**：073 adminの表示/価格/操作を分離、Chrome実寸レビュー。QA2-UI-adminと同根。真正長文データ付き新APKは未検証 |
| QA2-UI-admin | uitest@910017 | 商品名・価格がMark Served下へ侵入 | **LOCAL_FIXED_WITH_PROOF（表示部分）**：073 admin局所Xスクロールと独立Flex列、Chrome geometry。実APIデータでの再判定待ち |
| QA2-UI-birthdays | uitest@910017 | タイトル省略、テーブル初期表示で列の一部のみ見える | **UNKNOWN（ヘッダ構造は078 LOCAL修正）**：旧題名全文条件が新仕様と競合、テーブル最終列までスクロール可能か原証拠でも未測定 |
| QA2-UI-commission | 910019 | 720pxで戻るボタンが画面外、scrollWidth455＞360 | **部分LOCALタッチ修正／正式viewport overflowはUNKNOWN**：`docs/IZK_QA_UI_COMMISSION_360_SOURCE_BROWSER_20261017.md`。独立Chromiumで現行HTML静的文書幅360/360、タブは局所スクロール。4タブの高さ41px→44pxはbefore exit1→after exit0で局所是正。認証後ヘッダは未再現、910019実機FAILを保持 |
| QA2-UI-coupons | 910015 | 日英切替後ヘッダ切れ | **LOCAL_FIXED_WITH_PROOF（ヘッダ候補）**：078 2段・073 coupons折返し、後続署名APKでの正式再検証待ち |
| QA2-UI-data_admin | uitest@910017 | 💾データバックアップ・管理のタイトル省略 | **LOCAL_FIXED_WITH_PROOF（共通ヘッダ）**：078の全117面適用・9/9。旧全文条件は新14バイト仕様で置換、新APK未検証 |
| QA2-UI-expenses | 910015 | 600物理px時の日付末尾切れ・ヘッダ短縮 | **UNKNOWN**：073 expenses折返し改修はあるが具体的日付単行表示の再現確認なし。600物理pxだけの逸脱は現行720px保証外 |
| QA2-UI-inventory | uitest@910017 | 720pxでヘッダ在…と履歴操作／ユーザー名衝突 | **LOCAL_FIXED_WITH_PROOF（共通ヘッダ）**：078の2行固定スロット、Chromium寸法検証。Native現物未再測定 |
| QA2-UI-kds | 910017 | 720pxでプリンタ・ベル・タイトル衝突 | **LOCAL_FIXED_WITH_PROOF（ヘッダ/長文候補）**：078共通操作2段、073 KDS長文再配置。物理ベル・プリンタ操作の横展開未確認 |
| QA2-UI-manage | 910017 | キーボード表示中のログインボタン隠れ・スワイプ不可 | **UNKNOWN**：IZK-UT-070該当。078は管理ログインIME単独操作成功の証拠ではない。最新修正の明示的追跡が必要 |
| QA2-UI-members | 910015 | 英語MembersがMemb…になる | **LOCAL_FIXED_WITH_PROOF（共通ヘッダ）**：078の省略仕様＋アクセシビリティ全文保持。旧「全文」要求の再合意と物理入力確認が必要 |
| QA2-UI-moves | uitest@910017 | 720pxヘッダ短縮、戻るボタン折返し | **LOCAL_FIXED_WITH_PROOF（共通ヘッダ/折返し）**：078＋073 moves局所変更。真正スクロールと戻る操作は端末未再確認 |
| QA2-UI-order-entry | 910017 | **600物理px**で座席モーダルが横にはみ出す | **UNKNOWN**：記録にある確定失敗が保証外600px、720pxで同じ欠陥と断定不可。現状源の720px幾何再評価が先 |
| QA2-UI-printers | uitest@910017 | 720pxでプリンタ設定とユーザー名短縮 | **LOCAL_FIXED_WITH_PROOF（ヘッダ）**：078共通2段とユーザー10バイト仕様。紙印刷やBT操作のPASSではない |
| QA2-UI-privacy | 910017 | 日本語切替後もPrivacy本文・題名が英語のまま | **LOCAL_FIXED_WITH_PROOF**：088で共通header `toggleLang` 経由の本文JA/EN切替と43/43プライバシー回帰。APKに反映・実機往復未確認 |
| QA2-UI-profit | 910015 | 600pxで負数と通貨が改行し表示崩れ | **UNKNOWN**：073の改修対象明示にprofitなし。保証外600pxの負数を720px製品欠陥と確定する幾何証拠なし |
| QA2-UI-profit_sim | 910015 | Operating Profitタイトルが720pxでも短縮 | **LOCAL_FIXED_WITH_PROOF（共通ヘッダ）**：078の新省略仕様/全文ariaによる対象。数値入力とロード処理は未検証 |
| QA2-UI-receipts | 910015 | 720pxで返金ピル・商品名・リンクがカード右端に切れる | **CURRENT SOURCE SAFE FOR PROVEN POINTS / FULL FORMAL UNKNOWN**：`test/izk_receipts_360_browser_regression_test.mjs`でNative/Web PROD/TEST各360px本文横溢れなし、表内scrollLeft=max、再印刷・返金リンク到達をChromium実測（3/3）。新署名APKの実データ・全チェックは未実施、正式FAIL維持 |
| QA2-UI-recipe | 910015 | 600pxで原材料列と入力ヒント切れ、題名略 | **UNKNOWN**：078が題名部分に適用。食材表の列・追加行ヒントは保証外600pxのみの証拠 |
| QA2-UI-register | 910019 | 空の実現金欄が0へ変換されcloseShiftへ進む | **LOCAL_FIXED_WITH_PROOF**：086でUI四配布面＋src/register.jsサーバーガード、専用19/19 PASS、元実機証拠は送信直前遮断、新APK未導入 |
| QA2-UI-requests | uitest@910017 | JAで発生した空欄エラーがEN切替後も日本語 | **LOCAL_FIXED_WITH_PROOF／WAIT_SIGNED**：現行3画面の実JSを実行する`test/qa_v2_requests_dynamic_error_locale_test.mjs` exit0、空欄・送信/API・状態更新・削除・一覧取得の既表示エラーをJA→EN→JA、送信増加なし・復旧後消去を確認。`docs/QA_V2_LANG_RESERVE_7_CASES_REMEDIATION_20261013.md`。新APK実機再判定待ち |
| QA2-UI-reservations | 910015 | 予約導線と店舗クエリの文字・リンクの切れ | **UNKNOWN**：078で題名部分は扱うが予約リンク長文の幾何・横スクロール末端は未証明 |
| QA2-UI-reserve | uitest@910017 | 既存の英語エラーがJA切替後も英語 | **LOCAL_FIXED_WITH_PROOF／WAIT_SIGNED**：実埋込みJSを読み込む`test/qa2_ui_reserve_existing_error_toggle_vm_test.mjs` exit0、Native/Web本番/TESTのAPI失敗`rate_limited`英語表示→JA警告→EN警告を追加RPCなしで検証。`mobile-app/web/reserve.html:106-108,143-158`ほか2面、元910017正式FAILは維持。新APK実機再判定待ち |
| QA2-UI-sales | 910015 | 中ほどまでスクロール時に題名がアイコンと…のみ | **LOCAL_FIXED_WITH_PROOF（共通ヘッダ）**：078タイトルと操作2段・動的spacer。実スクロール時の重なりは端末未検証 |
| QA2-UI-terms | 910017 | EN切替後も全文日本語のまま | **LOCAL_FIXED_WITH_PROOF**：088で共通header呼出しとJA/EN全文を実VM回帰、実配布未検証 |
| QA2-UI-todo | uitest@910017 | 720物理px/320dpi（360 CSS px）で題名・未割当セレクタが省略 | **LOCAL_FIXED_WITH_PROOF／WAIT_SIGNED**：Chromium現行Nativeは既に294CSS pxで標準値全文表示、Web本番/TESTは修正前120CSS pxでJA/EN両方欠落→共通gridへ揃え修正後294CSS px。3面の長いJA/EN担当者名は選択値の下へ全文を同期表示。`test/qa2_ui_todo_360_geometry_test.mjs` Chrome実描画exit0。実機QA・題名表示は078側の別ゲート |
| QA2-UI-users | uitest@910017 | 720pxで題名とログイン者名省略 | **LOCAL_FIXED_WITH_PROOF（ヘッダ仕様）**：078 14/10バイト・全文tooltip、仕様変更後の実機再評価必須 |
| QA2-UI-audit | 910015 | 720/600pxで監査表のセル・列が端で切れる | **UNKNOWN**：078題名と共通操作改善はあるが、監査表の列末端・閲覧可能性までの現行画面実測なし |

## 残余と実行ゲート

- **SOURCE_UNFIXEDと断定した件数は0**。現行コードの該当欠陥行と無効な修正を再現していないものを推測で「未修正」としない。これは全欠陥解消の宣言でもない。
- `LOCAL_FIXED_WITH_PROOF` は同じ現象に適用する**既存ローカル改修の証拠**であり、そのケースに含まれるその他のlegacy assertions、ビルドへの同梱・実行結果・正式PASSの証明ではない。`UNKNOWN` のケースは原因が複合または旧試験が保証外600pxで、ソース断定が不適切。
- 優先実証: ①910019でも失敗したcommissionの**署名APKと現行headerのコード版一致**・360 CSS pxでのscrollWidth、②720pxのreceipts／audit／todoセレクタ、③reserve／requests既存エラーテキストの言語切替、④managementログインIME、⑤修正済みUI群の最新署名版での全legacyAssertions。公式runnerによる新規claim/recordは実行担当に限定。
- 原本のFINAL結果・APK版・スクリーンショットSHAは公式 `state.json` の各ケース `result.evidenceRefs` と真正証拠フォルダを参照。本監査は公式stateを変更していない。
