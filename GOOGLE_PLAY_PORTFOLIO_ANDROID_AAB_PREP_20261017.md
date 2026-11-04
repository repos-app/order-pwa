# AMU Labs / Google Play 3アプリ共通AAB整備・ソースQA証拠（2026-10-17）

## 実行境界と成果

依頼：「Google Play個人アカウントの本人確認は後で。それ以外に進められる作業は？」。Android実機/Appleストア/Googleストア/Cloudflare/RevenueCatの設定や正式QA証拠には触れず、3アプリの実ソース棚卸し、読み取り専用共通事前ゲート、およびizakanpaiの**既存手動Android GitHub Actionsへの任意AABモード**を準備した。

- Google Playの個人開発者登録はAMU Labsで作成済み（現物画面確認）。本人確認・Android端末・電話番号・アプリ新規作成は未完。
- izakanpai：既存Android workflowは従来workflow_dispatch手動で**APKのFirebase QA配布のみ**。追加したplay_aab=trueに限ってAPK署名と版を照合した同一runでbundleRelease→署名ブロック→jarsigner strict→base AndroidManifest.xml→GitHub AAB artifact。Playにアップロードしない。既定falseのQA Firebase配布は維持。プロフィールの古いAndroid push指定をmanualへ修正。
- Hataraku NihonGO!：app/はGradleとCI設定、repo親に実GitHub workflow。手動signed_release=trueで署名AAB/APKを生成する既存スクリプトあり。debugのpushトリガーはこのアプリの既存CI仕様で、izakanpaiのmanual仕様を無断で横展開して変更しない。
- できた！カレンダー：手動GitHub Android buildでsigned AAB/APKを作成する既存構成あり。RevenueCat等の課金仕様はアプリごとに決定し、一律課金対象と扱わない。
- 共通の静的監査スクリプト standards/google-play/v1/preflight.mjs は3アプリのGradle applicationId、CI profile、GitHub workflow、AABと証明書のソース経路、アカウント状態を検査する。インターネット・Secrets・外部ストア呼出し不要。

## テスト実績

PowerShell 5.1から実施。以下は全て**実際にプロセスを実行しexit=0**で終了：

| コマンド | 結果 |
|---|---|
 node --test standards/google-play/v1/validate.test.mjs standards/google-play/v1/preflight.test.mjs | **17/17 PASS**（AABモード、Play/Firebase排他、実ディレクトリ・別ID・負例） |
 node standards/google-play/v1/preflight.mjs | 3アプリ全て localSourceReady=true, androidBuildSourceReady=true。Google登録/商品/物理AABは未完と明示 |
 node scripts/ci/mobile-standard-gate.mjs --stage compile --platform android（izakanpai） | PASS |
 同じAndroid compile gate（Hataraku NihonGO! app / できたCalendar） | **2/2 PASS** |
 node --test standards/mobile-ci/v1/mobile-standard-gate.test.mjs | **5/5 PASS** |
 node --test standards/mobile-subscriptions/v1/validate.test.mjs | **6/6 PASS** |
 node --check standards/google-play/v1/preflight.mjs / preflight.test.mjs | PASS |
 git diff --check -- .github/workflows/android-build.yml ci/mobile-standard-profile.json | PASS |

**未実行**：GitHub Actions実行、署名Secret参照、署名APK/AAB成果物発行、Google Playへのアップロード、内部テスト参加者によるインストール、RevenueCat実購入、正式Runner PASS、オンラインYAML/CIバリデータ実行。静的PASSを実機PASSに変換しない。

## ソース自己レビュー10観点（対象：izakanpai AAB追加）

