# iOS GitHub Actions FAIL調査：Apple契約と署名プロファイル（2026-11-13 PHT）

対象: `repos-app/izakanpai` / `.github/workflows/ios-build.yml`、監視ID `github-ci-repos-app-izakanpai-43429257845`。台帳 `IZK-UT-166`、`IZK-UT-167`。

## 失敗の確定事実

- **Run [43429257845](https://github.com/repos-app/izakanpai/actions/runs/43429257845)**、commit `d101e96e0b9ce35157acd164e78762c83e5413fa`、`ios-signed-ipa` FAIL。`Ensure TestFlight Test Information` の `GET /v1/apps` にApple APIが **HTTP 403 `FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED`** を返却。IPA archive・uploadはSKIPPED。Apple側で有効な契約の確認・締結が必要。業務アプリのAPI・画面不具合を示す証拠なし。
- **後続Run [43429457913](https://github.com/repos-app/izakanpai/actions/runs/43429457913)**、同一commit、FAIL。`xcodebuild archive` がexit **65**。`izakanpai-github-actions-appstore` Provisioning Profileに **Push Notifications capability** と **`aps-environment` entitlement** がない。ソース `ios/App/App/App-Release.entitlements` は `aps-environment=production` を要求し、Xcode Release targetがこれを使用。Apple Developerの対象App IDでPush Notificationsを有効化し、App Store配布用Profileを再生成してGitHub Secret `IZAKANPAI_IOS_PROVISIONING_PROFILE_BASE64` を更新する必要がある。
- 2026-11-13調査時点で確認した`ios-build.yml`最新2 RunはいずれもFAIL。リポジトリのローカルHEADは`497fed6`だが署名資材の更新は含まれない。過去の成功Runから今回のPASSを推定しない。

## ソース修正・ローカル検証

既存の`github-ios-signed-build.sh`はProfileのteam、bundle、`get-task-allow`を検査していたが、Release appの要求entitlementsとProfile付与値の照合がなかった。`security cms`で展開したProfileの`Entitlements`とXcode Release targetが参照する`App-Release.entitlements`をmacOSの`plutil`でJSON化し、共通の `scripts/ios-provisioning-entitlements-check.mjs` に照合させた。すべての要求キーを検査し、配列値はProfileに必要値が含まれるかを照合。**`xcodebuild archive`前**に不足権限と更新すべきSecretを出力し、exit 3で停止する。鍵やProfile値はログに出さない。

本件はソース上の**早期検出改善**であり、Apple契約状態またはGitHub Secretそのものの修復ではない。

### 検証証拠（Windows、ビルド不要）

- 検査追加前の`node test/ios_github_build_workflow_test.mjs`：新規「Archive開始前にRelease entitlements照合」のassertion **FAIL / exit 1**（事前ガード欠落を再現）。
- 追加後 `node --test test/ios_provisioning_entitlements_check_test.mjs test/testflight_test_information_test.mjs`：**13/13 PASS / exit 0**。Push権限欠落、development/production不一致、追加権限、malformed profile、CLI失敗と復帰を検証。TestFlight APIはモックを使用。
- `node test/ios_github_build_workflow_test.mjs`：**17/17チェックPASS / exit 0**。手動dispatchのみ、secret限定、アーカイブ前の検査、TestFlight明示選択など既存契約も維持。
- `git diff --check`：**exit 0**。既存の他担当dirty 13ファイルは編集・commitしない。

### 残件・権限境界

- **外部未解決:** Apple Account HolderによるApp Store Connect契約状態の解消。対象App IDのPush Notifications capability有効化、App Store Profile再生成、GitHub Secret更新。Apple側の状態変更は本作業では未実施。
- **未検証:** macOSの`plutil`変換・実Profile・Xcode実署名・Apple API再接続・TestFlight配布。これらの正式CI PASSは0件。`BUILD_EXPLICIT_USER_AUTHORIZATION_REQUIRED`（iOSビルドの新規実行・再実行は新たな明示許可が必要）。
- **実行しなかった操作:** Git commit/push、GitHub Actions再実行、iOS/Androidビルド、TestFlight upload、Cloudflare Worker配布、D1本番書込み。

## 横展開の対象区別

- `scripts/build-ios-release.sh`はXcodeの**Automatic signing**でProfile自体をSecretsから復元しないため、同一の手動Profile検査を重複実装しない。
- `codemagic.yaml`は別のiOS signing経路。今回のGitHub Secretに対する検査だけを加え、Codemagicの認証・署名管理には未介入。
- `.github/workflows/ios-upload-existing-testflight.yml`は**既存IPAのアップロード**経路で新規archiveしない。Apple契約の外部ブロッカーは同様に起こり得るがProfileのarchive検査は不要。
- 対象の基準はXcode Release targetの `CODE_SIGN_ENTITLEMENTS = App/App-Release.entitlements`。将来このファイルに権限追加があっても、同じ共通チェッカーが要求値を確認する。
