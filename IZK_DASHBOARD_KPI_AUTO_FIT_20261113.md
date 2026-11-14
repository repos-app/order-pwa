# IZK-UT-163｜ダッシュボード金額の1行自動フィット（2026-11-13）

## 受入条件

- 対象は「本日の売上」「今月の売上」「今月の概算利益」の金額3箇所。
- 通常の24pxを基準に、カード内幅と通貨表記を実測し、必要時だけ小さくする。
- 円・ペソ等の記号、カンマ、小数を省略せず、改行・隣カードへの侵入・横スクロールなしで収める。
- 再集計、言語切替、通貨設定反映、画面幅変更後にも再計算する。

## 実装

- Native正本：`mobile-app/web/dashboard.html`
- 同型Web：`docs/yuwaku/dashboard.html`、`docs/yuwaku/test/dashboard.html`
- KPIの `data-autofit="amount"` 属性は指定3箇所のみ。`.kpi{min-width:0}` と `white-space:nowrap` に加え、`fitSalesAmounts()` が実幅を基準として24px〜1pxの二分探索で最大収容文字サイズを決定する。
- `render()` 完了時、`resize`、`document.fonts.ready` の3契機で再計算。既存の売上計算、RPC、認証、色、他のKPI、目標・原価・アラート処理は変更していない。

## 実行済み検証

- `node --test test/dashboard_kpi_auto_fit_browser_test.mjs`: **exit 0 / 1 test PASS / 3,300幾何・値のassertions / FAIL 0**。3画面 × 5 CSS幅(320/360/390/430/768px) × JA/EN × 5金額(₱6,417、₱118,612、₱1,234,567.89、₱123,456,789.12、負の₱123,456,789.12) × 3 KPI。
- 検証項目：正確な文字列、改行なし、実際のレンダリング行数、`scrollWidth <= clientWidth +1`、文字末尾境界、カード境界、フォント有効範囲、ページ横スクロールなし。
- 同テストで、**旧24px固定に強制復帰させる負例**は狭幅で実際に見切れること、修正後に見切れないこと、広狭リサイズで文字サイズが往復することを確認。
- `node scripts/ci/critical-ui-preservation-gate.mjs`: **exit 0**。共通操作ヘッダー保全契約は不変。
- `node scripts/qa-modernization/business-journey-review.mjs --changed`: **exit 0**。金額表示のソース変更は業務操作候補未マップ。正式な業務API/DBケースを追加したという意味ではない。
- `git diff --check`: **exit 0**。

## 自己レビュー 10観点（ソース・Chromiumの範囲）

| 観点 | 確認した証拠・判定 |
| --- | --- |
| S01 固定値の根因 | `.kpi .v{font-size:24px}` と未縮小状態、旧24px強制負例で再現。確認済 |
| S02 grid最小幅 | `.kpi{min-width:0}` を追加し、320〜768pxの境界テストPASS |
| S03 対象限定 | `data-autofit` は売上3箇所だけ。ブラウザで3箇所検出PASS |
| S04 省略なし | `money()` 返却全文と実テキストを一致検証PASS |
| S05 単一行 | `white-space:nowrap` + Range行数検証PASS |
| S06 見切れなし | `scrollWidth/clientWidth` + Range右端の二重検証PASS |
| S07 最大サイズ復帰 | 間隔変更のたびにinline font reset、広→狭→広で検証PASS |
| S08 通貨桁数 | 小数2桁/多桁/負の金額を実描画。PHP検証PASS、JPYなどは未実描画 |
| S09 色と利益ロジック | 利益率、計算式、green/navy/redクラス生成コードは未変更。ソース差分確認 |
| S10 更新契機 | `render()`、`resize`、`document.fonts.ready` の結線確認。resize実描画PASS |

## 横展開レビュー 10観点（配布は未実施）

| 観点 | 確認した証拠・判定 |
| --- | --- |
| H01 Native一次ソース | `mobile-app/web/dashboard.html` を修正、Chromium実描画PASS |
| H02 Web production一次ソース | `docs/yuwaku/dashboard.html` を修正、Chromium実描画PASS |
| H03 Web TEST一次ソース | `docs/yuwaku/test/dashboard.html` を修正、Chromium実描画PASS |
| H04 既存の経路差 | NativeのNativeAuthとWebのmgmtTokenは保持、差分で確認 |
| H05 JA | 3系統で和文ラベル/通貨金額を実描画PASS |
| H06 EN | 3系統で英文ラベル/通貨金額を実描画PASS |
| H07 短辺相当の狭幅 | CSS 320/360pxで全3KPIを実描画PASS（物理端末ではない） |
| H08 中〜広幅 | CSS 390/430/768pxで全3KPIを実描画PASS |
| H09 隣接KPI/ヘッダー | プライムコスト率/在庫/要注意メニューを修正対象外とし、ヘッダー保全ゲートexit0 |
| H10 配布済みビルド | Native配布資材・iOS/Android実機・Web本番の稼働版は**未反映・未検証**。ビルド/本番反映のPASSを付けない |

## ステータス

- **修正**：3つの一次ソースへ反映済み。
- **ローカル自動検証**：PASS。正式端末QA増分 **0**。
- **未実施**：commit、push、Web/Worker本番反映、Nativeビルド/配布、iPhone/Androidユーザー実機QA。上記はこの依頼では明示されていないため実行しない。
