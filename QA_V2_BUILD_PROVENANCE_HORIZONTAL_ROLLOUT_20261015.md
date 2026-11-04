# QA基盤の版番号固定を廃止 — 全Realmeケースへの横展開（2026-10-15）

## ユーザー要求

「QAビルド番号が上がるのは日常運用なので、910017をプログラムに固定する設計をやめ、全機能へ横展開する」。

**採用した原則:** テストの承認対象は *そのケースの承認済みビルド*。単に現在端末に入っているAPKが新しい／`latest`であるだけでは承認されない。ビルド切替のたびにソース修正はせず、新しいAPKの独立署名・SHA・埋込みHTML検証、ビルド登録JSON作成、別々の親/子レシピの正規レビューという**データ操作**で対応する。

## 横展開の実績

1. 共有照合 `scripts/qa-v2-realme-build-provenance.mjs`：`loadBuildPin({root,build})` と `resolveApprovedRealmeBuild({root,batch,recipes})`。親バッチと**全子レシピ**が同じ `buildPinSHA256` を指すことを検証。未登録ビルド／署名方針違反／APK SHA改変／パス逸脱／`latest` を拒否。
2. `scripts/qa-v2-realme-case-build-gate.mjs`：公式claimの `buildIdentity`、親承認のビルドピンSHA、QA端末観測を照合。`scripts/qa-v2-realme-unattended-pilot.mjs` は最初の公式claimより前にパッケージ名・物理端末 `dumpsys versionCode`・デバイス内 base.apk の SHAを登録値と比較し、承認済みビルド番号とmanifest SHAを子プロセスに渡す。
3. 設定・割引・会員・予約・印刷・レジ・決済・注文・利益・各worker A/B/Cなどの物理正式ケースに同じ `approvedCaseBuild(...)` 契約を水平展開。各ケースは **親の `QA_REALME_APPROVED_BUILD` / `QA_REALME_APPROVED_BUILD_PIN_SHA256` と現在の公式claim**の組み合わせが一致しない限り fail-closed。
4. 設定上の復元証明 `scripts/qa-v2-realme-cleanup-proof.mjs` を版番号可変に変更。失敗時の復旧 `scripts/qa-v2-realme-batch-recovery.mjs` も同じ `resolveApprovedRealmeBuild` を再評価し、誤ビルド・SHA不一致のときは公式PASS/FAILを増やさずclaimを保持。
5. ケース承認CLIを `--build <明示した登録済み番号>` へ移行。共通承認は親＋レシピのビルドピンSHA・起動ファイルSHA・ローカル依存モジュールツリーSHAを固定。過去の910017レビュー履歴は維持、異なるビルドの新承認を別のファイルに保存。
6. `scripts/qa-v2-realme-apk-entry-reader.mjs` を一般化。従来の `910017-source-attestation` から共通のAPK ZIP読取を分離し、正規配布物の中身をビルド番号に依存せず読み取れる。ZIPの重複パス／存在しない埋込み設定ページ／異常サイズも拒否。
7. `scripts/qa-v2-realme-final-evidence-audit.mjs`、`incomplete-evidence-audit.mjs`、`two-incomplete-evidence-audit.mjs` は、現在のデバイスではなく**証拠に記録された当時のビルド**と対応する登録情報を使用して照合。既存0342・0346・0348 PASS、0344・0363 INCOMPLETEの証拠を再監査してエラーなし。
8. 版番号と署名・ハッシュの登録情報は `test/plans/qa-v2-realme-builds/build-<version>.json`、共通署名方針は `signing-policy.json`。910017・910018双方の登録検証PASS。将来の任意バージョンを模した `420123` の純粋オフライン試験もPASS。ビルドの昇格は自動承認ではない。
9. PowerShell側のエミュレーター用ログインも `-Build <明示値>` を要求。エミュレーターの命名からAPK番号を勝手に推測せず、デバイス内APK SHAと登録値を照合する。`Watch-AndroidQaEmulatorSafe.ps1` は未指定の際**監視のみ**であり、勝手にログイン試行しない。停止中のエミュレーターは実際に起動していない。
10. `scripts/qa-v2-build-version-hardcode-gate.mjs` と `npm run qa:build-version:check` を追加。物理QA・worker関連152ソースで実行用ハードコード0件（QA版番号系列）。14件の明示例外は当時のAPKを特定する**凍結された証拠／旧fixture確認専用**。Android GitHub Actionsとモバイル標準CIに本ゲートを追加。追加変更で実行用に `910019` 等を直書きすればCIが失敗する。

## 検証ログ（ソース／オフライン／既存証拠のみ）

