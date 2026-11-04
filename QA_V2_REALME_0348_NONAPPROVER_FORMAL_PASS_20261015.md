# QA2-KEEP-PT-INP-0348 — 一般スタッフの実認証を使用した正式QA PASS

実施日: 2026-10-15（PHT）、Realme RMX3938 / QA APK `910017` / 720×1600 / 店舗 `teat`。

## 実行と結果

- 以前の `INCOMPLETE` はアプリFAILではなく `QA_SETTINGS_MANAGER_NONAPPROVER_GATE_NOT_EXERCISED`（管理者権限セッションしか使用していなかった）だった。
- 既存のQAアカウント登録表 `test/plans/QA_V2_LOGIN_ACCOUNT_MATRIX_20261013.json` を参照し、`teat-staff`（一般スタッフ）と `teat-admin`（管理者）の**新規作成なしで**実機認証を使用した。
- Windows既存DPAPI保管庫を使用する `scripts/Start-AndroidQaPhysicalLogin.ps1` の `-Login -SwitchAccount -EnsurePortrait` を共有ロール切替モジュール `scripts/qa-v2-realme-role-session.mjs` から呼び出し。ログにログインID・パスワード・トークンは記録しない。
- `scripts/qa-v2-realme-expense-fixture-adapter.mjs` にQA正式claim付きの**非管理者の署名付きロール検証**・管理画面への読み取り専用アクセス・異常時の管理ハブ復旧を追加。ローカルStorageのロール書換え、架空トークン、正式QAの無条件PASSは使用していない。
- `scripts/qa-v2-realme-settings-batch-generic.mjs` の0346/0347/0348共通実行経路に、実スタッフでの会計プレビュー・管理者への認証復帰を追加。0348の正規ケースは実スタッフで `managerApprovalRequired=true` の時に承認入力欄表示、`false` の時に非表示を実測。
- 0348の正式ランナー実行: `attemptedCount:1`, `formalVerdictsAdded:1`, `verdict:PASS`, `elapsedMs:107653`。公式台帳 `PASS:294→295`, `NOT_RUN:488→487`, `RUNNING:0`, `FAIL:47`, `BLOCKED:2`。
- 管理者セッションを元へ戻し、正式QA終了後に**別の読み取り確認**で`teat`のadminロールを検証済み。端末ロック・ロール切替用補助ロックはいずれも残留なし。

## 証拠と安全性

- 正式証拠: `test-results/qa-v2-evidence/settings-QA2-KEEP-PT-INP-0348-35e9640dbfec0d3f/QA2-KEEP-PT-INP-0348.json`。
- PNG `10`枚（うち非承認者会計画面 `nonapprover-admin-0-001.png` と `nonapprover-admin-1-001.png`）。実ファイルのSHA-256と証拠JSON内のハッシュが全件一致。PNGヘッダー・720×1600の寸法も全件一致。
- 構造化証拠 `dependent-trace.json` 1件。`want:true → userCanApprove:false、approvalDisplay:''`、`want:false → userCanApprove:false、approvalDisplay:'none'`。
- 復元証拠 `QA2-KEEP-PT-INP-0348-cleanup-proof.json`。`verified:true`、`restorationAttempted:true`、開始時と終了時の全割引ルール比較SHAが一致。
- 正式ケースの旧期待条件と新チェックポイントそれぞれ `PASS`。他の割引ルールを変更していないことを署名済みデータから再確認。
- ソースレビュー済みレシピ/親バッチの依存ツリー SHA-256 `bf653fdcc6a185fadb8037a01b9cfbf713e481b1c53bd2ebc5f22075a3397f29`、11ファイル。承認の独立証拠 `test/plans/qa-v2-realme-unattended-approved/dependency-review-qa2-keep-pt-inp-0348-bf653fdcc6a1.json`。
- 事前の共有QAオフラインテスト `59`件PASS。アプリ本体、デプロイ、コミット・プッシュ、正式QA別ケース、iOS/Emulator停止指示は変更していない。

## 自己レビュー 10項目

1. 0348のみ正規claim・物理Realme/QA APK 910017を確認。
2. 既存`teat` 2アカウントのDPAPI資格情報あり／未作成・未上書き。
3. ログイン成功だけでなくスタッフの署名付きtoken roleと画面role一致を要求。
4. ロール・テナント偽装（別店舗・管理者をスタッフとする）を否定テストで拒否。
5. ロール切替時も同じ公式claimが有効でなければADB/CDP操作をしない。
6. 自動操作は会計プレビューのみ、会計確定・注文書換えなし。
7. ON/OFF両状態を実スタッフ画面で検証、未確認をPASSにしない。
8. テスト失敗時も管理者セッション復元を実行。復元失敗は正式claim保持。
9. 変更したQA所有ルールは他のルールとともに開始時/終了時データを独立照合。
10. スクリーンショット/構造化証拠・SHA・台帳のPASSを事後照合。

## 横展開レビュー 10項目（未移行は未移行と表記）

1. 0348 管理者承認 — 共通ロール切替を利用し正式PASS。
2. 0347 身分証必須 — 同じ設定ホストに共通ロール切替コードが読込まれるが、役割切替自体は実行しない。
3. 0346 税免除 — 同上。非管理者切替以外の既存独立税込計算オラクルを変更なし。
4. 0349 割引有効化 — 別の実行ルートであり未移行。
5. 0343 固定額/パーセント会計 — 前回PASS。今回の権限切替による再試験は不要、履歴維持。
6. 0344 境界値 — 既存アダプターは正式準備未完了。今回対象外。
7. 店舗認証/トークン — 既存DPAPIを利用、異なる店舗のQA identity使用禁止。
8. データ復元 — ロール復帰とDB復元は別の独立証拠として検証、原状不一致はfail-closed。
9. 端末と全レーン停止 — 既存Realme権限のみ使用。Emulator/iOS正式停止マーカーを変更なし。
10. 機密保護・他QA — 平文資格情報、トークンをコマンド引数・証拠・Gitに出さない。コミット/プッシュ/デプロイなし。
