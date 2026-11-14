# iOS Simulator smoke / Keychain -34018（IZK-UT-168）

## 2026-11-14 PHT：再調査 3/3 — 同一GitHub FAIL再投入の保留処理

- `gh run list`と`gh api repos/repos-app/izakanpai/actions/runs/43429804879`の読み取りで、最新Simulator Runは `43429804879`・`run_attempt=1`・`conclusion=failure`・終了`2026-11-13T13:16:58Z`のままと確認。新しいmacOSビルド結果は存在せず、前回の署名・権限修正は未コミットでGitHub CIには未反映。旧結果の継続を新たな修正失敗と扱わない。
- 根本の再投入条件：`scripts/operations/github-ci-incident-watch.mjs` はCoSの完了と同じRunのFAILだけで、30分後に最大3回まで再調査を繰り返していた。**ビルド禁止により新しい実行証拠が得られない場合**の保留処理を、既存の外部依存保留機構へ追加。
- 読み取り専用GitHub APIの `run_attempt` を記録。`--hold-build <incident-id>` で `WAITING_EXTERNAL_DEPENDENCY` / `BUILD_EXPLICIT_USER_AUTHORIZATION_REQUIRED` を監視状態へ保存。新しい同一Runの実行試行が失敗した場合だけ保留を解除し新たな調査へ移行し、同一Runの正式SUCCESSも従来どおり回復と判定する。他のワークフローの検知は継続。明示許可のないビルドを起動する操作は追加していない。
- **実監視反映済み**：監視ID `github-ci-repos-app-izakanpai-43429804879` に対して `--hold-build` を実行し、保存済みJSONの `status=WAITING_EXTERNAL_DEPENDENCY`、`reason=BUILD_EXPLICIT_USER_AUTHORIZATION_REQUIRED`、`observedRunAttempt=1`、`attemptNo=3` を読み戻し検証。共有Windowsタスクの再起動・CI再実行は不要。
- 新規監視の正常/負例に加え、既存監視の回帰テストは **14/14 PASS**、構文 `node --check` exit0、差分ゲートexit0。テスト用fixtureがGitHubの実CI PASSを意味することはない。修正後の正式CI PASS増分0、commit/push・Worker反映・DB本番変更・iOS/Androidビルド/配布は未実施。


## 2026-11-13 23時台 PHT：再調査 2/3 の追加対応

- `gh run list`と`gh run view`を再取得。対象Run `43429804879`は `attempt=1`、`conclusion=failure` のまま。これより新しいSimulator Runはない。前回ad-hoc署名修正も`git diff`上の未コミット変更として残っており、CIで実行された記録はない。**「前回の対策がCIで失敗した」とは判定できない。**
- Apple DeveloperのKeychain `-34018 = errSecMissingEntitlement` のトラブルシューティングに従い、前回未実施だった **署名済み.app内部の実効entitlements** を調べる方式を追加。前回の `codesign --verify` は署名の有効性のみ検査し、アクセスグループの有無を確認していなかった。
- `scripts/run-ios-simulator-smoke.sh` がSimulatorへのinstall前に `codesign -d --entitlements - --xml` でビルド成果物からplistを抽出し、`plutil`でJSON化する。`scripts/ios-simulator-keychain-entitlements-check.mjs` は`application-identifier`または`keychain-access-groups`の中に対象Bundle固有のアクセス権があるかを検査。不足・不一致なら `IOS_SIMULATOR_KEYCHAIN_ENTITLEMENTS_MISSING` でexit3。署名・権限の診断JSONとcodesignログをCI artifactに保存する。
- Gateのfixture/CLIテスト `test/ios_simulator_keychain_entitlements_check_test.mjs` を既存workflowのビルド前に配置し、正例・署名有効だが権限なし・別アプリ権限・不正入力を網羅。独立Node検証 **6/6 PASS**、iOS readiness **44/44 PASS**、GitHub署名経路 **17/17 PASS**、Git Bash構文exit0、差分チェックexit0。
- この検査は**次の正式許可されたビルドで原因を早期に確定する補強**。ad-hoc署名で実際にKeychainが使用できるかは未確認。CIをビルドせず正式PASSへ変えることはできない。`BUILD_EXPLICIT_USER_AUTHORIZATION_REQUIRED` は継続。Git commit/push、Worker/DB反映は未実施。


## 失敗の確定証拠

- GitHub Actions `izakanpai-ios-simulator-smoke.yml` Run `43429804879`、SHA `d101e96e0b9ce35157acd164e78762c83e5413fa`、2026-11-13 13:16 UTC終了、FAIL。
- `npm ci`、`npm run mobile:sync`、`ios_release_readiness_test` はCI PASS。Simulator内でXCUITestが実行され、`LoginFlowUITests` は **4件実行・4件FAIL**。画面の実エラーは `An_OS_error_occurred_-34018_`、全4件とも管理メニューへ遷移できない。
- 2026-10-24のRun `40107847301`にも同じKeychain `-34018` と4件のログインFAIL。CIの直近再実行で正式PASSになった証拠はない。
- `node_modules/@aparajita/capacitor-secure-storage/ios/Sources/SecureStoragePlugin/Plugin.swift` はKeychain失敗時のOSStatusを返す。Native `mobile-app/web/native-auth.js` はSession/Remembered loginのKeychain利用を要求する。一方、Simulator smoke scriptは `CODE_SIGNING_ALLOWED=NO` / `CODE_SIGNING_REQUIRED=NO` / identity空で組み立てていた。**未署名実行でKeychainの権限確認に失敗することが最有力の原因**。現在のWindows環境ではmacOS実実行による根因確定はできない。

