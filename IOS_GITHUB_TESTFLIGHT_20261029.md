# izakanpai: GitHub Actions → TestFlight (2026-10-29)

## 現状

- `.github/workflows/ios-build.yml` は既存の手動署名ビルドを維持し、`upload_to_testflight` を明示選択した時だけ署名済みIPAをTestFlightへ送る。
- `upload_to_testflight=false`（デフォルト）なら以前と同じ「署名IPAのArtifacts保存」のみ。選択なしで本番ストアやTestFlightへ公開しない。
- `upload_to_testflight=true` なら同じ署名検証済みIPAを `Apple-Actions/upload-testflight-build@v5` でApp Store Connectにアップロードし、Appleの処理を待つ。ストア公開・審査提出は行わない。
- `vars.TESTFLIGHT_GROUPS` が設定されていれば、指定したTestFlightグループへ配布対象を関連付ける。空ならグループ自動設定はせず、App Store Connectでグループを割り当てる。

## TestFlight Test Information の自動補完（2026-10-30）

- `upload_to_testflight=true` の時だけ、`scripts/testflight-test-information.mjs --apply` を IPA ビルド前に実行する。Apple側で主言語の Beta App Description / Feedback Email が未設定なら、既存の `store-assets/listing/metadata.json` の App Store 説明文と `contactEmail` を使って補完し、Apple APIから読み戻して確認する。
- 既存の説明文・メールは上書きしない。API認証情報はGitHub Actionsの既存のVariables/Secretsから読み込む。秘密鍵はログに出さずGitに保存しない。
- オフライン回帰テスト `node --test test/testflight_test_information_test.mjs` は未設定の検出、主言語での新規作成、部分補完、既存設定保全の4条件を検証する。Apple APIの書き込みは自動配布を選択したワークフロー内でのみ行う。
- `upload_to_testflight=false` の通常ビルドでは Test Information の検証・補完は実行しない。ビルドの成功とTestFlight配布成功は区別する。

## 暗号化申告の409応答と既存ビルド復旧（2026-10-30）

- Appleへのアップロードと処理が `VALID` で完了したあとに `usesNonExemptEncryption` が既に設定済みという理由で HTTP 409 を返す場合がある。該当Apple-Actions v5入力 `uses-non-exempt-encryption` は省略する。アプリの `Info.plist` には元から `ITSAppUsesNonExemptEncryption=false` が含まれるため、APIで同じ宣言を再設定しない。
- 既にアップロードされたビルドは再アップロードしない。`.github/workflows/ios-testflight-verify.yml` の手動起動で対象ビルド番号を指定し、macOSビルドを起動せずLinuxランナーからAppleの `processingState=VALID` を読み取る（read-only）。
- 検証はビルドのApple側処理完了を確認するものであり、TestFlightグループへの追加・テスターへの配布完了を代替して保証するものではない。

## 必須の認証情報

既存GitHub SecretsのiOS署名用`IZAKANPAI_IOS_DISTRIBUTION_P12_BASE64`、`IZAKANPAI_IOS_DISTRIBUTION_P12_PASSWORD`、`IZAKANPAI_IOS_PROVISIONING_PROFILE_BASE64`は維持。

TestFlightへの送信には**別途**App Store Connect API認証情報が必要：

| GitHub設定場所 | 名前 | 値 |
|---|---|---|
| Settings → Secrets and variables → Actions → Variables | `APPSTORE_ISSUER_ID` | App Store ConnectのIssuer ID |
| 同 Variables | `APPSTORE_API_KEY_ID` | API Key ID |
| 同 Secrets | `APPSTORE_API_PRIVATE_KEY` | Appleから一度だけダウンロードした`AuthKey_*.p8`のファイル内容（秘密情報） |
| 同 Variables（任意） | `TESTFLIGHT_GROUPS` | TestFlightグループ名（正確な名前。複数は改行かカンマ） |

GitHub設定には上記3つのAPIキー情報が2026-10-29時点で未登録。Codemagicの`izakanpai-apple`連携はGitHub Actionsに自動継承されない。**秘密鍵をリポジトリ内にコミットしない。** GitHubでAPI鍵を取得/読出しはできないため、既存のApple側の`.p8`を保持する担当者がGitHub Secretへ設定する。すでに発行されたAPI Keyの秘密鍵を紛失した場合は、Apple App Store Connectで新規キー作成が必要。

## 手動実行

1. `https://github.com/repos-app/izakanpai/actions/workflows/ios-build.yml` を開く。
2. **Run workflow** → ブランチ`main` → **upload_to_testflight** にチェック（上記3設定完了後）→ **Run workflow**。
3. `Verify TestFlight upload credentials`、`Build and verify signed IPA`、`Upload signed IPA artifact`、`Upload signed IPA to Apple TestFlight` が成功したことを確認。
4. `https://appstoreconnect.apple.com/` → アプリ `com.izakanpai.commissionpos` の TestFlight 画面で、ビルドとテスターグループへの反映を確認する。内部テスターのグループ自動アサインはApple側設定も必要。

APIキー未設定でチェックを入れると、`Verify TestFlight upload credentials` で具体的に不足している名前を表示し、ビルド前に停止する。API秘密鍵の中身はログ出力しない。App Store Connectの権限がない場合もアップロード成功とはみなさない。

## 安全性と検証範囲

- 常に手動起動。`main` pushで勝手に配布しない。`upload_to_testflight=false`の場合は既存のIPAビルドのみ。
- 署名とIPA内部のBundle ID/version/build確認は従来の`scripts/github-ios-signed-build.sh`のまま。
- Apple公式Actionを利用。ユーザーのAppleアカウント接続/API秘密鍵、実際のアップロードとTestFlight端末配布は別途成功ログとApple側結果で確認する。
- TestFlightでの配布は公開App Storeへの提出・本番公開を意味しない。
