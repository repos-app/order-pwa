# Workerリリースの排他・再利用・並行実行（2026-11-14）

## 正規の実行経路と状態

- 計画: `node scripts/release/deploy-impacted-workers.mjs --base=<base-sha>`。読取り専用
- リリース: `node scripts/release/deploy-impacted-workers.mjs --base=<base-sha> --execute-production --schema-preflight`
- 正規の実行は**main・未コミット差分0・origin/mainとの一致**が必須。差分にWorker影響が0件なら、全店舗D1監査や126件テスト・Workerビルドは実行せず、公開RPC整合を読み取り検証して終了
- 現行アプリの変更と正式Android/iOS QAの判定は別工程。ここでPASSとして記録しない

## 並行作業

- 同一Windowsユーザー／PC上の別クローン・Gitワークツリーも共通の `%LOCALAPPDATA%/izakanpai/production-worker-release-v1/active.lock` により、Workerの**リリース実行を1件だけ**受け付ける。atomic directory create と PID・owner token で所有者を確定
- **別PCとGitHub Actionsも含む分散排他**: Control D1の `production_release_lease`（`control-plane/0020_production_release_lease.sql`）へ原子的な `INSERT ... ON CONFLICT ... WHERE expires_epoch <= unixepoch() RETURNING` を実行。リースが取得できなければ本番デプロイを一切開始しない。同じリソース `workers` に対する全ての正規公開経路で共有
- リース期限は15分、120秒間隔で**独立した子プロセス**が生存中に更新する。親が同期的に長いテストを実行しても更新できる。トークン・Git SHA・DB時刻を利用し、失効した旧所有者による更新／解放はできない。デプロイ直前にリースを再確認する
- D1テーブル・認証が未設定、レスポンス不正、リースが失効した場合はリリースを**FAILとして停止**し、未確認の本番アップロードを続けない
- 正常終了・異常終了の別を問わず他の生存プロセスからロックを奪わない。30秒以上残存した**死んだ所有者**のみ安全なrenameで隔離し回収。所有権が変更されたロックを旧ワーカーが削除しない
- Common Workerの単独デプロイも同一ロックを使用。既存の `npm run deploy` からの公開API単独デプロイも `wrangler-api-with-lock.mjs` へ統一し、同じロック・バージョン照合を利用。リリース親の生存PID・トークン・HEADを検証できた子プロセスのみ親ロックを利用可能
- 本番13店舗の読み取り専用D1照合は**同時2件まで**。対象・結果の順序を保ち、1件失敗しても残りを監査し、最終判定は1件でも失敗すればFAIL。Cloudflare負荷を考慮し無制限並列にしない
- 他の開発作業者の未コミット差分は保全する。汚れた共用ワークツリーから本番反映をしない。必要なら同じGit履歴のクリーンな隔離リリース用チェックアウトを使う

## 不要・重複作業を除外する条件

1. 各Workerの**全依存ソース・本番Wrangler設定・package-lock**をSHA256で照合。過去のデプロイ成功をローカル証跡として保存
2. 次回の同じWorker反映では、Cloudflareの `wrangler deployments status` を再取得し、**現行100%適用のVersion IDが成功証跡と一致**した場合だけアップロードを省略。コミットが違ってもバンドル／設定が同一なら省略可能
3. 途中で1 Workerが失敗した場合、成功したWorkerの証跡は残す。再開時は失敗・未確認Workerのみdry-runと反映を行う。ローカル記録のみでPASSを作らない
4. 既存の `verified-pass-cache` を維持し、**証拠や外部状態に依存するテストは自動再利用しない**。新規／変更箇所と失敗ケースは再実行
5. 同じロックを保有する親リリースが全店舗D1監査に成功した場合、Common Workerの直後の再監査は、**同じHEAD・同じschema判定ソース・同じowner token・20分以内**に限って省略。直呼び、期限切れ、トークン不一致、ソース変更は必ず全店舗を再監査
6. 各コマンドの時間・PASS/FAIL・timeoutを `RELEASE_PHASE_RESULT` で出力し、再発時の実測を取得できる
7. `package.json` のscriptsだけの変更は、ビルド依存や他メタデータが変わらないことを旧コミットと照合できた場合のみ、Workerバンドル変更から除外する。テスト影響の判定には引き続き含める

## 完了条件・制約

- Worker dry-run全件PASS → デプロイ順に実本番アップロード → Cloudflare現行バージョン確認 → 公開Health（APIが対象の場合）・実Common RPC契約照合
- 判定不能なデプロイ／Cloudflareステータス不一致はFAIL、成功の偽装は禁止。中断時のロック回収でも正式PASSは増えない
- 対象は**正規Workerリリース、Common専用・公開API専用のラッパー**。これらは同じControl D1リースでクロスホスト排他される。Cloudflare認証を別経路で直接使う生Wrangler CLIは技術的にバイパス可能なため運用で禁止する。別PC/CIの正規リリース経路では分散ロックが必須
- 本番Workerへの再デプロイは、改善コードの実装・ローカルテストそのものとは別。変更がWorkerバンドルに影響しない場合は不要な反映をしない

## 実測（同日、本番D1読取りのみ）

- 従来の逐次照合は5～6分程度。13店舗2並列の新方式は**131.57秒、13/13 PASS・FAIL 0**。これは同じ環境での1回の実測で、以後のCloudflareレイテンシを保証する値ではない
