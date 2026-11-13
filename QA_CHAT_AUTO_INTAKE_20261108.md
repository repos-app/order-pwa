# Izakanpai チャットQA受付の自動登録基盤（2026-11-08）

> **現在の運用URL（2026-11-08統合後）:** `http://127.0.0.1:18765/#issues`。
> 以前の `18766` 独立画面は廃止して停止。下記の18766に関する
> 記述は導入当時の検証履歴です。正本・SQLiteは従来のhandoff内に保持。
> 共通実装は `scripts/qa-autonomy/issue_register_store.py` に移し、
> Git管理されるよう変更しました。

## ゴール

利用者がChatGPT/CoSに「注文金額がおかしい」「この画面を改善して」等と
通常の言葉で報告したとき、追加指示なしで既存の障害表へ受付する。
単なる質問、同じ問題の再指摘、同じチャット内の複数指摘を区別する。
受付と実機正式QAのPASS/FAILを混同しない。

## 実装

- 既存正本 `handoff/GPT_実機テスト障害台帳.md` と
  `handoff/issue-dashboard/server.py::sync_from_ledger` を再利用。
- Git管理する `scripts/qa-autonomy/qa_chat_intake.py`
  （`handoff/issue-dashboard/chat_intake.py` は呼び出し互換の薄い入口）：標準入力JSON受付、
  バリデーション、マスキング、Windows/POSIX排他ロック、最大ID採番、
  出典付き追記、SQLiteイベント冪等台帳、既存同期の起動。
- `(conversation_id, message_id, report_key)` のハッシュで再試行を重複排除。
  異なる1メッセージ内の不具合は `report_key=1/2/3` で分割。
  同じタイトルの既存IDへの更新にも対応。曖昧な言い換えの自動統合は
  誤統合防止のため禁止し、GPTが正本を読んで既存IDを指定する。
- 既存CLOSEDは勝手にREOPENせず「再発申告・要確認」を保持。
  質問や情報不足の申告も取りこぼさずSQLiteで保留。
- ダッシュボードに保留件数/直近100件を返す読み取りAPI
  `GET /api/chat-intake`、未確定一覧を追加。正式QAの判定表は不変更。
- CoS各チャットから呼ばれるよう、既存 `AGENTS.md` に
  受付方針を追加。

## 全CoSチャットへの接続（ユーザー確認済み）

ユーザーは**すべてのチャットをChat On Steroids経由で利用**すると確認。
CoSの既存ループバック control API の `GET /v1/sessions` と
`GET /v1/sessions/{id}/events` を実機確認した。
各CoSセッションの `user_message` には本文、会話ID、メッセージID、
実行時刻が含まれる。新しいユーザー発言は共有APIから取得可能。

新設 `scripts/qa-autonomy/cos_chat_qa_collector.py` は以下の責務を持つ。

- CoS全セッションの更新時刻で巡回（最大12ページ・250セッション/回）。
  新着イベントは `from=<seq>` で増分取得（最大25ページ/セッション）。
- 取得済みカーソルを既存 `handoff/issue-dashboard` 下の
  `cos_chat_monitor.db` に保存。起動前の過去全発言は勝手に取り込まず、
  導入時以降の新着を処理する。繰り返し実行しても同じ会話ID・発言IDで
  `qa_chat_intake.py` が重複受付を抑止する。
- Izakanpai名やPOSの業務用語と不具合・改善要望の表現を照合して候補化。
  明瞭な指摘は正本へ登録、曖昧な指摘・類似案件は保留台帳へ送る。
  ChatGPTの会話中GPTによる意味理解・既存ID照合は引き続き優先。
- CoS APIに異常・カーソル不正・処理上限が出た場合はエラーを記録。
  全セッションを読み切らない限り成功カーソルを進めない。
- 外部送信・AIへの追加依頼・ビルド/デプロイ・正式QAの状態変更はしない。

Windows専用の定期タスク **`ChatOnSteroids-QA-Chat-Intake`**
（1分ごと、`IgnoreNew`、1回の制限3分）を別に作成。
起動内容は `scripts/qa-autonomy/cos-chat-qa-intake-task.ps1`。
直近結果は `handoff/issue-dashboard/cos_chat_monitor.last.json`。
他の既存QAタスクは再有効化していない。

