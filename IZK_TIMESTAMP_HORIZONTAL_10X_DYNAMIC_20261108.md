# 2026-11-08 PHT | 日時表示の横展開10観点＋動的自動テスト

## 発端と根因

2026-11-08 03:49頃のiPhone発注では、履歴が 2026-11-07 19:48:35 と表示された（UTCとAsia/Manilaの8時間差）。発注のD1保存はUTCで妥当だが、画面がその日時を直接出していた。既存の DateDisplay.formatUtcDateTime を利用して修正済み（前回文書 docs/IZK_PO_HISTORY_TIMEZONE_20261108.md）。

## この依頼で新たに修正した同型・関連の不具合

- 会員管理の最終来店: src/crm.js で last_visit=datetime('now') のUTC。members.html 3面でUTC専用formatterに統一。
- ToDo作成と完了: src/tasks.js にUTCで保存。todo.html 3面で created/doneAt の直接・ローカル扱い表示を修正。
- 申し入れ作成: src/tasks.js にUTCで保存。requests.html 3面でUTC専用formatterに統一。
- 注文管理の時刻: admin.html 3面の fmtTime はUTC解析後、端末toLocaleTimeStringで表示していた。店舗TZで表示する既存DateDisplay経由へ変更。
- キッチンの時刻: kds.html 3面も同様に修正。共通date-displayを導入し、店舗TZでHH:MM表示。経過時間・遅延判定は変更していない。
- DBやAPIレスポンスの時刻の意味・書込処理は変更していない。既存の他担当未コミット差分は保護した。

## 横展開10観点の個別実施結果

| 観点 | 独立した調査入口 | 結果／検証証拠 |
|---|---|---|
| H01 | 発注履歴: migration→API→UI | 0044 migration / src/purchaseOrders.js / 3面を追跡し、直接UTC描画を特定。修正後時刻と旧実装の故障注入を実行比較、PASS |
| H02 | 会員最終来店 | src/crm.js のUTC保存とmembers.html 3面の表示を照合、PH/JP/GB/USで実描画一致、PASS |
| H03 | ToDo作成 | src/tasks.js のISO-UTC生成とtodo.htmlのcreated表示を独立照合。3面の実描画一致、PASS |
| H04 | ToDo完了 | src/tasks.js のdone_atとtodo.htmlのdoneAt生表示を追跡し修正。3面の実描画一致、PASS |
| H05 | 申し入れ作成 | src/tasks.js のrequests.created_atとrequests.htmlを照合、3面の実描画一致、PASS |
| H06 | 管理画面注文時間 | admin.html 3面の端末TZ依存toLocaleTimeStringを検出、店舗TZに統一したfmtTimeを4地域で実行、PASS |
| H07 | KDS注文時間・遅延判定 | kds.html 3面の端末TZ依存表示を修正、4地域実行。elapsedInfoのUTC差分計算をソース確認して維持、PASS |
| H08 | 二重変換の禁止 | 予約・領収書・印刷キュー・レジ開閉は、既にローカルのAPI値を保持。src/printers.js と src/register.js を逆引き、PASS |
| H09 | 暦日・DST・地域の境界 | 納期・誕生日はタイムゾーンで日付を動かさない。PH/JP/GB/USに加え米国の3月・11月のDST切替を実行検証、PASS |
| H10 | 新規フィールド自動追加・負例・CI | 全3配布面の画面日時フィールドをソース自動走査。新規フィールド・誤formatter・直接表示・1段階別名の人工変異を検出、Web/TEST項目一致、CI自動発見を確認、PASS |

※ 10観点は異なるソース入口・業務意味・配布面・テスト境界を独立に読んだレビューであり、端末正式QAを10回実施したという意味ではない。

## 新規日時が勝手に対象へ追加される実装

- 走査器: scripts/ci/date-time-display-discovery.mjs。3配布面のHTML/JSを毎回再帰走査する。
- 対象検出: DateDisplayのUTC/ローカル日時・日付・月表示、注文管理/KDSのfmtTime、日時風の直接描画、テンプレート文字列、1段階別名。
- 自動テスト: test/auto-ci/auto-discovered-datetime-sinks.test.mjs。走査結果1フィールドごとにテストを生成するため、対象項目の手動追記は不要。
- 実画面レンダラー: test/auto-ci/business-utc-display-oracles.test.mjs は会員・ToDo・申し入れのformatter呼出を自動抽出してUTCサンプルを画面描画へ注入する。Native/Web/TEST×PH/JP/GB/USで期待時刻を判定。
- 元の発注画面: test/auto-ci/purchasing-po-history-timezone.test.mjs でUTCの誤描画がFAILすることを検証。
- 新規に出所不明のタイムスタンプが誤ったformatterや生表示で追加されれば、成功扱いせず静的ゲートでFAIL。既存の壁時計例外は特定画面・特定フィールド単位で独立根拠を記す。
- CI取込: scripts/ci/run-auto-discovered-tests.mjs --ci --list で3テストを自動発見。現行 PUSH_CI_TESTS 26/29。全CI実行を完走したとの意味ではない。

## 確定テストと境界

- 動的日時項目走査: 72表示バインディング（配布面の重複含む）、未分類・生時刻表示に関する検出FAIL 0。
- 関連3テスト実行: 95/95 PASS、FAIL 0、exit 0。ログ test-results/utc-display-test-run-20261108.log。
- 共通日時表示回帰: 34/34 PASS。ログ test-results/utc-date-display-regression-20261108.log。
- 発注・UTC・JA/EN既存関連: 6/6 PASS。ログ test-results/utc-ancillary-regression-20261108.log。
- フロントエンド/画面遷移関連: 3/3 PASS。ログ test-results/utc-cross-surface-regression-20261108.log。
- 共通重要UI保全ゲートPASS。Git差分チェックexit 0。他担当の改行正規化警告あり。

## 制限と未完了

- 自動検出は実際の日時描画呼出と、日時らしい項目名の直接表示に適用。任意の名前の多段階変換、動的property、日時とは分からない文字列を100%網羅する保証はない。API契約に時刻型があること、業務の正しい期待値が別にあること、実機QAが必要なことは変わらない。
- 表示時刻と経過判定は分離。今回のソース単体回帰PASSを公式実機QAのPASSへ転記しない。
- 未実施: commit/push、Web本番公開、Worker配備、モバイル資材同期、新iOS/Android build/配布、ライブD1と実機再確認。正式実機QAの新規PASS 0。
