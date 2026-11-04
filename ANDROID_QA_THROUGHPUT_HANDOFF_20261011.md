# izakanpai Android 実機QA — 2026-10-11 処理速度改善引き継ぎ

## 安全な切り替え

- 対象: 実機 RMX3938 `0O64B26I28103F70`、独立したEmulatorは触らない。
- 正式runnerは `.android-real-device-run/state.json`、2,080件。変更前は PASS 412 / FAIL 220 / BLOCKED 288 / SKIP 100 / NOT_RUN 1,060。
- 旧物理ドライバー PID 8112 には `stop` マーカーで停止依頼し、安全な `STOPPED` / lock解放を確認。
- 改善版物理ドライバー PID 21172 を唯一の実機操作担当として起動。親チャットやEmulatorは実機を二重操作しないこと。
- 現行QA専用APKは `com.izakanpai.commissionpos.uitest` v910015。ローカルQA用APK `.android-qa-autopilot/izakanpai-qa-retest-20261011.apk` SHA-256 `51AA8DD78879FC67A7DDC5B624B526DF63A93EB2E4F57DB517EB608E8C7EA2F1`。インストール版の独立pull SHAまでは本引き継ぎで新たに採取していないので、220件の修正済み再検証についてビルド証明済みと扱わない。

## 実装

- `scripts/android-qa-physical-actionability.mjs`: 実行可能なレビュー済みハンドラ・読み取り専用評価器・個別の安全なオペレーション実装に紐づくNOT_RUNがない画面を、実機巡回候補から外す。形式的なNOT_RUNだけでは巡回しない。正式結果変更なし。
- `scripts/android-qa-windows-driver.mjs`: 上記プランナーを物理watchへ統合し、個別の再試行署名も（Emulatorだけでなく）物理でケース定義・審査済みレシピ・対象ページ・実装ロジック由来の安定署名へ移行する。古い制限回数とクールダウンを維持する。
- `scripts/android-qa-synthetic-store-readiness.mjs`: `QA_TEST_STORE_*` の7種類の合成データ行列をメモリ内で検証・復元。実D1/DB、デバイスへの投入なし。必要な承認/スコープ/所有/復元の8条件を検査。
- `scripts/android-qa-retest-priority-batch.mjs` と `scripts/android-qa-installed-build-readiness.mjs`: 修正候補と正式FAILを別扱い。実機APKの独立照合、ソースmanifest、対象端末/ビルド身元の検証がない限り再検証PASSの証拠としない。
- `scripts/android-qa-hourly-verdict-delta.mjs`: 公式runnerハッシュ保護を確認し、過去1時間の公式PASS/FAIL/BLOCKED増分を算出。巡回件数・再試行数・推定修正を進捗に数えない。
- `scripts/android-qa-ready-cases-audit.mjs`、`scripts/android-qa-new-recipe-candidates.mjs`: 次の新規安全ハンドラを選ぶための読み取り専用監査。

## 判明した実際のスループットブロッカー

- 既存 `approvedQueue` 212件は、公式runnerですべて既に PASS 51 / FAIL 99 / SKIP 62、**NOT_RUN は0件**。広域巡回中に `broad_sweep_approved_recipe_batch` が無い理由はここにある。承認済みレシピの単純再実行は新規処理にならない。
- 2,080件中 NOT_RUN 1,060件には、未実装のINPUT/CONTROL/SETTING_PROPAGATION/OPERATIONが多数ある。未実装をPASS・FAIL・BLOCKEDへ一括変更することは禁止。
- 現状のレシピ形式に合う未承認 NOT_RUN は28件のみで、readonly/非表示/自動保存/機器依存/秘密情報/金融モーダルが多数。表示条件・副作用を個別レビューせず自動承認しない。
- `receipts.html` / `register.html` は実機の安全な画面遷移が見つからないログがある。システムBackや強制URL遷移で迂回しない。
- 機能/DB設定の保存を要するテストは、専用QA店舗の実DB隔離・復元検証と、**ユーザーの別途明示承認**が必要。Cloudflare Worker更新・D1 migration・commit/push/deployは未許可。
- 正式runnerで**毎時200件以上**の新規確定というユーザー指定目標は、改善版初回測定では未達。毎時20件は誤設定だったため、2026-10-11に計測コードと毎時レポート設定を訂正。既存FAIL 220件のソース修正候補は正式PASSではなく、再検証は現行build/remote Worker/DB schemaの一致が必要。

## 安全な確認（read-only）

```powershell
node scripts/android-qa-windows-driver.mjs status
node scripts/android-qa-hourly-verdict-delta.mjs
node scripts/android-qa-recipe-queue.mjs next-approved 2080
node scripts/android-qa-ready-cases-audit.mjs
node scripts/android-qa-retest-priority-batch.mjs
node scripts/android-qa-synthetic-store-readiness.mjs QA_TEST_STORE_A
node test/android_qa_physical_actionability_test.mjs
node test/android_qa_hourly_verdict_delta_test.mjs
```

停止が必要なときは専用 `node scripts/android-qa-windows-driver.mjs stop` を使い、安全な `STOPPED` とロック解放まで待つこと。driverやrunnerを `kill`/resetしない。ユーザーが許可したのは安全な切り替えまでであり、実際のサービスへの更新は含まれない。