| ID | 異なる調査方法・対象 | 証拠と結果 |
|---|---|---|
| S01 | git diffにて既存QA配布jobの入口を逆引き | workflow_dispatchを保全、push追加なし：PASS |
| S02 | 入力デフォルト・条件付きAAB実行の分岐を照合 | play_aab=falseの既定、trueだけbundleRelease：PASS |
| S03 | Firebase配布処理をアップロード/実配布の2箇所から確認 | 両方 !inputs.play_aab でPLAYと排他：PASS SOURCE |
| S04 | Gradle release signingConfigsとworkflow元JKS証明書ピンのコードを確認 | JKS alias/署名鍵パスワードは既存検証を再利用：PASS SOURCE |
| S05 | Gradle版番号・APKメタデータ検査とAABビルドの同一run連鎖確認 | appId/versionCode/versionName変化なし：PASS SOURCE |
| S06 | AAB自体に署名ブロックがないケースを逆算 | META-INFのRSA/DSA/ECの有無を必須：PASS SOURCE |
| S07 | jarsignerの挙動とチェックの順序を確認 | -verify -strict 実行を必須にし失敗時アップロードへ進めない：PASS SOURCE |
| S08 | bash pipefailとjar/grep早期終了の反例を確認 | grep -qはjar SIGPIPE誤検知の可能性があるのでgrep -E（stdout破棄・全行読了）に修正：PASS SOURCE |
| S09 | Bundleの構成をZIPエントリーから独立照合 | base/manifest/AndroidManifest.xmlがないAABは拒否：PASS SOURCE |
| S10 | ソース回帰テスト・CIゲート・差分整形の独立実行 | Play 17/17、mobile CI 5/5、Android compile PASS、diff --check PASS |

## 横展開レビュー10観点（アプリ/ビルド/安全境界）

| ID | 横断対象 | 証拠と結果 |
|---|---|---|
| H01 | izakanpai Android Nativeパッケージ実Gradle | com.izakanpai.commissionposを直接読取/共通設定一致：PASS |
| H02 | Hataraku Android Nativeパッケージ実Gradle | com.hatarakunihongo.appを直接読取/共通設定一致：PASS |
| H03 | できたCalendar Android Nativeパッケージ実Gradle | com.dekitacalendar.appを直接読取/共通設定一致：PASS |
| H04 | Hataraku親repoとapp/.github空フォルダ | 親repoのandroid-build.ymlを補助探索してpreflight修正→実テストPASS |
| H05 | Hataraku既存署名AABスクリプト | clean bundleRelease assembleRelease・証明書チェックと手動signed_release：PASS SOURCE、実AAB PENDING |
| H06 | できたCalendar既存手動Android Release | bundle/releaseとapk/releaseのartifact出力を確認：PASS SOURCE、実AAB PENDING |
| H07 | アプリ固有CIトリガー差異 | izakanpai Androidはmanualへ修正、Hataraku debug pushは現行方針を保持、Calendar manual：PASS SOURCE |
| H08 | Google Play本人確認/アプリ追加制御 | 登録済み≠Google認証済み、3アプリ作成数0、play internal未開始をreportで明示：PASS SOURCE |
| H09 | 他アプリへの権限/鍵交差 | ManifestでID重複・他アプリentitlement ID誤転用・秘密鍵文字列注入を負例テスト：PASS |
| H10 | iOS/RevenueCat/QA配布側への巻き込み | iOS設定・Worker/Store・正式QAを変更せず、AAB modeでもFirebaseへ誤配布しない静的テスト：PASS SOURCE（配布実行PENDING） |

10自己/10横展開は**上記のソースレベル調査・検証の記録**であり、実ビルド/実機/ストア証拠として扱わない。セキュリティの本番分離、署名の真正性、Google Playアプリ審査は改めてテストが必要。

## 次の対応（本人確認後・別承認の範囲）

1. Google Playの本人確認、Android端末の検証、電話番号確認を完了。現物でアプリ作成ボタン有効化を確認。
2. Android版3アプリをPlay Consoleへ作成しパッケージID固定、開発者/プライバシー/データ安全性などの登録情報を準備。
3. GitHub SecretsとPlay App Signingの証明書を確認した上で、izakanpaiの手動play_aab=trueを実行して成果物SHA/署名/AppID/versionを独立検証。従来のQA Firebase経路を変更しない。
4. 各アプリをPlay内部テスト、必要ならクローズドテストへ。izakanpaiとHatarakuは月額/年額の商品とRevenueCat Google App、sandbox webhook分離を完成。できたCalendarの課金は別途機能方針確定後。

**今回実施しない**：Git commit/push、GitHub Actions実行、Play/App Storeへの送信・公開、実決済、本番API/DB/Worker配備。
