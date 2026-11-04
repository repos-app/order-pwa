# QA2-KEEP-PT-INP-0348 — 次の未完了1件／共通復元式正式QA

実行日: 2026-10-15（フィリピン時間）。Realme RMX3938、ADBシリアル `0O64B26I28103F70`、QA APK `910017`、検証専用テナント `teat`。

## 実行範囲と結果

- 正式ケース: `QA2-KEEP-PT-INP-0348`「割引ルールの管理者承認要求ON/OFF、保存・再表示・会計画面への派生効果」。正式ランナーで物理Realmeに1件実行した。
- 0344は未完成の独立アダプターのため選定せず。0348は既存の親承認・QA所有割引データ・正規Nativeドライバーを確認して選定。
- ソース対応: `scripts/qa-v2-realme-settings-batch-generic.mjs` 内の0346/0347/0348共有ドライバーで、会計プレビューに必要なQA専用割引の一時有効化を共通化した。以前0348が `QA_SETTINGS_ADMIN_RULE_NOT_AVAILABLE` となった条件を解消。
- 共通ライフサイクル: `qa-v2-realme-fixture-lifecycle.mjs`、`qa-v2-realme-retained-discount-lifecycle.mjs`、`qa-v2-realme-cleanup-proof.mjs` に接続。開始時の署名済み全割引ルールと終了時の値を独立照合し、必要なら当該QA所有ルールの `enabled`・`managerApprovalRequired` だけを原状復帰する。
- ソースレビュー: 起動ドライバーSHA `68d6c564f42d2d13115083a6ace945d5338da94c17acabe8be231604b9491a71`、依存10ファイルのツリーSHA `e7c761ac6dc08bdc13987ac731976808cd66d9fab288ddd6f668126081a62b40`。元の承認済みレシピと親バッチに新たなSHAを反映。独立レビュー記録: `test/plans/qa-v2-realme-unattended-approved/dependency-review-qa2-keep-pt-inp-0348-e7c761ac6dc0.json`。
- 共通基盤・承認管理を含むオフラインテスト36件PASS。正式ランナーで1件の実機実行は約46.4秒。
- 実機結果: `INCOMPLETE`。正確な停止理由 `QA_SETTINGS_MANAGER_NONAPPROVER_GATE_NOT_EXERCISED`、段階 `admin-0`。管理者承認を必要とする割引について、本QAセッションでは非承認権限ユーザーの表示条件を証明できなかった。アプリ本体のFAILは未確定で、公式PASS/FAILに増分なし。
- 証拠: `test-results/qa-v2-evidence/settings-QA2-KEEP-PT-INP-0348-120d8050ac45120a/QA2-KEEP-PT-INP-0348.json`。Nativeスクリーンショット4枚＋構造化トレース1件。全5証拠のファイルSHAが一致し、PNG4枚の解像度720×1600を確認。
- 復元証明: `test-results/qa-v2-evidence/settings-QA2-KEEP-PT-INP-0348-120d8050ac45120a/QA2-KEEP-PT-INP-0348-cleanup-proof.json`。`verified:true`、`restorationAttempted:true`。前後の署名済みDB状態ハッシュは双方 `73d980b567ff085e2e2c0e41cea32230df3d3503a7a177c815b81d38b32e3f1d`。
- 公式 `RUNNING` が自動的に解放され、`NOT_RUN` に戻った。最終集計: PASS 294 / FAIL 47 / BLOCKED 2 / NOT_RUN 488 / RUNNING 0。排他実行ロックなし。

## 障害分類と次回に必要な条件

今回のブロッカーは **QA_DRIVER／テスト前提（実ユーザー権限）不足**。アプリ障害の採番はしない。`admin.html` の `currentUserCanApprove()` は実際の管理者権限に依存する。非管理者ロールに擬装する単なるローカルStorage書換えでは正式な権限検証にしない。実際の `teat` 一般ユーザーによる認証セッションと、その後の元の管理者セッション復帰を事前に安全に用意できた場合のみ再実行する。

## 10回自己レビュー

1. 元の正式ケースの期待チェックポイントと割引フラグを照合 — 実施。
2. 0348が `NOT_RUN` であること、過去のFAIL/PASSを上書きしないこと — 実施。
3. Realmeシリアル、ビルド、720px以上、単独claim — 実施。
4. QAテナント `teat` と一意の所有割引ルール — 実施。
5. 旧0348失敗の原因である無効化状態をQA所有ルール限定で一時有効化 — 実施。
6. 変更前データを署名付きで取得してから書込み — 実施。
7. 他の割引ルール／他の店舗に変更なしを確認 — 実施。
8. 失敗時にも旧 `managerApprovalRequired` と `enabled` を復元 — 実施。
9. 復元ハッシュ証明がない場合は `RUNNING` の自動解放を拒否 — 回帰テスト＋今回の正常解放を確認。
10. 実際の非承認者の表示条件が未検証ならPASS/FAILを付けない — 実施。

## 10回横展開レビュー（実施／未移行を区別）

1. 0346 税免除チェック — 同じ共有ホストに一時有効化前提と復元機能を適用。実機再実行未実施。
2. 0347 身分証必須チェック — 同じ共有ホストに復元機能を適用。既存の正式PASSは変更なし。
3. 0348 管理者承認チェック — 共通処理使用・今回実機INCOMPLETE。
4. 0349 有効化チェック — 異なるドライバー経路、未移行。
5. 0343 割引計算方式 — 前回の共有復元基盤でPASS。結果不変。
6. 0344 割引額 — 独立検証と正式承認待ち、今回対象外。
7. 0345 表示順 — 正式FAILの証拠と結果に変更なし。
8. 会計画面Native選択・管理者条件 — Sourceの非承認者ゲートに依存し、今回の前提不足を明記。
9. 公式台帳・claim・pause — 0348のみの実行・解放。iOS/エミュレーターの停止設定は不変。
10. Git/デプロイ — 編集はローカルQA基盤・テスト・承認記録に限定。コミット・プッシュ・本番デプロイは未実施。
