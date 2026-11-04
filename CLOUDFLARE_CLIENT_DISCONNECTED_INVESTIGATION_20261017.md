# Cloudflare Workers `clientDisconnected` 調査・評価（2026-10-17）

## 結論と境界

- **観測確定**: 2026-10-16 00:00–24:00 Asia/Manila（UTC 2026-10-15 16:00–2026-10-16 16:00）のCloudflare GraphQL MetricsではWorkers全体45,930 invocations、runtime errors 0。そのうち `clientDisconnected` が14,531件（31.6%）で、`izakanpai-api` が14,322件を占めた。
- **追加実証で原因評価を修正**: 2026-10-17 07:32–07:37 Asia/Manila の制御実験では、**利用者側がHTTP 200と本文を最後まで受け取った中継POSTがCloudflare上では`clientDisconnected`に計上**された。同じ公開Workerの中継しないGET/POSTは`success`。三段Service Binding中継後のレスポンス取扱いとWorkers outcome計測の組合せが大量の切断分類の**直接の発生条件**として強く支持される。`clientDisconnected`を実際のユーザー通信失敗件数と同一視してはならない。
- **既知のキャンセル実装との区別**: `mobile-app/web/api.js` の `pagehide` は進行中のWebView readを `AbortController.abort()` し、foreground writeも明示的に中断する。しかし今回の再現はブラウザ/WebViewも`pagehide`も使わないPowerShellのHTTPクライアントで起きた。よって**画面遷移・Playwright QAのAbortを大量切断の主因と断定した以前の仮説は取り下げる**。これらによる真の切断が一部混在する可能性は別に残る。
- **未特定**: どの画面・API action・UA・HTTP status・切断サブタイプ（Cancelled／Response Stream Disconnected）か。Workers Observabilityの `enabled=false`、`src/accessAnalytics.js` は Analytics Engine Bindingがないと動作しない。このため過去の個別トレースを取得できず、断定禁止。
- **操作範囲**: Cloudflare GraphQL/Workers設定・部署済みversion・既存ソース/ローカルテストの読み取りのみ。本番設定変更、ログ有効化、デプロイ、DB SQL書込、正式QA verdict記録は実施していない。

## 証拠1：Worker別 status（フィリピン時間10月16日）

| Worker | 成功 | clientDisconnected | 根拠 |
| --- | ---: | ---: | --- |
| `izakanpai-api` | 584 | **14,322** | GraphQL `workersInvocationsAdaptive` `dimensions{scriptName,status}` |
| `izakanpai-control-plane` | 14,863 | 168 | 同上 |
| `izakanpai-api-teat` | 14,930 | 41 | 同上 |

`izakanpai-api`単体の約96.1%が `clientDisconnected`。全Workerの45,930は**3段中継等を個別のWorker呼出として合算した値**で、45,930回の別々の人間操作・HTTP外部リクエストとは限らない。Cloudflareの一般的な定義は「レスポンス完了前のクライアント切断」であり、Errors分類では Cancelled と Response Stream Disconnected を区別する。ただし、**実受信成功の制御試験も同じoutcomeになったので、HTTPクライアント失敗の証拠にはならない**。

**毎時の相関例（UTC 2026-10-16 11:00、Manila 19時台）**: 公開API success179 / disconnected3,398、Control success3,453 / disconnected91、teat success3,506 / disconnected10。同時刻同程度のトラフィックで外側だけ切断が多い。多重カウントを修正したユーザーリクエスト総数は個別トレース欠落のため未確定。

## 証拠2：時間の分布と恒常性

