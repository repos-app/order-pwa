# izakanpai 全62 src モジュール静的カバレッジ（2026-10-15）

## 成果と再現方法

`node scripts/izk-source-coverage-manifest.mjs --write` は **現在の作業ツリー** から全 `src/*.js` のSHA-256、行数、明示的 export、DB呼出し数・SQLキーワード数（正規表現による概数）、`storeId`/`store_id`参照、レビュー段階、Workerの`ROUTES`とGASの`RPC_HANDLERS`の静的キーを `docs/IZK_ALL_FUNCTIONS_SOURCE_COVERAGE_20261015.json` に出力する。`--write`なしはJSONが現在ソースと一致しなければ非0で終了する。モジュール数が62でなければ非0。生成・検査とも実行exit0。

| 静的範囲 | 実測カウント | 解釈 |
|---|---:|---|
| `src/*.js` | 62 | 存在・SHA・export・DBキーワード調査済み |
| Worker ROUTES | 133 | 静的objectキーの抽出。実行可能性・公開可否とは別 |
| GAS RPC_HANDLERS | 152 | 静的objectキーの抽出。直接dispatchのswitchや別名の評価を含まない |
| `FOCUSED_AUDIT_LOCAL_FIX` | 3 | `orders.js`, `integrations.js`, `printers.js`で明確な入力切詰め・ID切詰めを修正し専用テストPASS |
| `FOCUSED_AUDIT_DOMAIN_VALIDATION_PENDING` | 3 | `billing.js`, `paymentMethods.js`, `attendance.js`の具体的なsliceと用途を査読、業務契約を未確認 |
| `STATIC_INVENTORY_DOMAIN_VALIDATION_PENDING` | 56 | モジュール構造を列挙。関数単位の認可・DB操作の動的証明は未実施 |

## 認証・権限経路の静的監査

`src/gasApi.js:1144+` の `dispatchRpc` は `RPC_HANDLERS`で関数を解決し、`requireAuth`、`requireAuthenticatedStoreId`、`RPC_PERMISSION_PAGE`と`RPC_AUTH_ONLY`の整合をチェックし、通常ページで `permissionsMod.requirePagePermission` に進む構造である。`src/index.js` の `ROUTES`には `ROUTE_PERMISSION_GROUPS`、`ROUTE_PUBLIC_ACTIONS`、`ROUTE_AUTH_ONLY`、`ROUTE_PLATFORM_ACTIONS` の複数境界がある。これらは正しい検証を意図する**構造的証拠のみ**であり、各ハンドラー内部のSQL/認可まで証明しない。両dispatcherは共有dirtyであり未編集。

特に `src/gasApi.js` の `dispatchDirect` 内のswitchとWorker各ルートの内部権限チェックは機能別の実行テストが必要。テナント跨ぎの意図しない取得や欠落権限の**実証済みの新規脆弱性は今回特定していない**。根拠不十分な広域修正を行わない。上記の権限名抽出は文字列トークンの近似で、完全なallowlist照合として扱わない。

## 前段修正とUI入口

`src/integrations.js`の`saveReportSettings`はreportEmail200超過を、`saveEmailFromAddress`は200超過を**保存前**に `{success:false,error,max:200}` として拒否する。`src/orders.js`の`voidOrder`も200超過を `{error:'reason_too_long',max:200}` として、取消前に拒否する。`node test/izk_ut_075_backend_input_regression.mjs` はexit0。

UI入口は Native `mobile-app/web/settings.html` とWeb production/test `settings.html` の保存RPC、および Native/Web prod/test `admin.html` の取消API。後者はすべて `API.post('voidOrder',...)` で共通業務関数へ到達。**settings.htmlは別担当の編集対象で変更せず**、実際のエラーメッセージ表示・翻訳とペースト動作はPENDING。admin.htmlのエラー分岐も自動UI実行未了。既存送信先・キャンセル履歴を書き換えていない。

## S01–S10 独立自己レビュー

| 項目 | 手段・確認点 | 判定 |
|---|---|---|
| S01 | `rg --files src -g '*.js'` の62件とJSON件数を照合 | PASS 静的 |
| S02 | SHA256を各モジュールに記録、現在作業ツリー由来を明示 | PASS 静的 |
| S03 | `ROUTES`133件と`RPC_HANDLERS`152件を別々に抽出 | PASS 静的 |
| S04 | 各モジュールのexport形式を列挙。再export/動的exportは未完全 | PENDING 詳査 |
| S05 | DB呼出しとSQL文字列の出現頻度を別カラムに記録、実SQL網羅と区別 | PASS 概数 |
| S06 | store ID参照の有無を記録。正しいSQL店舗境界の判定は別 | PENDING 実証 |
| S07 | GAS共通dispatchのauth/permission構造をソースで確認 | PASS 構造 |
| S08 | Workerの権限グループ・公開・認証専用の区分を確認 | PASS 構造 |
| S09 | JSON生成→検証exit0、IZK-UT-075保存前validation回帰exit0 | PASS ローカル |
| S10 | index/gasApi等の既存dirty共有ファイルを更新しない構成 | PASS 差分確認待ち統合 |

## H01–H10 独立横展開

| 項目 | 着眼点・証拠 | 判定 |
|---|---|---|
| H01 | Worker `ROUTES`のaction名から公開入口を抽出 | PASS 静的 |
| H02 | GAS `RPC_HANDLERS`のRPC名から公開入口を抽出 | PASS 静的 |
| H03 | GAS `RPC_PERMISSION_GROUPS`と`RPC_AUTH_ONLY`の境界を読む | PASS 構造 |
| H04 | Worker `ROUTE_PERMISSION_GROUPS`/public/authOnly/platformの区分確認 | PASS 構造 |
| H05 | ガード後の個別SQLまで認証済storeIdを伝搬できているか | PENDING 関数別 |
| H06 | storeId指定がない`src/*.js`を抽出できる静的フィールドを作成 | PASS データ / PENDING 意味確認 |
| H07 | Native/Web prod/test 3種のsettings/admin入口を逆引き | PASS ソース / PENDING UI |
| H08 | orders取消理由の長さによる監査履歴欠損をsource回帰で防止 | PASS ローカル |
| H09 | レポート送信先と送信元の書込み前拒否をsource回帰で確認 | PASS ローカル |
| H10 | 62モジュールすべてを業務別に正式脆弱性テストする範囲 | PENDING 全体 |

## 状態と制約

本結果は**静的カバレッジ台帳完成**。全62モジュールの機能・DB境界・権限の正式検証完了ではない。dispatch名が複数種の公開入口、間接呼出し、計算プロパティ、SQLテンプレートで動的に増減する場合、近似集計から漏れる。公開判定には実routerのruntime到達性と役割別・別店舗データ・認証失効のテストが必要。commit/push/deploy/正式QA/実機を実施していない。
