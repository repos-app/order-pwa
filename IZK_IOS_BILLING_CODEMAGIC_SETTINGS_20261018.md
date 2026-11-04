# izakanpai iOS課金Sandbox｜Codemagic手動ビルド設定（2026-10-18）

## 現在の判定

**NO-GO（構成案のみ、未接続・未ビルド）**。`standards/mobile-subscriptions/v1/qa/codemagic-izakanpai-billing-sandbox.template.yaml` は現行 `codemagic.yaml` から読み込まれない。通常の `ios-testflight-build` は `npm run mobile:sync` で通常Webを再生成するため、課金Sandbox IPA作成に転用しない。テンプレートをCodemagicへ登録・手動実行する操作は実施していない。正式QA、アプリ署名、配布、購入も未実施。

## 既存ソースと一致する構成

- `package.json`: `mobile:sync` = `mobile:prepare` + `node scripts/run-capacitor.cjs sync`。Sandboxでは通常の `mobile:prepare` を禁止し、隔離生成後に `node scripts/run-capacitor.cjs sync` のみ実行する。
- `capacitor.config.json`: `webDir=mobile-dist`、`appId=com.izakanpai.commissionpos`、hostname=`app.izakanpai.local`。`@revenuecat/purchases-capacitor` と secure storageを含む。
- 既存 `codemagic.yaml` の iOS署名設定：integration `izakanpai-apple`、`distribution_type=app_store`、bundle `com.izakanpai.commissionpos`、project `ios/App/App.xcodeproj`、scheme `App`、`xcode-project use-profiles` / `build-ipa`。テンプレートはこれを参照するが、このSandbox専用の署名とインストール動作は未確認。
- `scripts/qa-ios-billing-sandbox-build-prep.mjs`: OwnerとGatewayのreviewed TOML、コード内テスト環境分離、HTTPS応答を検査した後に一時フォルダへstageを生成する。CLIは `ready:false` でexit 1。生成可能時のみ `ready:true, staged:true, output:<path>, failures:[]` を必須とする。
- 現行のowner/gateway TOMLは `.tenant-provisioner/billing-sandbox/` 配下のGit ignoredファイル。通常のCodemagic checkoutには含まれない。**Gitへ資格情報やAPI secretを追加する方法は禁止**。承認済み非秘密TOMLのCIへの安全な引渡し経路が決まるまで、テンプレートは停止する。

## 導入条件と手動操作（将来の作業者向け）

1. Cloudflare側で専用Gateway `izakanpai-billing-sandbox-api-test` の公開範囲、WAF、Rate Limit namespace一意性、IP伝搬、Owner private Service Bindingを検証し、実際のOwner資格とsessionが用意できたことを別に確認する。ステージ生成器の匿名GETプローブは所有者ログインやRevenueCat課金の証明ではない。
2. Codemagicの一時checkoutへ、レビュー済みの**非秘密** `wrangler.owner.toml` / `wrangler.login-gateway.toml` を安全に配置する方法を決定する。Secretsや署名証明書をリポジトリへ取り込まない。どちらか一方でも無い場合は停止する。
3. Codemagic設定上で専用ワークフローを明示登録し、手動起動だけに限定する。templateファイル単体は自動検出されない。triggeringを定義しない。`IZK_BILLING_SANDBOX_ALLOW_BUILD=1` は承認された当該**手動ビルド**にのみ渡す。ビルド時点で権限と依存先を再確認する。
4. 使い捨てのclean checkoutで `mobile-dist` が存在しないことを確認する。テンプレートは `npm ci` の後、ステージ生成器のexit statusとJSON `ready/staged/output/failures`、生成entryファイルを検証する。既存 `mobile-dist` は削除・上書きせず停止する。ステージングをコピーしてから `node scripts/run-capacitor.cjs sync` を行い、既存のプロファイル解決で署名する。
5. 署名とBundle IDは既存製品と同じ `com.izakanpai.commissionpos`。iOSでは同じBundle IDのアプリ同士が既存インストールを置換する可能性がある。実機へのインストール責任者・既存データ保護・署名/Provisioning Profile/Entitlements整合性・RevenueCat sandbox条件の承認を別途要する。現時点で別のBundle IDや専用プロファイルの存在は確認できていないため、勝手に切り替えない。
6. artifactは手元レビュー用IPA候補のみ。テンプレートに `publishing` はなく、TestFlight、App Store Connect upload、App Store提出を自動実行しない。署名済みIPA作成とテスト配布の正式な完了判断は、実行ログおよび成果物の証拠が得られた後に行う。

## 既知のブロッカー・誤判定防止

| 条件 | 現状 | 判定 |
| --- | --- | --- |
| Git checkout上のignored TOML | 引渡し未定 | STOP |
| Gateway public endpoint / Private Owner / WAF | 未実配備・未検証 | STOP |
| Ownerログイン資格・認証済みsession | 未準備 | STOP |
| Codemagicへの専用template登録 | 未実施 | STOP |
| iOS署名・Provisioning・EntitlementsのSandbox IPA一致 | 未ビルド | 未確認 |
| 課金SDK/StoreKit Sandbox実機動作 | 別QA担当・未実施 | 未確認 |

静的に確認できたのはソースの整合性とtemplateの手動実行条件のみ。`ready:true` は実行環境の事前ゲートの成立を示すだけで、所有者認証、Apple課金、IPA署名、TestFlight配布の成功を意味しない。

## 変更時の安全な確認

本テンプレートは単独ファイルで、本番 `codemagic.yaml` を更新しない。構文確認はYAML parserまたはCodemagic登録前の構成検査で行い、`node --check` のようなJavaScript構文検査をYAML検証と混同しない。独立して `codemagic.yaml` の既存 iOSスキームと `capacitor.config.json` のappId/webDir、およびstage generatorのURL/出力契約を逆引きし、変更漏れを確認する。今回の作業ではビルド・機能試験・正式QA記録は行っていない。
