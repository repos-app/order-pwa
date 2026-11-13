# IZK-UT-151 — 月別スタッフ報酬の登録順表示

## 要求・原因・変更

- ユーザー指摘（2026-11-10、yuwaku、iPhone画面）：月別スタッフ報酬カードの順序をユーザー（従業員）登録順にする。
- 原因：`src/commission.js` の `getReport` が `total DESC, employeeName ASC` を返していた。
- 修正：同じ店舗の `employees.created_at ASC`（同秒は `employees.rowid ASC`、その後 employeeId）で報酬カードを返す。登録日時不明の削除済み従業員の履歴は最後に安定表示。金額とステータスの集計は従来通り。
- レポート表示は `mobile-app/web/commission-app.js` の `staff.map` に依存し、Web本番／Web TESTは同一内容（SHA256 `DE5B9B9DDFBC81FC2014793AE055E0E12EB10F9B413CDDB34706CC261356B970`）。Native/Webに新規のローカルソートは追加しない。
- メタデータは報酬カード内部の並び替えだけに使い、個別会計明細APIレスポンスには含めない。マイグレーションなし。

## レビュー結果（ソースと業務の独立観点）

1. 元の総額優先ソートを特定、削除。
2. 登録日時の正本が従業員作成時の `employees.created_at` であることをスキーマと `saveEmployee` で確認。
3. 日付昇順で名前順と総額順が逆になるfixtureを追加。
4. 同じ秒の登録は既存行の `rowid` で安定化。
5. 削除済み従業員は表示から欠落せず履歴末尾へ。
6. APIレスポンスの報酬総額・未払額の不変を検証。
7. 登録ソートの一時メタデータがレスポンスに出ないことを検証。
8. 実画面 `renderReport` の結果順と支払ボタン2件をVM描画で検証。
9. `gasApi` の `getCommissionWorkspace`／`getCommissionReport` の共通 `getReport` 経路を確認。
10. テストはSQLite実スキーマ（店舗teat／another）を使用、店舗境界を既存検証に再利用。

横展開レビュー（別の経路・利用形態）:

1. Native画面の報酬レンダラーがAPI順序を保持することを確認。
2. Web本番の報酬レンダラーをNativeとSHA照合。
3. Web TESTの報酬レンダラーをNativeとSHA照合。
4. 日本語・英語は共通レンダラーであり、表示順の翻訳別分岐がないことを確認。
5. `getWorkspace` でレポートがそのまま返却されることを確認。
6. SC分配（対象0人／分割／取消）を既存SQLite回帰で検証。
7. オーダー別コミッションと対象メニュー手当の分離を既存回帰で検証。
8. `markPaid` と支払済みロックを既存回帰で検証。
9. 月次期間フィルタと会計詳細集計を既存回帰で検証。
10. 返金・店舗隔離を既存回帰で検証。

## テスト・正式反映状況

- `node --test test/auto-ci/commission-receipt-assignment.test.mjs test/auto-ci/commission-sc-eligible-staff.test.mjs test/auto-ci/commission-feature-option-ledger.test.mjs test/auto-ci/commission-workspace-configuration.test.mjs`: **200/200 PASS、exit 0**（最後の内部メタデータ削除前に実行）。
- 最終変更後に `node --test --test-name-pattern="monthly payout staff follow original" test/auto-ci/commission-receipt-assignment.test.mjs` を実行、**1/1 PASS、exit 0**。`git diff --check` もexit 0。
- `scripts/qa-modernization/business-journey-review.mjs --changed`: exit 0だが既存の変更検出では新規candidate 0、unmappedに今回のsrcとテストを含む。これは独立QA PASSではない。
- 実機、Worker本番反映、commit/push、ネイティブ配布：**未実施**。正式実機QAのPASS増分0。ユーザーの実機承認なしに障害をCLOSED扱いにしない。
