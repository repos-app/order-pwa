# IZK-UT-075 公開予約フォーム・CRM 局所修正（LOCAL SOURCE ONLY）

## 結果・根拠

対象：公開予約フォーム `docs/reserve.html`、`docs/test/reserve.html` と API 実体 `src/crm.js::submitReservation`。既存制約の予約者氏名40、電話20、メール254、席指定20、備考200（JSのUTF-16 code units）を引き継ぐ。新しい任意の制約値を導入していない。

既存APIは氏名・電話・メール・席を `slice` して黙って保存し、日時は20文字で先頭だけ解析していた。現在は長すぎる入力を保存前にエラーで返し、日時末尾の余分な文字も不正として扱う。Web本番・TEST両画面は `beforeinput` / `paste` で超過挿入を明示拒否し、selection replacement を許容。自動補完・IME確定・スクリプトによる変更は保存前の全文検査で防ぐ。Emailの `maxlength` を撤去して無通知の切り落としを回避。備考は複数行のtextareaに変更し、折返しを許可する。既存データを変更する処理なし。

回帰：`node --test test/izk_ut_075_public_reservation_lengths_test.mjs` → 3 PASS / 0 FAIL（Web本番VM、TEST VM、直接 `submitReservation` API DBモック）。API超過ケースは氏名/電話/メール/席/備考/日時の6種で、書込みゼロ、予約重複照会前の拒否を確認。HTML diff check 0。**実ブラウザ、Android/iOS実機、正式QA・本番Workerは未実行**。

## 全体インベントリの残

元の一次監査 `docs/IZK_UT_075_ALL_INPUT_LENGTH_REDESIGN_20261015.md` は Native 324項目中 maxlength 未指定264、Web本番 280中238、Web TEST 280中238（型や非該当も含む静的「候補」）。今回の `docs/reserve.html` / `docs/test/reserve.html` はこの3面の管理画面集計とは別の公開予約入口であるため、**残候補264 / 238 / 238件の数字は減らさない**。公開予約側4テキスト欄×2入口（計8）の契約を追加監査。Native予約管理 `mobile-app/web/reservations.html`、Web管理 `docs/yuwaku/reservations.html` と TEST は予約一覧と公開フォームへのリンクであり、今回の公開入力項目を直接所有しない。会員、メニュー、設定、アカウント等は未完了。

## 自己レビュー10観点（コードレビューの範囲）

| ID | 証拠・結果 |
|---|---|
| S01 | PASS: 仕様書の無断切捨て禁止、従前の既存上限40/20/254/20/200と照合 |
| S02 | PASS: `src/crm.js` 旧 `slice` を特定し拒否へ変更、direct API負例 |
| S03 | PASS: max+1/フィールド別超過6種、VMで選択置換と貼付け |
| S04 | PASS (限定): 原APIの `normalizeReservationStoreId` / stores確認を維持 |
| S05 | PASS (限定): 超過時予約SELECT前の早期終了、DB batchなし |
| S06 | PASS: 正常フィールドの既存仕様/レスポンス形は変更なし。実保存成功の今回の新規回帰はPENDING |
| S07 | PASS (ソース): JA/ENエラー、textarea折返し・min-widthと幅上限追加。実画面はPENDING |
| S08 | PASS: キーボード入力・IME composition を干渉しないガードと finally不要な同期処理 |
| S09 | PASS: 専用node:test 3件exit 0、既存の正式QAに未反映 |
| S10 | PASS: 対象3ファイル＋専用テスト/本書、git管理済の他担当差分には変更なし |

## 横展開レビュー10観点

| ID | 結果と調査 |
|---|---|
| H01 | PASS: Web本番 `docs/reserve.html` の超過入力ガード |
| H02 | PASS: Web TEST `docs/test/reserve.html` と同じガードを反映 |
| H03 | PASS: API `src/crm.js` に直接リクエストを送り早期拒否 |
| H04 | PASS: 氏名/電話/メール/座席/備考/日時の六つを独立確認 |
| H05 | PASS: JA/ENエラーメッセージを両HTMLに追加 |
| H06 | PASS: プログラム代入後のsubmit検証でRPCゼロ（両VM） |
| H07 | PASS: Pasteとbeforeinputの選択置換ガード（両VM） |
| H08 | PASS (ソース): 予約管理 Native/Web/TEST は公開フォームへの導線、同一入力実装ではない |
| H09 | PENDING: 実機のIME・キーボード・横向き、720物理px、Web画面スクリーンショット |
| H10 | PENDING: 会員登録の `src/crm.js` 120/1000/2000の `slice`、その他全入力一覧。独立修正が必要 |

QA正式PASS増加：**0**。本番反映：**未実施**。レビュー中のPENDING項目は完了扱いしない。
