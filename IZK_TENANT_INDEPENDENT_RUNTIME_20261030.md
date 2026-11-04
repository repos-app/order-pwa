# テナント名に依存しない共通処理への変更（2026-10-30）

## 対象と禁止事項

- アプリ本体の認証、課金、QA証跡、QA fixture操作を特定の店舗名で許可・拒否しない。新規店舗・既存店舗で同じ共通判定を利用する。
- 特別なQA操作はどの店舗でも *無条件* に実行できるわけではない。Tenant Workerの `TENANT_ID` と本人確認済みセッションのstoreId一致、個別のQA feature flag、admin/system role、QA所有markerを要求する。設定のない店舗では拒否する。
- Service Bindingの `TENANT_<ID>` は各店舗への隔離ルーティングのための名称であり、権限判定に使ってはいけない。固定のテスト実行データ・ケース仕様も業務アプリの利用許可とは別扱い。

## 実装した共通化

- `src/qaTenantScope.js`: QA用のfeature flagとTenant ID一致を共通実装。
- `src/hybridPublicRouter.js`, `src/controlPlaneWorker.js`: `/qa/attest/readback` をBodyの検証済み店舗形式とControl `tenant_registry` の稼働ルートから選択。Tenant側が本人トークンとDB scopeを独立確認。
- `src/qaAttestation.js`: ES256 readbackの固定店舗allowlistとセレクター別店舗名制限を撤廃。署名鍵/role/現在セッション/tenant ID/個別selectorを引き続き検証。
- `src/crm.js`, `src/qaReservationFixtureApi.js`: テストfixture削除の特定店舗名判定を共通QA scopeガードへ置換。任意顧客データ削除APIにはしていない。
- `test/qa_tenant_scope_no_fixed_store_test.mjs`: テナント名を使った条件分岐の復活防止、別店舗の許可/拒否、未設定時のfail-closedを検証。

## 実行・証跡

- ソース `33c5397` をmainにpush。
- ローカル: QAエンドポイント/削除/署名検証64テストPASS、Provisioner・router等56テストPASS、Control routing54チェックPASS。これは実機の正式QA判定とは別。
- Production preflight: Control Service 12、Control Secret 4、Public Service 2/Secret 7、test1課金Service 3/Secret 2を事前確認。4 WorkerともWrangler dry-run正常。
- 本番Version（各100%）：test1 `8b158426-047c-475d-ae06-75a282a86cc8`、Control `3b5bb582-10e5-4077-bbf3-a3372b73d16a`、Public `d0e05e8f-577a-40e5-9ab1-c4c5be1d7821`、新規店舗テンプレート `8da4f782-398e-42d1-9433-ee3fdf1edbc7`。
- Remote readback: Control Service12/Secret4、Public Service2/Secret7、test1課金Service3/Secret2、Template AIのみ1を維持。公開 `/qa/attest/readback` へトークン無しで test1 / teat / yuwaku を送信し各HTTP 401（拒否）。改ざんトークンや他店舗データ参照を許す証拠はない。
- 未変更: 他の既存Tenant Worker全件の強制的なソース更新、実機QA正式台帳、既存Formal QA remediatorの作業中2ファイル、課金プランDB。

## 残る正式QA専用資産の固定値

`scripts/qa-autonomy/qa-runtime-providers`、`scripts/qa-v2-realme-*`、`test/qa-d1`等には、正式QAで使用している特定店舗のfixture・物理端末・D1構成・証拠セレクターがまだ残る。これらは一般アプリの購入/利用制限ではないが、**正式QAランナーの全店舗への汎用化は未完了**。本来のclaimと独立Oracleを偽装せず、テスト対象店舗をデータ駆動で選べるように改修・真正実機検証する必要がある。
