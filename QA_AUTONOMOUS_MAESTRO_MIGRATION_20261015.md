# izakanpai 自律QA設計・段階的移行計画（A案）

作成日: 2026-10-15 / 状態: 設計案・未導入 / 対象: Android Realmeから開始、将来iOS展開

## 目的と非目標

- 目的: 実機テストの継続実行、ケース単位の正式証拠、停止時の安全な復旧・隔離・次ケースへの進行、ビルド間回帰比較。
- 非目標: AIの判断だけでPASSにする、所有権不明のDBを書き換える、注文/会計の結果不明時に盲目的再送する、既存公式台帳を置換する。
- 完全自動化は「安全に自動処理できる範囲を最大化し、復旧不能はBLOCKEDとして隔離し他レーンを進める」。端末切断/PIN/認証失効/実決済など無条件の無人継続は保証しない。

## 確認した既存資産

- `.qa-v2-official/manifest.json`, `.qa-v2-official/android/state.json`: 正式ケースと状態。唯一の公式結果ソースを維持。
- `scripts/qa-v2-official-runner.mjs`: 正式claim・結果記録の入口。既存の整合性ガードを迂回しない。
- `scripts/qa-v2-realme-unattended-pilot.mjs`: 最大5件のワンショット監督者。`--plan/--run/--status`、承認ファイル、ロック、子プロセス照合を保持。
- `scripts/qa-v2-realme-supervisor-core.mjs`, `scripts/qa-v2-realme-batch-approval.mjs`, `scripts/qa-v2-realme-batch-recovery.mjs`: ケース選別・承認・復旧。
- `scripts/qa-v2-realme-batch-health.mjs`: 読み取り専用の健康診断。
- `test-results/qa-v2-monitor/`: 心拍・イベント・実行状態。
- `scripts/qa-v2-realme-910017-source-attestation.mjs`: 既存APKのソース由来確認。新ビルドでは新たな正確な証跡が必要。
- 既存作業ツリーに多数の他担当者変更がある。移行作業は新規ファイル中心、既存ファイルを無断で上書きしない。

## 推奨アーキテクチャ

1. **Scheduler/Queue (Node.js)**: 公式manifestから候補抽出→readiness審査→承認済みキュー。ケース単位のlease、重複実行防止、優先度、依存関係、ビルド互換性を管理。
2. **Case executor (adapter)**: `maestro` CLIを独立子プロセスとして起動。既存ADB/CDP/HIDドライバーも同じ契約で残す。CLI存在・実機識別・対象アプリ・ビルドをpreflightで検証。Maestroの導入/Windows互換性は現地検証後に確定。
3. **Evidence collector**: 開始前/後の画面PNGとSHA-256、動画または操作ログ、Android logcat、API/DB独立読戻し、fixture before/after、実行されたFlowのSHA、端末/アプリバージョンをケース単位で保存。
4. **Deterministic oracle**: UI表示だけでなく、必要なケースではDB/API・計算値の独立検証。AIは正式PASSの最終判定者にならない。
5. **Recovery controller**: 異常種別・冪等性・状態確認・所有権を検証して復旧。ケースのリトライと次ケースへのスキップを別操作として記録。
6. **AI exception agent**: 保存済みのスクリーンショット・ログ・失敗コード・操作履歴を入力として、診断と復旧候補を提案。許可されたread-only診断やホワイトリスト復旧のみ自動実行。DB削除・注文再送・正式結果改変は権限外。
7. **Supervisor/Watchdog**: Node.jsプロセスをWindowsタスクスケジューラ/サービス監視で再起動。永続ジャーナルから再開。PC再起動後もclaim照合を行い二重実行しない。

## ケース実行契約

`caseId`, `manifestFingerprint`, `platform`, `serial`, `buildId`, `apkSha256`, `tenant`, `fixtureOwner`, `flowSha256`, `expectedOracle`, `cleanupPolicy`, `maxAttempts`, `timeoutMs`, `approvalRef` を固定して実行する。

状態遷移: `DISCOVERED -> REVIEWED -> QUEUED -> CLAIMED -> PREFLIGHT -> EXECUTING -> OBSERVING -> VERIFYING -> CLEANUP -> FINALIZED`。失敗時は `DIAGNOSING -> RECOVERING -> RETRY_READY` または `QUARANTINED`。公式状態との変換は既存runnerの仕様に従い、独自に公式state.jsonを書き換えない。

同じケースの実行IDは一意。すべての副作用操作にidempotency keyまたは事後のサーバー状態確認を要求する。`CLAIMED` の孤児は実機/DB/証拠を照合し、未照合なら公式RUNNINGを勝手に解除しない。

## 復旧判断表