- 主要ピーク（UTC 2026-10-16 02:00–14:00）で `izakanpai-api` clientDisconnected=14,322、success=579。
- 切断群の `wallTimeP50` 361,781 µs（約0.36秒）、P95 1,238,801 µs（約1.24秒）、P99 1,999,630 µs（約2.00秒）。**8秒readタイムアウトの大量発生とは一致しない**。
- 同じ窓で teat 成功14,861、Control成功14,790。teat成功のP50約0.27秒、Control成功のP50約0.36秒。
- UTC暦日 `izakanpai-api` の `clientDisconnected` は10/13=32,902、10/14=38,551、10/15=17,745、10/16=15,335。**10/16だけの突発ではない**。
- `coloCode` 別ではSIN6,195、HKG3,897、MRS1,642、NRT938、KIX935など複数POPで観測。POPだけでは利用端末・実行主体の特定はできない。
- Controlの切断168件には、別途長い `wallTimeP95` が存在する。通常の数百msの大量切断とは別現象の可能性があり、個別traceが必要。D1負荷を強める追加検証は実施しない。

## 証拠3：2026-10-17 制御試験（根本的な切り分け）

**目的**: 実際の画面遷移、Abort、タイムアウトがなくてもCloudflareで`clientDisconnected`になるかを確かめる。認証情報を送らず、テスト店舗`teat`だけへのread系・存在しないactionと公開healthのみを使った。店舗データの更新・削除はしていない。確認はPowerShell `Invoke-WebRequest -UseBasicParsing` で HTTPステータスとレスポンス受信完了を検証し、同一UTC分のGraphQL `workersInvocationsAdaptive` の `datetimeMinute × scriptName × status` と突合。グラフ集計は個別requestIdを持たず、**厳密な1リクエスト1レコード照合ではない**ことに注意。

| 試験 | 経路 | API側結果（各6回） | GraphQL同時刻・同一Workerの結果 |
| --- | --- | --- | --- |
| A. `POST ?api=1` / `storeId=teat` / 未知readアクション | 公開→Control→Tenant | 6/6 HTTP 200・53bytes本文受信完了、219–656ms | UTC **23:32** 公開`izakanpai-api` `clientDisconnected` **6**、Control/teatは`success` |
| B. `GET /health` | 公開Worker内で直接応答（中継なし） | 6/6 HTTP 200・54bytes本文受信完了、57–264ms | UTC **23:33** 公開`izakanpai-api` `success` **6** |
| C. `POST ?api=1` / `storeId=teat` / `getSettings`（tokenなし） | 公開→Control→Tenant（readアクション、未認証エラー応答） | 6/6 HTTP 200・本文受信完了、298–681ms | UTC **23:34** 公開`clientDisconnected` **5**＋**23:35** **1**、Control/teatは各分`success` 5＋1 |
| D. `POST ?api=1` / 未知readアクション（storeIdなし） | 公開Workerで404応答（中継なし） | 6/6 HTTP 404を正常受信、69–265ms | UTC **23:36** 公開`izakanpai-api` `success` **6**、内部Workerの対応呼出なし |

**再現性**: A/Cは「通信成功にもかかわらず公開Worker outcomeが`clientDisconnected`」、B/Dは「中継を避けると`success`」。**POST/GETの違いでもHTTP 200/404の違いでもなく、Service Bindingへ中継したレスポンス経路に現象が集中**。単なる8秒timeout、WebViewのpagehide、Playwright操作、ユーザー端末のネットワーク不良ではこの制御試験を説明できない。

**残る不明点**: Cloudflare内部の具体的な切断契機（deferred proxy response stream終了か、別のruntime outcome分類か）はWorkers Logs未取得・Cloudflare内部トレースなしのため特定できない。Cloudflare公式Service Bindings HTTPの`return await env.WORKER_B.fetch(request)`はサポートされた構成なので、**中継だけを理由にレスポンス本文の強制バッファリング等の本番修正をする根拠はない**。また、14,322件の全てが制御試験と同じ現象だとは断定しない。

## 証拠4：既存システム構造

