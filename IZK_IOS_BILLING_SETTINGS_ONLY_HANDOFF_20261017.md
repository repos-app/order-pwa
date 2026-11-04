# izakanpai POS iOS課金｜設定専任チャットの引継ぎ（2026-10-17）

## 担当範囲

ユーザー指示：「テスト実施は別チャットでやっているので、それ以外を進めて」。このチャットで行ったのは設定調査・接続配線のローカルソース修正・構成資料のみ。**正式QA／物理端末／テストケース実行／購入／Codemagicビルド／App Store提出／本番・SandboxのWorker/DBデプロイ／Git commit・pushは実施しない**。変更したコードは未配備・未検証として別チャットのQA担当へ引き継ぐ。

## 今回追加した3つの修正

1. **iOS Nativeのtest Audience識別**：`scripts/qa-ios-billing-sandbox-build-prep.mjs` の隔離ステージング時に、**コピー先だけの** `api.js` を変更する。元の `api.js` はHosted `/test/` でテスト環境を判定するが、iOS Capacitorは `capacitor://app.izakanpai.local/index.html` を使うため、`TEST_ENV:true` だけでは正常なSandboxのログインが環境不一致で停止する。追加するのは、`TEST_ENV===true`、Sandbox Owner明示flag、固定テストlogin/Owner HTTPS URL、`location.protocol==='capacitor:'`、hostname `app.izakanpai.local`、Capacitor platform `ios` の**全条件一致時だけ**testとする判定。既存ソース文字列の一致が1箇所でなければ `api_environment_baseline_changed` で生成停止。Tracked `mobile-app/web/config.js`／`api.js`、Android、本番Native、`mobile-dist`は変更していない。
2. **Owner APIの戻り値契約**：`src/billingSandboxOwnerApi.js` の `getBillingIdentity` 成功時にもトップレベル `storeId:'billingqa'` を付与。`checkToken` では既に店舗IDを返していたが、こちらの応答だけ欠けており、`mobile-app/web/billing-native.js` の全成功応答に対する店舗ID厳密検証によって正当なOwnerでも拒否される不整合を解消した。サーバーのOwner本人・session・Store ID・SANDBOXチェックは緩めていない。
3. **通常Nativeログインとの配線**：新規 `src/billingSandboxLoginGateway.js` の無効／非公開Gatewayに、既存 `mobile-app/web/api.js` の `POST /?api=1` ＋ body `{action:'login',storeId,loginId,pass}` に限定した互換口を追加。旧 `/login`・`/refresh`・`/logout` も保持。許可するactionは `login`／`refreshSession`／`logoutSession` **のみ**。他Store・任意RPC・不明queryは拒否し、内部隔離Tenantの既存正規ログインにマッピングする。Gatewayの `SANDBOX_LOGIN_GATEWAY_ENABLED=0`、`workers_dev=false`、Preview/公開route無しは維持した。**公開Internet向けログインAPIの安全性・到達性・ログイン成功は未確定**。

## 既存ストア設定（以前の実画面証拠を参照）

| 項目 | 最後の記録での状態 | 今回の操作 |
| --- | --- | --- |
| Apple月額/年額2商品とJP/PH価格、月額初回1か月無料 | 登録済み | 再登録・変更なし |
| Product/Subscription Groupの日英ローカライズ | 登録済み | 変更なし |
| 有料アプリ契約、銀行・米国税務、RevenueCat IAP/ASC APIキー | 過去のGUI確認で有効 | 新規発行・変更なし |
| RC Offering `default`／Entitlement `pro`、Apple製品2件 | 紐付け済み。21:45時点 `Missing Metadata` | 今回GUI読戻しできず、最新状態未確認 |
| 掲載・審査スクリーンショット | 未登録 | ユーザー方針により購入テスト後まで保留 |
| Codemagic通常 `ios-testflight-build` | 通常の本番Web資材を `mobile:sync`、App Store署名。提出flagはfalse | 設定・起動変更なし |
| Sandbox Owner/login Worker | 2Workerとも非公開、Owner資格fixtureなし | ソース準備のみ、公開・配備なし |

## ソース自己レビュー10観点（実行テストとは区別）

| ID | 実ソースで点検した観点 | 状態 |
| --- | --- | --- |
| S01 | `api.js` のHosted `/test`判定とiOS root URLの構造を照合 | ソース確認 |
| S02 | iOS hostname `app.izakanpai.local` とSchemeをCapacitor設定へ照合 | ソース確認 |
| S03 | Sandbox判定を `TEST_ENV` と明示Owner flagのANDに限定 | ソース確認 |
| S04 | Sandbox Owner/login両URLを厳密固定HTTPSに限定 | ソース確認 |
| S05 | Native iOS以外に`pathIsTest`を拡張しない | ソース確認 |
| S06 | 元の`api.js`の予期しない変更はコピー生成を失敗にする | ソース確認 |
| S07 | Ownerの `getBillingIdentity` にだけ欠けていた `storeId` を補完 | ソース確認 |
| S08 | Owner本人とTenant session、SANDBOX環境チェックは保持 | ソース確認 |
| S09 | Native通常の `POST ?api=1` ＋ `pass` とGateway仕様を一致させた | ソース確認 |
| S10 | Gatewayの他Store／未許可Action／公開フラグの拒否を確認 | ソース確認 |

## 横展開10境界（Source/staticのみ、正式QAではない）

| ID | 別の構成面・独立した確認先 | 状態 |
| --- | --- | --- |
| H01 | 本番 `mobile-app/web/config.js` は変更しない | STATIC |
| H02 | 共通`mobile-app/web/api.js`自体は変更しない | STATIC |
| H03 | 生成・配布先`mobile-dist`、Capacitor nativeの操作なし | 未操作 |
| H04 | Native `billing-native.js`の`appl_`・Store・Owner・customerId検証保持 | STATIC |
| H05 | Owner Worker Service Bindingは隔離 `billingqa` Tenantのみ | STATIC |
| H06 | Gateway Service Bindingは隔離 Owner／Tenantのみ | STATIC |
| H07 | `src/loginAuth.js` のLogin ID・Hash・メール確認・rate limit依存 | STATIC |
| H08 | `src/sessionTokens.js` のrefreshセッション管理を再利用 | STATIC |
| H09 | Codemagic署名・Store productの既登録値を変更しない | STATIC |
| H10 | iPhone公式QA／RC実Apple購入／Store公開は別レーン | 未実施 |

## 残る設定ブロッカー

**1.** `billingqa` の安全なOwnerログイン資格fixture（既存DPAPI＋承認済み更新経路）が未整備。以前安全性チェックが拒否した秘密生成スクリプトの再試行は禁止。**2.** Owner/Loginの公開HTTPS入口、Cloudflare側で実際の送信元IPを失わないレート制限、インターネット接続の不正試行防止、CORS/認可/Origin境界の確認が不足。GatewayとOwner Workerをここで公開しない。**3.** Sandbox専用Codemagicワークフロー／独立ipaは未準備。既存`mobile:sync`は共有資材を書換えるためこのチャットでは呼ばない。**4.** Apple製品の`Missing Metadata`は最新GUI確認と審査素材の扱いが残る。素材はテスト後。**5.** 今回変更の構文・静的差分チェックは確認したが、ユーザー指示により**QAケース実行・公式判定は別チャット**とする。

外部設定・本番は一切変更しなかったので、これらローカルソースは**実機有効化済みとは見なさない**。Storeの正式公開判定は引き続きNO-GO。