| 項目 | 実測結果 |
|---|---|
| 全横展開QAオフライン回帰テスト | **309 PASS / 0 FAIL**、34 test files。最終実行 `npm run qa:build-provenance:test` → `{suiteCount:34, tests:309, pass:309, fail:0, verified:true}`。初回の手動test runログ `test-results/qa-v2-monitor/qa-build-horizontal-offline-20261015.log` |
| バージョン静的検査 | **152 source files / runtime違反0 / historical例外14**。`npm run qa:build-version:check` PASS |
| 異常終了後のレガシー復旧検証 | 親バッチ+子レシピSHAが異なる場合はclaim操作0回（否定系）、一致時は正式なrestore・記録／解放のモックPASS |
| 過去正式PASS監査 | 0342、0346、0348: 原証拠SHAと版番号照合OK、結果を書き換えず |
| 過去INCOMPLETE監査 | 0344、0363: 復元証明とレガシー910017登録照合OK、正式PASS/FAILを追加せず |
| APK 910018検証 | ビルド番号910018、QAアプリID、従来署名、APK SHA、埋込み `settings.html` SHA及び修正済み `value<0.01` 条件を確認済み |
| 公式Android QA台帳 | **PASS297 / FAIL47 / BLOCKED2 / NOT_RUN485 / RUNNING0**、実行ロックなし |

途中の全体テストでは303件中9件失敗を検出。主原因は正式child失敗時の復旧が新ビルド承認を受け取らない実装漏れと、QRテストが旧版番号を期待する古いテスト断言。**承認済みビルドの照合を復旧実装そのものに導入**し、構成済みオフラインピン／公式claimを使うテストに直して309/309 PASS。単なるテスト無効化や公式台帳の書換えではない。

## 新しいビルドを使う際の通常手順

1. QA package ID、正式署名、versionCode、APK SHA、埋込みソースSHAを正規APKから独立して確認する。
2. `node scripts/qa-v2-realme-register-build-pin.mjs --inspect <検証するQA APK相対パス>` で読み取り確認し、初回登録のみ `--register`。既存ビルドのピン上書きは拒否。署名方針の変更は別途レビュー。
3. `node scripts/qa-v2-realme-batch-proposal.mjs --driver ... --cases ... --build <version>` で承認前の候補を取得。ケース手順・ソース・テストデータ・依存ツリーを人間/親レビューし、`buildPinSHA256` 付きの親バッチと子レシピを**版番号別の新しいファイル**として承認する。
4. `--plan` で承認済みケースと端末実物の整合を確認。必要なら安全な端末更新を独立工程で行い、**現在端末の版番号や `latest` だけで自動承認・自動インストールはしない**。
5. `--run` では親ランナーが認証済み実機に対しSHA等を検査してから唯一の公式claimを取得。失敗時は同じビルドピンで復元・証拠を独立照合し、公式PASS/FAIL/INCOMPLETEを正しく記録。

## 明示的に残る境界

- 910018の**正式Realmeテストはまだ実施していない**。端末のインストール版は依然910017。0344の固定額最大値の仕様は未確定、0363のQRテスト画像の安全な登録・R2削除保証も未完了。今回の横展開ソース移行はこれらのアプリ/fixturesの検証結果を意味しない。
- 14歴史例外は「実行版が固定されているドライバー」ではない。過去の910017/910018出典を再現する証拠専用・旧テスト準備CLIで、旧10件fixtureの破壊的作成・試行処理はinspect-only化。旧caseのPASS証拠・ファイルを新バージョンの真偽判定に流用しない。
- QAフォルダー全体にこの作業前から多数の未コミット/未追跡編集がある。今回の変更は**コミット・プッシュ・デプロイ・R2書込み・実機APKインストールなし**。新CIゲートのクラウド実行はこれらが正しくバージョン管理された後に初めて有効になる。

## 10観点の自己レビュー

1. 親バッチからの明示版番号選択とversionCode桁の形式 — PASS。
2. 不正なSHA／`latest`／未登録ビルド拒否 — PASS。
3. 正規署名・別証明書拒否の方針 — PASS（純粋/ローカル検証）。
4. APK実体のバイトSHAと登録ピン一致 — PASS。
5. APK内WebソースSHAと指定したcontrol entry一致 — PASS。
6. 親バッチ・子レシピの署名付きビルドピンSHA共通化 — PASS。
7. childが独立してparent配布SHAを受け取り、claimと照合 — PASS（オフライン）。
8. 非0終了の復旧ブリッジが未承認SHAを拒否 — PASS（オフライン）。
9. 既存PASS・INCOMPLETE証拠の出典版番号が保存される — PASS。
10. 端末実行ロック・グローバル停止・既存公式結果を維持 — PASS（読み取り検証）。

## 10観点の横展開レビュー

1. Android物理正式QA親ランナー／公式claim — 実装・オフラインPASS。
2. 会員・予約・割引各worker A/B/C — 移行・105件の専任suite PASS。
3. 設定フォーム／チェックボックス／印刷関連ドライバー — 移行・関連suite PASS。
4. 注文・会計・利益・決済・ネイティブ表示判定 — 移行・関連suite PASS。
5. 0343形式レビューと新ビルドごとの独立証拠 — 新版レビュー未作成時fail-closed。
6. 0344/0363の版番号対応、R2 fixture例外 — 親子ピンの実装済み、実機再試験はPENDING。
7. 公式異常終了復旧／INCOMPLETE解放 — pin照合追加・否定系PASS。
8. 原状復元・証拠SHA／過去PASS保全 — PASS。
9. Androidエミュレーターログイン／自動監督 — 明示ビルド制約・構文PASS、実機テストは停止指示を守り未実施。
10. GitHub Actions Androidビルド／標準CI／npm lint — 静的防止ゲート追加、クラウド実行は未実施。
