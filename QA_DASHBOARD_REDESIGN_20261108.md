# QA・自動テストダッシュボードの再編（2026-11-08 PHT）

> **2026-11-08 S5/S6現行追加：** この文書の旧「S5未集計」表記は初回再設計時点の履歴。
> 現在は `/api/test-catalog` の `LOCAL_CHROMIUM_SCENARIO` から**S5 7/7、S6 5/5**
> の最新個別実行をソース/PNG SHA256/DB cleanupで照合して表示する。未実行・失効・FAILも
> ケース別。証拠PNGは閲覧APIで確認可能。詳細は `qa-dashboard/README.md`。
> GitHub Actions全ジョブ結果の統合は別課題であり、本機能に含めない。

> **最新方針：** 新体系は「npm テスト」「自動テスト」「ユーザー実機テスト」の
> 3目的カテゴリに統一。詳細は`docs/QA_TEST_CATEGORY_POLICY_20261108.md`。
> 以下は段階的な画面刷新の経緯・旧時点での集計仕様であり、最新画面の説明ではない。

> 2026-11-08のユーザー確認で方針を追加変更：
> 旧正式QA 1,659件の全消化目標は終了し、履歴として折り畳み保持。
> 自動テストと「私の実機QA（利用者の実際の画面／速度感／UX／プリンター判定）」の
> 二つを独立した運用レーンとする。実装詳細は
> `docs/QA_USER_DEVICE_QA_SPLIT_20261108.md`。
> 以下の旧正式QA表示記述・試験時点の件数は以前の改修履歴であり、
> 現時点の主要指標やリリースゲートを意味しない。

## 目的・完了条件

QA進捗の陳腐化した情報や準備作業の比率ではなく、利用者が「何が合格し、
何が失敗し、何がまだ未検証か」を数秒で判断できることを優先。
既存の18765ローカルAPI・正式台帳・障害SQLite・Windowsタスク機能を流用し、
二重の台帳を作成しない。今回の受付IDは IZK-UT-138。

## 情報の区分

| 区分 | 正本・判断条件 | 主要表示 |
|---|---|---|
| 正式QA（Android/iOS） | 既存 `/api/status` の公式 `newRuns`、状態整合性 | OS別PASS・FAIL・BLOCKED・NOT_RUN、承認SKIPは別扱い |
| S4業務API/DB | `/api/test-catalog` の `LOCAL_BUSINESS_SCENARIO` 行 | 今のソースに対するPASS、FAIL、STALE_SOURCE、未確認 |
| npm test登録 | `/api/test-catalog` の `npmTopLevelCommands` | 実行ステップ登録数のみ。内包自動発見を加算しない |
| S5実Chromium、GitHub Actions | 実行証拠は存在するが、現行APIがソース一致と最新実行結果を総合判定できない | 未集計・未連携。過去PASSを偽装しない |
| 過去の作業・旧監視・Windowsタスク | 旧API・元画面のまま | 折り畳んだ詳細に保持。準備・稼働を公式QAと混合しない |
| ユーザー障害台帳 | 既存Markdown・SQLite | 別タブで保持。CLOSEDは明示的ユーザー確認のみ |

古さは、少なくとも `generatedAt`（API取得時刻）と
`newRuns.android.updatedAt` / `newRuns.ios.updatedAt`（正式判定の更新時刻）
を区別。公式判定最終更新が24時間を超えた場合に再確認を促す。
APIが未取得・不整合なら `0` や `PASS` と断定せず「取得不可」にする。

## 変更ファイル・設計

- `qa-dashboard/index.html`：新品質サマリー、OS別・実行レーン別テーブル、優先対応、旧詳細の折り畳み。
- `qa-dashboard/style.css`：デスクトップ/スマホ用の新レイアウト。
- `qa-dashboard/quality.js`：読み取り専用、公式結果と自動テスト結果を混算しない集計・HTML表示。
- `scripts/qa-v2-web-dashboard.mjs`：新JSを既存localhostサーバーから配信（APIの変更なし）。
- `qa-dashboard/test-catalog-live.test.mjs`：折り畳まれた旧カタログを開く実ブラウザ操作に変更。
- `test/qa_quality_cockpit.test.mjs` / `test/qa_quality_cockpit_browser.test.mjs`：追加回帰。

古いQAサマリー・15工程・Windowsタスク制御・障害台帳は削除していない。
旧管理機能は「詳細情報・管理画面を開く」から手動でアクセスする。
既存タブ名を保ち、既存URL `/#qaTestCatalog` からも詳細を自動展開する。
正式QA runner、端末、既存スケジュール、障害台帳CLOSEDを変更しない。

## 2026-11-08 実データでの確認結果

- 読取API：公式QA 1,659適用（Android829 / iOS830）、PASS395、FAIL62、
  BLOCKED7、NOT_RUN1,185、SKIP10。正式判定は2026-10-25更新であり、
  今日のAPI取得と混同しない。
- 自動テストカタログ：登録総行1,971（正式OS別1,659、
  npm実行ステップ226、内部自動発見39、S4固有47）。
  S4は**現在のカタログ判定でPASS0、FAIL26、STALE_SOURCE21**。
  過去の47/47 PASS記録とは別に扱う。
- 新規集計単体：3/3 PASS、0 FAIL、exit 0。
- 既存カタログ＋障害統合＋新規単体：12/12 PASS、0 FAIL、exit 0。
  既存実Chromiumテストは詳細折り畳みの操作を修正して再実行済み。
- 正規Windows `ChatOnSteroids-QA-Dashboard` タスクでサーバーのみ再起動。
  `GET /quality.js` HTTP200、`GET /api/status` HTTP200。
- 新規実ChromiumライブUI：1/1 PASS、0 FAIL、exit 0。API値と画面数値、
  詳細展開、旧カタログ操作、障害タブ切替、JS例外0を確認。

## 残る課題

1. S5のrun別result.json、source hash、PNG・DB証拠、cleanup条件を
   現行sourceと照合できる正式な集約インデックスに接続する。
   現時点は過去7/7PASSをトップの有効PASSに格上げしない。
2. GitHub Actions / CIのrunID・コミットSHA・実行日時・結論を
   自動テストの別レーンで取得する（登録済みという理由でPASSにしない）。
3. 旧詳細の大量セクションは今後、実際の利用頻度・目的に応じて統合・削除を判断。
   今回は業務操作の退行リスクを避けるため折り畳みを優先。
4. S4現行FAIL26とSTALE_SOURCE21の根本原因を既存ランナーで再検証。
   本件の画面改修のみでケース判定は変更しない。

実機正式QAの新規判定、モバイルビルド、Git commit/push、Worker本番反映は未実施。