この仕組みはCoSに載ったすべてのチャットが**監視対象**だが、
スクリーンショットのみの報告や文脈が省略された発言を機械的に
100%意味理解するものではない。保留一覧の確認と会話中のGPTの
登録処理を併用し、誤採番・正式QAの偽PASSを防ぐ。

## 実施/未実施

- CoSワークスペースへのソース実装・単体/統合テスト：実施。
- `python test/test_qa_chat_intake.py -v`：
  **13テストPASS、0 FAIL、exit 0**。単一発言の再処理、
  同一メッセージの複数事象、同タイトルの既存IDへの追記、
  CLOSE済みへの再発申告、既存ユーザー受入状態の保全、
  質問の保留、状態更新コメント、真の関連ID不在時の拒否、
  他プロジェクト遮断、秘密値マスク、正式判定未更新、
  ダッシュボード保留読み取りを独立一時DB/MDで確認。
- `python -m py_compile` および `node --check`、対象差分
  `git diff --check`：いずれもexit 0。
- Windows PowerShell経由の日本語標準入力は初回に
  **エンコーディング不一致FAIL**、`sys.stdin.buffer`からのUTF-8厳格デコードへ
  変更後に本物の障害台帳への受付を成功させた。同一内容を再送すると
  `duplicate_source`（二重採番なし）を返した。
- 実正本への受付実証：今回の利用者希望を **IZK-UT-135** の
  `change_request / OPEN`として登録。2026-11-08 実測：
  正本133件（ID重複0）、SQLite133件、JSON133件、
  同一送信の記録は1件、GPT修正キューに135が含まれる。
  既存CLOSED57、OPEN29、REOPEN6、WAIT_TEST41の合計133。
- `GET /api/chat-intake` のハンドラは独立テストで応答内容を確認。
  既存の正式QAダッシュボードが `127.0.0.1:18765` を使っていた
  ポート衝突を検出し、**障害ダッシュボードだけ18766へ分離**。
  Windowsで障害ダッシュボードの隠しプロセスを起動し、
  `GET /api/meta` が133件、`GET /api/chat-intake` がHTTP200、
  `GET /app.js` がHTTP200、既存正式QAの18765もListen継続を実測。
  ブラウザー画面操作・視覚比較は未実施。
- 正式QAケースへのPASS/FAIL登録：未実施（本機能の対象外）。
- CoS APIのセッション・user_messageスキーマ、updatedAtソートと
  nextCursor/from増分ページング：実CoS応答で確認。
- CoSコレクター独立テスト：
  `python test/test_cos_chat_qa_collector.py -v`：**11 PASS / 0 FAIL / exit 0**。
  別々のCoSチャットから同じ報告→一つの実台帳IDへの統合、
  新規/増分取得、他プロジェクト誤認防止、同じ発言の非再実行、
  エラー時の未完了維持、既存IDの特定を独立一時DBで確認。
- 受付本体 `python test/test_qa_chat_intake.py -v`：
  **13 PASS / 0 FAIL / exit 0**（両者計24 PASS）。
- ソース構文検証：`python -m py_compile` およびダッシュボード
  `node --check` はexit 0。
- CoSコレクターWindows定期タスク：実機で登録/起動し、
  **1分間隔・Ready・LastTaskResult 0** を確認。
  09:33 PHTの直近実行は `scan_complete:true`／
  sessions 1／新規user_message 0／新規受付0／errors 0。
  この実行は新しいQA発言を受けていないため、新規案件の実採番実績ではない。
  一方、異なる会話間のID集約は独立DBの結合テストで検証済み。
  ダッシュボード18766の `/cos_chat_monitor.last.json` HTTP200を確認。
  UI上でも5分以上最新結果がない場合に監視が古い旨を表示。
- 正式QA旧タスクの復旧やブラウザー常駐キャプチャ：未実施。
- Git commit/push、Cloudflare配備、ネイティブビルド：未実施。
