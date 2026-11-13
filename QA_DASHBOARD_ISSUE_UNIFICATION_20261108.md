# Izakanpai QAダッシュボード・障害台帳統合（2026-11-08）

## 完了条件と実行結果

- **1つのURL**：`http://127.0.0.1:18765/` に正式QA進捗と障害台帳の2タブを配置。
  障害管理を直接開く場合は `http://127.0.0.1:18765/#issues`。
- **既存データ正本は維持**：`handoff/GPT_実機テスト障害台帳.md`、
  `handoff/issue-dashboard/issues.db`（SQLite）、
  `issues.json`、対応キューは移動・再作成しない。
- **問題の受付・表示・更新**：ID/文字列/重要度/状態で絞込、50件ずつ表示、
  障害事象・修正内容・横展開・GPTテスト結果を展開、
  メモ・状態・実機確認OKを保存。既存データと同じSQLite/履歴へ反映。
- **CoS全チャット自動受付の可視化**：最終実行と保留件数、
  分類不明・CLOSEDへの再発申告を同じ画面で確認。
- **正式QAとの安全な分離**：正式QA runnerの件数・証拠・判定は読み取り専用。
  障害台帳のCLOSED確定のみ、利用者が実機確認OKチェックを行って確認した場合に許可。
  登録・修正を正式QAのPASS/FAILに換算しない。
- **不要なポート依存の解消**：Node (18765) がローカルPython bridgeを
  起動して既存SQLiteを直接参照。18766の別サービスを必要としない。
  旧18766プロセスは新統合UI正常確認後に停止し、
  旧 `start_dashboard.bat` は統合URLへ誘導する。

## 実装配置

### ユーザー選択による一括CLOSED（2026-11-08追加）

- 障害ごとの「選択」チェックで対象を選び、画面上部の
  **選択した障害をCLOSED** を押して、対象IDと件数を再確認。
- 確認ダイアログで **「自分で確認しCLOSEDにする」** をチェックした
  場合だけ確定ボタンが有効になる。全件一括は最大50件。
- 画面内の「このページの再確認待ちを選択」は **WAIT_TESTだけ**を
  選択し、修正前のOPEN/REOPENは自動で選ばない。
  個別チェックで選ぶ場合は、それ以外の未CLOSEDもユーザー判断で指定可。
- サーバーは選択ID、選択時の状態、更新時刻を照合し、途中で変更された
  案件があれば **0件更新で中止**（HTTP409）。新規取得・再選択が必要。
- 受付IDの重複・存在しないID・CLOSED済みを拒否。
  共通確認メモは任意で既存メモを維持し、状態履歴と確認時刻を保持。
- 更新先は既存の障害SQLiteのみ。正式QAケースのPASS/FAILを変更しない。
- 新API：`POST /api/issue-register/bulk-close`。同一Originと
  専用ヘッダ、明示確認フラグ `confirmed:true` が必須。
- テスト：`test/test_qa_issue_dashboard_bridge.py` 8件PASS、
  `test/qa_v2_issue_dashboard_integration.test.mjs` 7件PASS、
  Edgeブラウザーで2件選択→確認→通信**模擬**の操作PASS。
  実運用データに対するCLOSED操作はテストしていない。
- テスト再発防止：共通チャット受付・CoS収集・障害一括CLOSED・
  HTTP APIの4スイートを **npm testの全回帰に登録**。
  GitHub pushのCI smokeには新規追加しない（既存の影響範囲選択方針を維持）。

| ファイル | 責務 |
| --- | --- |
| `qa-dashboard/index.html` | QA進捗／障害台帳のネイティブタブ |
| `qa-dashboard/issues.js` | 障害一覧・検索・確認・明示保存 |
| `qa-dashboard/style.css` | デスクトップ／モバイルレスポンシブ |
| `scripts/qa-v2-web-dashboard.mjs` | 18765同一オリジンAPI、HTTP保護 |
| `scripts/qa-issue-register-api.mjs` | Promise型Pythonコマンド橋渡し |
| `scripts/qa-autonomy/qa_issue_dashboard_bridge.py` | JSON APIと入力検証 |
| `scripts/qa-autonomy/issue_register_store.py` | Git管理された唯一の台帳・SQLite実装 |
| `scripts/qa-autonomy/qa_chat_intake.py` | CoSチャット受付（既存共通処理） |

障害関連の永続データは引き続き `handoff/` に保存し、
**アプリケーションロジックはGit管理対象に分離**した。
`handoff/issue-dashboard/server.py` は旧呼び出し互換の薄い入口。

## APIの安全条件

- `GET /api/issue-register`：障害台帳と状態集計、CoS自動受付状態。
- `GET /api/issue-register/intake`：曖昧/再発申告の保留一覧。
- `PATCH /api/issue-register/IZK-UT-N`：状態・実機確認メモ・ユーザー確認。
- `POST /api/issue-register/sync`：台帳→SQLiteの明示再同期。

PATCH/POSTは `127.0.0.1`、同一オリジンのOrigin、
`Content-Type: application/json` と専用
`x-qa-issue-control: explicit-user-action` が必須。
未知フィールド、誤ったID、文字列の `user_verified`、長すぎるメモ、
実機確認なしのCLOSEDを拒否する。
正式QA runner APIへはPATCHを許可しない。

## 検証実績（正式QAのPASS件数とは別）

- `python test/test_qa_issue_dashboard_bridge.py -v`：
  5/5 PASS。隔離SQLiteにおける保存・保全・CLOSED認証・不正入力・保留受付。
- `node --test test/qa_v2_issue_dashboard_integration.test.mjs`：
  5/5 PASS。実台帳読込、同一URL、CSRF/Host拒否、PATCH/再同期。
- `node --test test/qa_v2_web_dashboard_test.mjs`：
  既存7/7 PASS。正式QA集計とHost保護の回帰。
- `node test/qa_v2_issue_dashboard_browser_smoke.mjs`：
  **Edge実ブラウザーでPASS**。新タブを表示、135件取得、
  IZK-UT-135検索、詳細展開、QA⇔障害タブ切替、
  実機確認チェックと状態選択の連動（保存はしない）、
  JavaScript例外0。
- 既存受付/CoS監視と共通ストア移設後：
  `python test/test_qa_chat_intake.py -v` 13/13 PASS、
  `python test/test_cos_chat_qa_collector.py -v` 11/11 PASS。

## 稼働・権限の境界

- 正式QAダッシュボード18765を**正規Windowsタスク経由で再起動**。
  QA公式APIの `formalQa=ACTIVE_831`、新障害API `ok:true`、
  `/issues.js` HTTP200、Task Scheduler結果0を確認。
- 18766は不要となり、正規所有者を照合してから停止。
- 他の停止中QA実行タスクは再開していない。
- 既存MD/SQLiteのユーザー承認/正式QA判定を変更するテストはしていない。
- **commit / push / Cloudflare deploy / Native build：未実施。**

障害台帳の受付件数は他の作業者によって同時に増減し得るため、
現在値は統合画面のAPIが返す正本/SQLite最新件数を優先する。