| 異常 | 証拠 | 許容する復旧 | 最終処理 |
|---|---|---|---|
| 要素未検出/待機超過 | 画面、UI階層、ログ | 画面再取得・限定再待機（最大2回） | 再試行失敗なら隔離 |
| WebView表示異常 | 画面、前後URL/DOM | 安全な画面再表示、既知のホーム復帰 | 未解決ならINCOMPLETE |
| アプリクラッシュ | logcat、画面、事後DB | 状態確認後にアプリ再起動 | 独立してアプリ欠陥と証明できればFAIL |
| 認証期限切れ | ログイン画面、トークン状態 | QA資格情報で再認証（秘密はログに残さない） | 失敗ならBLOCKED |
| ADB切断 | serial roster、heartbeat | 限定再接続、端末同一性再検証 | 失敗なら端末レーン停止 |
| PIN/OS権限ダイアログ | OS状態、画面 | 承認済み安全操作のみ | 不明なら停止・通知 |
| データ汚染 | fixture署名、before/after | 所有権のあるQAデータだけ復元 | 不明ならBLOCKED |
| 注文/会計の結果不明 | 注文ID、API/DB readback | 結果を照合。盲目的再送禁止 | 未照合なら隔離 |
| 期待値不一致 | UIと独立oracle | 復旧でFAILを消さない | 正式FAIL候補として審査 |
| 証拠欠損/runner異常 | exit code、journal | 公式claim照合後に限定再実行 | INCOMPLETE/要復旧 |

## Maestro導入の契約

- Flowは `test/maestro/flows/<area>/<caseId>.yaml`。同名メタデータJSONで正式caseId・事前条件・fixture・oracle・cleanupを宣言。
- 画面識別はアクセシビリティID/テキストを優先。座標固定は例外として端末/解像度を記録。日本語・英語を分離。
- Maestroの成功終了コードは**操作完了**であり、正式PASSではない。独立oracleとcleanup成功が必須。
- CLI版/OS互換性、Capacitor WebView要素識別、入力IME、ADB競合、スクリーンショット取得、iOS実機の接続方式を小規模PoCで確認する。現時点では導入成功を主張しない。
- Maestro Flow失敗時もNode.js親プロセスは証拠を収集して次の独立ケースへ進む。安全条件が成立しない場合は同一端末レーンを停止する。

## 段階的移行（ゲート方式）

| 段階 | 実施 | 受入条件 |
|---|---|---|
| 0. 棚卸し/凍結 | 公式caseId、既存ドライバー、実行権、端末、APK、fixtureを一覧化。最新ビルドを固定 | 公式台帳とread-only監査一致、他担当変更なし |
| 1. Maestro PoC | 非破壊5ケースをチャット直接操作で基準取得後、Maestro Flow化 | 5ケースを同一ビルド/実機で再現、証拠取得。正式結果は既存runnerのみ |
| 2. Adapter | Maestro子プロセス→共通case executor→既存claim/証拠パイプライン | 既存ドライバーと同一正式契約、二重claimなし |
| 3. 復旧 | 待機超過・アプリクラッシュ・ADB切断を安全に模擬 | 故障注入テストで隔離・再開・証拠が整合 |
| 4. 自律キュー | 5→10→20ケース、依存ケースはグループ化 | 20件連続処理、公式PASS/FAIL件数と証拠が一致 |
| 5. AI支援 | read-only失敗解析→許可された復旧アクション | AI誤判定でも正式PASSが増えない、監査ログあり |
| 6. 常駐/新ビルド | Windows監督、CI成果物取り込み、APK SHAとケース紐付け | 再起動後の安全再開、ビルド混在なし |
| 7. iOS | XCUITest/Appium/Maestro対応検証と独立端末レーン | iOS実機で同一契約の証拠・結果記録 |

## 重要KPI

- `formal_verdicts_per_hour`（正式PASS+FAILの増分/時）を主指標とする。ドライバー作成数を成果とみなさない。
- `blocked_minutes`, `recovery_success_rate`, `unsafe_retry_count`（常に0）, `evidence_completeness`, `orphan_claim_count`, `retest_pass_rate`, `flaky_case_rate`。
- 毎バッチ `eligible/attempted/PASS/FAIL/BLOCKED/INCOMPLETE/recovered/skipped/remaining` を出す。SKIPはPASS/FAILに加算しない。

## 最初の作業チケット

1. `maestro --version` と `adb devices -l` を**読取専用**で確認し、Windowsでの実行可能性を確定。
2. 未実施489件からread-onlyかつデータ依存が小さい5件を候補選定。正式manifestの期待結果と画面要素をレビューし、実行承認を取得。
3. 新規 `scripts/qa-v2-maestro-adapter.mjs`（CLI子プロセス、タイムアウト、stdout制限、exit code、証拠パス、シグナル処理）とnodecheckを実装。
4. 新規 `scripts/qa-v2-recovery-policy.mjs`（純粋関数、許可アクション/停止条件）と故障注入テストを実装。
5. 5件のFlowとoracleを作成し、PoCで比較。既存公式runner/manifest/state/障害台帳は勝手に変更しない。

## リリース・権限

現時点では設計のみ。端末操作、DB変更、正式claim、commit/push、ビルド、デプロイは未実施。アプリ修正チャットの未コミット変更を上書きしない。Dot/Workの利用可否に関わらずNode.js監督者が単独で動く構成とする。