## 修正

- `scripts/run-ios-simulator-smoke.sh`: Simulator専用 `build-for-testing` だけ `CODE_SIGNING_ALLOWED=YES`、`CODE_SIGNING_REQUIRED=YES`、`CODE_SIGN_IDENTITY="-"`、`CODE_SIGN_STYLE=Manual`、`DEVELOPMENT_TEAM=""` に変更。Apple配布証明書/Provisioning Profileなしのad-hoc署名。既存Debug entitlements、アプリの認証処理、製品ビルド経路には変更なし。
- 同スクリプト: Simulatorへのinstallより前に `codesign --verify --deep --strict "$app_path"` を実行し、署名不備なら早期FAIL。UI認証失敗を成功扱いに変更していない。
- `test/ios_release_readiness_test.mjs`: 署名禁止を固定していた古い契約を更新し、ad-hoc署名、非配布署名、先行codesign検証、手動CI起動を確認する。

## ソース自己レビュー S01〜S10

| 観点 | 実施・根拠 | 状態 |
|---|---|---|
| S01 正本FAIL | Run 43429804879のXCUITest 4/4 FAILと`-34018`を確認 | 確認済み |
| S02 再発 | Run 40107847301も同じOSStatusと4件のFAILを確認 | 確認済み |
| S03 原因経路 | `Plugin.swift` Keychain `storeData` → OSStatusとNativeAuthの保存呼出を追跡 | 確認済み |
| S04 旧設定 | 旧Smoke buildが `CODE_SIGNING_ALLOWED=NO`、identity空だったことを差分確認 | 確認済み |
| S05 署名範囲 | `-sdk iphonesimulator` / `-configuration Debug` の当該commandのみ変更 | 確認済み |
| S06 秘密情報 | Apple Team・Provisioning指定/秘密ファイル読取は追加なし | 確認済み |
| S07 失敗時制御 | `codesign --verify` 失敗は `exit 1`、既存XCUITest失敗はexit65のまま | 確認済み |
| S08 実装整合 | 実体が存在するか検査した後、Simulator installより前に署名検証 | 確認済み |
| S09 テスト退行 | 旧未署名状態でreadinessテストexit1、新契約/修正後43/43 PASS | 確認済み |
| S10 コード品質 | Git差分対象2ファイル、`git diff --check` exit0、Git Bash `bash -n` exit0 | 確認済み |

## 横展開レビュー H01〜H10

| 観点 | 実施・根拠 | 状態 |
|---|---|---|
| H01 iOS Debug | `project.pbxproj` のDebug entitlement `App-Debug.entitlements`参照を確認、変更なし | 確認済み |
| H02 iOS Release | `App-Release.entitlements` / Signed IPA workflowの独立性を確認 | 確認済み |
| H03 署名別作業 | 他作業者dirty `scripts/github-ios-signed-build.sh`を保持、差分なし | 確認済み |
| H04 TestFlight | Codemagic経路を変更していないことを対象差分から確認 | 確認済み |
| H05 iOS CIトリガ | `izakanpai-ios-simulator-smoke.yml` は `workflow_dispatch` のみ | 確認済み |
| H06 Screenshot | `capture-ios-app-store-screenshots.sh` はSmoke生成済み同一`.app` / `.xctestrun`を利用 | 確認済み |
| H07 Native認証 | `native-auth.js` のKeychain保存/復元は変更なし、Node認証テスト118/118 PASS | 確認済み |
| H08 Android/Web | `rg` と `git diff` でAndroidやWeb配布ソースへ署名変更なし | 確認済み |
| H09 同型設定 | `rg CODE_SIGNING_ALLOWED=NO` で他のSmokeスクリプトへ残存なし | 確認済み |
| H10 正式QA境界 | 署名ビルド/Simulator/正式Runは新たに実行していない。macOSでのKeychain改善確認が未実施 | 未検証（ビルド禁止） |

## 検証と残件

- **ビルド不要・ローカル**: `node test/ios_release_readiness_test.mjs` 43/43 PASS、`node test/ios_github_build_workflow_test.mjs` 17/17 PASS、`node test/native_auth_test.mjs` 118/118 PASS、`bash -n` exit0、`git diff --check` exit0。
- **正式CI**: Run 43429804879はFAILのまま。修正したソースでのmacOS Simulator実ビルド、署名確認、Keychain読み書き、4件のXCUITestは未実行。`BUILD_EXPLICIT_USER_AUTHORIZATION_REQUIRED`。
- **配布状態**: local source変更のみ。commit・push・CI workflow再実行・Worker反映・D1本番書込み・TestFlight配布はすべて未実施。
