# iOS課金Sandbox Owner配線監査（2026-10-17）

## 実測範囲

`scripts/qa-billing-owner-wiring-preflight.mjs` はローカルのOwner Worker設定、Owner API、Tenant二経路、SessionTokenソースを読み、JSONで配線の最低条件を表示する。リモート接続、資格情報の読出し・生成、秘密値チェック、DB操作は行わない。構文パターンに基づく静的監査で、経路が動作することの証明にはならない。

`node test/qa_billing_owner_wiring_preflight_test.mjs` は **exit 0**（非公開経路の検出、共通ログイン経路の存在、設定店舗差し替えを拒否する負例）。`node scripts/qa-billing-owner-wiring-preflight.mjs` は **exit 1**（7項目PASS、`owner_login_route` BLOCKED）。このexit 1は想定したfail-closedである。

## 配線と根本ブロッカー

- `.tenant-provisioner/billing-sandbox/wrangler.owner.toml` は `TENANT_ID=billingqa`、`AUTH_ENVIRONMENT=test`、`TENANT` service binding、公開route/worker.dev/previewなし。WebViewが呼べるHTTPS URLは存在が確認されていない。
- `src/billingSandboxOwnerApi.js` は `POST /owner`、`checkToken`と`getBillingIdentity`のみ。`capacitor://app.izakanpai.local` のOriginのみを受理し、OPTIONSはPOST/content-typeに限定する。Owner自身にlogin/refresh処理はない。
- `src/index.js` の通常POST action `login`/`refreshSession`、`src/gasApi.js` の `?api=1` 互換login/refresh、`src/sessionTokens.js` の店舗拘束されたr2 refreshを再利用する設計が自然。Ownerに別の公開パスワード認証proxyを追加してはならない。
- `src/billingSandboxOwnerApi.js` のOwner認証はTenant service binding経由で `checkToken` 後に `rpc(getBillingIdentity)` を実行。Owner role、Store一致、Sandbox環境を確認する。Ownerの`checkToken` actionでもbilling identityが必要である点に留意。
- `src/index.js` と `src/gasApi.js` のlogin引数は異なる（前者`password`、後者`pass`）。nativeの接続先切替時に形式を一致させる必要がある。
- 既存`qa-v2-local-login-vault.ps1`と`qa-v2-dpapi-login-transport-diagnostic.ps1`にWindows DPAPIのQA資格情報経路がある。ただし既存 `billingqa` 資格情報が登録されている証拠はなく、当監査では実行していない。

## 実装に進むための条件

隔離Tenantの既存正規login/refresh機能とOwnerサービスの双方に、既存セッションを共有できる**明示的に隔離された認証済み入口**が必要。公開入口は単純なパス透過proxyにせず、強制店舗固定、Origin以外の認証条件、制限したactionとpayload、必要なrate limitを備える設計審査が必要。現Owner設定に公開routeを追加するとプライベート境界が変わるため、今回は実装していない。

`docs/IZK_IOS_BILLING_SANDBOX_OWNER_CONNECT_20261017.md`には隔離AUTH_SECRET登録、関連migration適用までの既存証拠がある一方、Owner fixture login_id/password_hash、メール確認、実ログイン、iPhone到達性は未証明。既存の秘密生成スクリプトは安全性ゲートで拒否された履歴があり、その手法は再実行していない。正式Apple Sandbox購入・正式QA判定は今回 **PASS 0 / FAIL 0**。

## 個別のソースレビューと横展開（読み取り監査）

S01 Owner非公開config（PASS）、S02 Tenant service binding（PASS）、S03 test環境flag（PASS）、S04 店舗billingqa固定（PASS）、S05 Owner CORS Origin（PASS）、S06 preflight headers/method（PASS）、S07 POST/action制限（PASS）、S08 access tokenをTenant検証（PASS）、S09 Owner権限/identity再検証（PASS）、S10 実login入口到達（BLOCKED）。検出は現行ソースの静的契約に限る。

H01 Native通常login引数（確認）、H02 GAS login互換引数（確認）、H03 Native refresh（確認）、H04 GAS refresh（確認）、H05 r2 token店舗結合（確認）、H06 refresh rotation CAS（確認）、H07 Token audience依存（追加実動作確認待ち）、H08 Windows DPAPI共有方式（既存ファイル確認、billingqa使用未確認）、H09 WebView HTTP接続（未到達）、H10 RevenueCat/StoreKitのOwner資格情報連動（実購入未検証）。各観点の対象はそれぞれ前節に記載した別のコード箇所。実機での成果を意味しない。