- `wrangler.toml`: 公開 `izakanpai-api` = `src/hybridPublicRouter.js`、`CONTROL_ROUTE_MODE=all`、`CONTROL` Service Binding。
- `src/hybridPublicRouter.js` 193–203, 323–341行：`env.CONTROL.fetch()` でそのままResponseを中継。返却前に本文を読む実装や固定遅延はない。
- `src/controlPlaneWorker.js` 139–175, 179–220, 1633–1635行：store registryを取得し、Service Bindingで物理店舗Workerへforwardする。
- `mobile-app/web/api.js` 216, 586–655, 662–664, 694–745行：read timeout 8秒、WebView `fetch` + AbortSignal、画面離脱でreadをAbort。Native readはCapacitorHttp経由で、pagehide時はgeneration破棄（直接Abort不可）。foreground writeはWebView `fetch` でpagehide時にAbort。
- 既存テスト `node --test test/izk_ut_064_navigation_auth_race_test.mjs test/hybrid_public_router_test.mjs test/native_read_transport_test.mjs` は exit0、3ファイル PASS。source動作とMockを証明するものであり、Cloudflare本番の14,322件の原因別分類は証明しない。
- Cloudflare Worker List APIの `izakanpai-api` / `izakanpai-api-teat` は observability.enabled=false。本番の個別リクエストLog未取得。公開Worker deploymentは10/13のversion `85d31263-22fc-4b70-b8c0-0eaa7dc80606`、GraphQL対象と一致。ソースSHAとの厳密一致は未証明。

## 評価

1. **Worker runtime crash / 5xx一斉障害が主因という説：支持されない**。外側の呼出数と内部成功がほぼ対応し、当日runtime error 0。HTTP 4xx/5xxやユーザー画面の失敗は別指標なので0と断定しない。
2. **QA/画面遷移による物理Abortが大半という説：支持されない**。非Webクライアント・Abortなしの正常レスポンスでも同じoutcomeが再現する。正常応答後の分類と真の切断の混在割合は未確認。
3. **Service BindingのResponse中継・runtimeのoutcome分類：非常に有力（制御実験で経路差を再現）**。現行の`return env.CONTROL.fetch()`はCloudflare公式の対応パターン。原因分類を正してから、必要なら隔離環境でResponseバッファリング有無の効果を検証する。本番での当て推量の修正は禁止。
4. **業務データ損失の確証：なし。ただしwriteの結果不明リスク：要注意**。pagehideでforeground writeをAbortし、mutation markerをclearするソースがある。サーバ処理が既に成功した場合、受領できない画面は必ず独立照合で判定すべき。Cloudflareの切断数だけで注文二重登録や未反映を確定してはならない。
5. **利用料金：別指標として要ウォッチ**。業務APIが3段中継で実行回数として計上されるのは設計上の性質。`clientDisconnected`分類が即「失敗による余分な再送」や「追加課金」を意味するとは限らない。請求契約・実課金・クライアントretry率で独立確認が必要。

## 優先する追加検証（未実施）

1. **`clientDisconnected`単独のアラート・障害件数集計を誤判定に使わない**。成功受信実測での再現を監視運用に記録し、実際の端末HTTP失敗率・RPC `ok:false`・業務結果照合を真の信頼性指標にする。
2. 公開Workerで**秘密を含まない**最小のrequestId・action種別・elapsedMs・status・`pagehide/timeout/manualAbort`理由の計測を設計。トークン・本文・個人情報・IPは記録しない。read-onlyとwriteを別集計。
3. トレースを持つ限定検証環境で、同じ `getSettings` について画面滞在 vs 即時Back vs WebView/CapacitorHttp読込を比較。`clientDisconnected`とControl/Tenant終了を同じrequestIdで突合し、応答本文・状態が一致することを確認。
4. 注文/会計/勤怠等のwriteはサーバcommit前後の中断とレスポンスロストの両方を試験。冪等キー・リードバック・mutation markerの永続化を検証し、未確認時は成功/失敗と決めつけない。
5. 現在のCloudflare observabilityは無効。過去ログは遡及復元できない。必要なサンプリング/ログ有効化にはWorker設定変更・デプロイを伴うため、本調査では実行せず。

参照: https://developers.cloudflare.com/workers/observability/metrics-and-analytics/ ; https://developers.cloudflare.com/workers/observability/errors/ ; https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/http/ 。
