# 共通Worker障害ログ 横断監査と再発防止 (2026-11-09)

## 完了条件と実際の状態

- 目的: 新しい業務API/RPCを追加しても、HTTP 200の業務失敗・通信失敗・遅延が共通Workerで検知でき、単一の追跡IDで公開RouterからControl、店舗転送まで調査できること
- 検証済み: 共通応答分類器、Controlの転送段階ログ、機能名の一致、失敗ログの固定分類とPII非保存、アラートの追跡ID重複排除、CIでの自動テスト選択
- 未実施: 本番デプロイ、本番の同種障害を発生させる検証、実機正式QA、全機能の業務シナリオE2E
- 注意: 共有ワークツリーには無関係の未コミット開発変更が存在する。既存のリリースゲートを迂回して本番へ強制反映しない

## 2026-11-09 03:09 PHT 障害で見逃した構造的理由

1. 従来の `serverTraceDiagnostics.js` は、HTTP >= 400、処理5秒以上、または個別allowlistで列挙したAI/課金/メール変更だけを記録対象にしていた。新規業務機能を追加してもallowlistに入らず、HTTP 200 / `{ok:true,data:{success:false,error:'...'}}` は `slow` のまま、あるいは記録対象外になった。
2. 公開Router、Control両方の共通ラッパーに同じ機能名依存の穴があった。送信元（Router）はRPC名を単に `rpc` と記録し、Control側は `rpc:機能名` で、追跡IDでの検索はできても操作別集計が一致しなかった。
3. 汎用のControl→共通Gateway転送には区間別の計測がなく、30秒のうち店舗ルート照会にかかった時間と共通Gatewayへの通信・処理時間を区別できなかった。
4. 診断保存失敗は業務処理に影響させない設計（正しい安全原則）だったが、失敗自体を記録する二次の目印がなかった。
5. 全体アラートは15分間で大量の `failed` イベントが発生した場合のみ送信する。単発障害を通知する仕様ではない。さらに同じリクエストのRouter/Controlログを複数件として数えていた。

## 本番Control D1の読み取り調査（本番書込みなし）

当日の読み取り時点、直近7日の `operational_diagnostics` に `failed` 約306行、重複除外した失敗追跡ID約265件。旧設計でも複数の機能のHTTP失敗は残っていたが、**記録があることと全機能の業務失敗を漏れなく拾えることは別**。`slow` のみの記録や未記録の依頼件数は、このDBだけから復元できない。

## 既存機能横断の監査対象と結果

| 経路・区分 | 調査対象 | 共通ログの状況・対策 | 検証の性質 |
|---|---|---|---|
| GAS互換RPC | `src/gasApi.js` の実登録182件 | 全RPCに共通HTTP200業務失敗判定を適用し、事前allowlist登録を不要化 | 登録名を動的抽出した合成失敗応答検査 |
| GAS直接API | 同ファイルの44件 | 同じ分類器を経由、通常の成功readは記録しない | 同上、実Router/Controlの合成エラー連結テストも実施 |
| Native API | `src/index.js` の実ルート149件 | 公開Router/Controlの共通境界で検知する | 登録名の動的抽出による契約検査 |
| 重複除外 | 合計352操作 | 失敗5種＋通常成功を適用し延べ2,113シナリオを実行 | 診断分類器のテスト。352機能の正式業務QAではない |
| Router→Control→共通Gateway | 個別API、RPC、店舗のルート照会 | 共通追跡IDを保持し、転送の区間別時間とHTTP失敗を記録 | 共通Worker経路の統合テスト |
| オーナー変更 | 申請・事前重複・確認・確定 | 既存の本人確認後の重複判定と段階別ログを再利用 | 物理店舗を模したローカル分離D1 E2E |
| AIクレジット・RevenueCat | 既存の固定業務監査＋共通ログ | 成功時も監査対象という既存仕様を維持。別の会計正本を上書きしない | 既存回帰・Webhook受信・診断テスト |
| 画像・CloudPRNT・内部プロキシ | HTTP失敗・遅延・例外 | 公開Router/Controlの共通境界にあるものは検知。非JSON業務失敗は内容解析対象外 | ソース経路の確認。画像保存の既存R2モックに別件FAILあり |
| オフラインiOS/Androidクライアント | `mobile-app/web/api.js` | 失敗・5秒超のローカル診断再送キューあり。端末側の強制終了・キュー喪失は残存リスク | ソース確認。正式実機再現は未実施 |
| Hosted webクライアント | `docs/yuwaku/api.js` | Nativeのオフライン診断キューと同等ではないが、公開APIのサーバー側は共通ログで補足 | ソース確認 |
| Cron/Workflow・内部のみの非HTTP処理 | `scheduled` / `waitUntil` / 非公開Workflow | 公開Routerの共通境界を通らない処理が存在。単純に352操作のPASSに含めない | 残存の網羅対象。個別のキュー・台帳・失敗回復の監査が必要 |

## 横断改修

- `src/serverTraceDiagnostics.js`: 固定業務名を条件にせず、すべてのJSON応答について `ok:false`、`success:false`、ネストした `data.error` を安全に分類。既知のエラーコード以外は `api_business_failed` として機密データを記録しない。非JSON・大きな応答の解析は意図的に制限。
- `src/hybridPublicRouter.js`: RPCの操作名を公開Router・Controlで一致させ、同じ追跡IDを用いる。
- `src/controlPlaneWorker.js`: 共通応答分類器を使い、Controlが予期しない例外を投げた場合にも共通の失敗目印を記録。店舗ルート取得と共通Gateway転送の失敗・遅延を区間別に記録。
- `src/operationalErrorSpike.js`: 公開Routerでの受付ログがあれば、サーバーが発行した `event_id` を正式なリクエスト件数の基準とする。Controlだけの受付記録、内部段階ログを順に補完する。同じリクエストを複数Workerが記録しても1件。一方、クライアントが追跡IDを意図的に使い回して複数のHTTPリクエストを送っても、それぞれ別件として数える（`trace_id` の単純な `DISTINCT` は使用しない）。
- `scripts/ci/change-impact.mjs`: ソースのどのバックエンド機能が変更されても共通診断契約テストを自動選択。既存の差分テスト最適化と併用。
- `test/auto-ci/server-diagnostics-coverage.test.mjs`: 実登録マップから対象を自動抽出。新機能専用ケースを毎回増やさない。架空の新機能を追加せずに同じ失敗分類が適用されることも確認。

## 検知できること・できないこと

**検知できる:** JSONで標準の業務失敗構造を返すHTTP 200、HTTP 4xx/5xx、5秒以上の処理、例外、ログ保存サービスの失敗を示す最小限の安全なWorkersコンソール警告。RPCや直接APIの新規登録でも専用のログ実装は不要。

**残る制約:** 大きなJSON応答や独自形式で表現された業務失敗は、安全な検査サイズ上限・契約外形式のため自動判定できない。Workerが応答前に強制終了した場合、開始時の永続チェックポイントがない一般処理は確定できないことがある。永続D1の障害では最小限のコンソール警告にフォールバックするが、これを同等の永続監査と偽らない。内部Cron/Workflowは公開HTTP境界外。アラートは現在も「急増」基準であり、単発のメール変更失敗を即時通知するものではない。

## 追加監査: Fatal/プロセス強制終了の検知 (2026-11-09)

- **発生したFatal**: ローカルの `test/common_tenant_gateway_e2e_test.mjs` で `image_moderation_storage_unavailable` の未処理例外が発生。実サービスでは `src/imageStorage.js` のフェイルクローズ判定に必要なR2 `list` が、古いテスト用モックに実装されていなかった。**本番のクラッシュを示す証拠ではない**。
- **修正**: テスト用R2モックに本物と同じ `list({prefix,limit})` を追加し、画像モデレーションの本番の拒否判定は緩めていない。`node test/common_tenant_gateway_e2e_test.mjs` は `PASS / checks=251` に回復。
- **テストFatalの検知**: Nodeの未処理例外はプロセス終了コード1となり、既存 `scripts/ci/run-auto-discovered-tests.mjs` は非ゼロ終了/プロセス生成エラーを `AUTO_CI_TEST_FAILED` として記録してCIを失敗させる。新規 `test/auto-ci/server-diagnostics-coverage.test.mjs` に実際の子プロセスへ例外を注入して検知・CI配線を確認するテストを追加。
- **本番Fatalの検知**: HTTP応答前にWorkerが例外、CPU制限、メモリ制限で強制終了すると、共通WorkerからControl D1への書込みは保証できない。Cloudflare Workers Metricsは `Uncaught Exception`、`Exceeded CPU Time Limits`、`Exceeded Memory` 等の実行結果を検知できる。持続的な診断にはWorkers Logsが必要。
- **検出された設定の穴**: Provisionerのみ `[observability] enabled=true head_sampling_rate=1` が明記され、Router/Control/共通Gatewayでは保証されていなかった。`wrangler.control-plane-production.toml`、`wrangler.hybrid-router-production.toml`、`wrangler.toml` と共通Gatewayの自動構成生成処理に明記してCIでも検査。構成再生成と3Workerの`wrangler deploy --dry-run`で検証。**本番への反映は未実施**。
- **残存する通知上の違い**: Workers Logsに例外を永続保存することと、単一の例外発生時にメール/プッシュ通知することは別。既存のD1急増通知（15分閾値）はWorkersランタイムFatalを無条件に捕捉・通知する保証ではない。Cloudflare側の例外通知ポリシー・Issues接続の本番設定/送信試験は未確認。既存Wrangler 4.131.1では `observability.issues.enabled` に必要な4.134.0以降の機能は未適用。

## 追加実装・本番適用: 独立Fatal運営メール通知 (2026-11-09 11:50 PHT)

前節の「単発Fatal通知は未構築」という記述は**その時点の調査結果**であり、以下の独立Tail通知実装により更新された。

- **独立監視**: `src/fatalAlertTailWorker.js` と `wrangler.fatal-notifier-production.toml` を新設。`izakanpai-fatal-notifier` は Workers Tail の `exception` / `exceededCpu` / `exceededMemory` / `scriptNotFound` のみを検出。正常終了や通常のHTTP業務失敗は通知しない。
- **既存4 Worker接続**: `izakanpai-api`、`izakanpai-control-plane`、`izakanpai-common-gateway`、`izakanpai-tenant-provisioner` の Cloudflare script-settings へ Tail consumer を追加し、GETの読み取り検証で **4/4 attached**。既存のWorkerアプリコードを再デプロイしていない。Tailログにも4つのProducerの正常イベント受信を確認。
- **独立の通知履歴**: `control-plane/0017_fatal_alert_outbox.sql` を本番 Control D1に適用（11列の schema readback PASS）。同一Fatalの再送重複を抑制し、メール送信の失敗や再試行を台帳へ記録。Cronは5分ごと。メール送信前にWorker自身が停止した場合もTail Workerが検知する。
- **本番送信先**: 運営者が検証済みの `izakanpai.system@gmail.com`。Cloudflare Email Sending専用の `alerts.izakanpai.com` を追加し、送信元を `noreply@alerts.izakanpai.com` に限定。既存 `mail.izakanpai.com` のResend送信設定は変更していない。`admin@izakanpai.com` は未認証だったため認証メールの発行を依頼済みだが、現行Fatal通知先には使用しない。
- **配送証拠の訂正 (2026-11-09 12:10 PHT)**: `selftest-fatal-email-20261109` の 03:50:43Z の `outbox state=sent` は Cloudflareへの送信受付のみ。Email Service `emailSendingAdaptive` で 03:50:44Z の SMTP `delivered` は確認できたが、**実宛先は `admin@izakanpai.com` だった**。後から設定した `izakanpai.system@gmail.com` 宛てに届いたことの証拠ではない。旧版設定が利用された送信であり、前節の「本番送信先」の説明を、この過去通知にも遡及適用してはいけない。ユーザーがGmail受信箱で未着を確認したのは整合的。
- **新規再送テスト**: 04:05:43Z に `selftest-fatal-gmail-check-20261109b` を使った新テストを通知Workerへ投入し、outbox `state=sent`, `attempts=1`, `last_error=none` を確認。さらに Cloudflare RESTの送信先明示テストで、`noreply@alerts.izakanpai.com` → `izakanpai.system@gmail.com` の送信受付は成功するが結果は **`queued=true`, `delivered=false`** だった。04:10Z時点の GraphQL 配送ログに新規のSMTP配送完了はまだ見えていない。**現在の運営宛SMTP配送到達は未確認であり、正式な通知配送PASSを宣言しない**。これは実際のFatalを発生させた試験ではない。
- **再確認基盤**: `scripts/release/check-fatal-email-delivery.mjs` は送信先、件名、Cloudflare SMTP結果を照合し、異なる宛先の `delivered` をPASSとみなさない。`scripts/release/probe-fatal-email-direct-delivery.mjs` は運営者が承認した時のみ使う1回限りの送信先固定診断。外部Gmail受信箱は直接確認できないため、迷惑メール・すべてのメールも確認対象。Cloudflare `sent` と Gmail inbox 表示を混同しない。
- **Fatal通知Worker経由の追加テスト（2026-11-09 12:35 PHT）**: ユーザーが12:08に受信した直接SMTPメールとは別に、`selftest-fatal-notifier-gmail-20261109-1232` を本番 `fatal_alert_outbox` に `pending` 登録。12:35:42のCloudflare定時Cron実行（Tailログに `Ok`）後、12:35:43.387に `state=sent`、`attempts=1`、`last_error=none` を読み取り検証。これで **通知専用Worker → メール送信サービス受付はPASS**。元の4 Workerで実際のFatalは発生させていないため、Tail ProducerがFatalを検出する工程は今回のテスト対象外。
- **Fatal通知WorkerのGmail到達確認（ユーザー証拠受領 2026-11-09 12:54 PHT）**: ユーザー提供のGmail受信画面画像 `IMG_2585.png` には 12:05 の `izakanpai-api` 通知（本文ID `selftest-fatal-gmail-check-20261109b`）と12:35の `izakanpai-control-plane` 通知（本文ID `selftest-fatal-notifier-gmail-20261109-1232`）が表示されている。12:35の本文識別子は本番 `fatal_alert_outbox` の `sent_at=2026-11-09T04:35:43.387Z`、`attempts=1`、`last_error=none` と一致。**通知台帳 → Cron → Fatal通知専用Worker → メール送信 → Gmail受信はPASS（テスト通知による結合検証）**。以前Cloudflare `emailSendingAdaptive` / `emailSendingAdaptiveGroups` に該当Gmail配送レコードが表示されなかったのはログ検索の未反映・非表示であり、今回はユーザー受信画面を一次証拠として扱う。実際のWorkerにクラッシュを故意に注入してTailが捕捉する工程は未実施、正式な本番Fatal検知試験のPASSとは混同しない。
- **安全性**: メール本文とD1はWorker名・安全なエラー分類・UTC・Ray ID・ハッシュIDのみ。例外メッセージ・URL・APIトークン・メール利用者情報は保存しない。通知WorkerはHTTP公開ルートを持たず、Tail接続とCronのみ。新Workerのデプロイは実施済みだが、他4 Workerのソースデプロイは未実施。
- **再発防止**: `test/auto-ci/fatal-operator-notification.test.mjs` に、Fatal分類、1件即時送信、二重送信防止、メール失敗再試行、未認証時の長期保留、機密情報除外、構成接続を追加。`scripts/release/worker-impact.mjs` は Fatal Worker を依存の先頭に追加、`scripts/release/attach-fatal-tail-consumers.mjs` はコード再アップロード不要の設定のみの安全更新、`scripts/release/fatal-notifier-schema-check.mjs` は本番DB台帳欠落を拒否。
- **ソースの反映状態**: 共有ワークツリーには他作業のステージ済み・未コミット変更が存在する。今回のコード差分は自動コミット/プッシュしていない。将来の通常リリースで監視設定が外れないよう、production Wrangler構成・共通Gateway自動生成にも Tail consumer を明記した。

## 運用での確認方法

`docs/admin.html` の既存「サーバー共通障害ログ」に運営者としてログインして、`storeId=platform`、日時範囲、追跡IDで入口・Control・転送段階を検索。店舗固有のメール確定段階（`owner_email/confirm.*`）がある場合はその店舗IDに切り替えて同じ追跡IDで検索する。内部データの調査では、Control D1に対する読取専用SQLで `WHERE trace_id=? ORDER BY recorded_at,event_id` が可能。APIトークン、メールアドレス、注文本文はログへ格納しない。

## 検証とリリース状態

- 共通分類・CI登録テストは実行済み。Router→ControlのHTTP 200業務失敗を架空の未登録RPC・既存directアクションで再現、失敗行のD1保存と両Workerでの操作名一致を確認
- 診断D1検索・アーカイブ・15分急増検知の既存テストを再利用。追跡ID重複除外の負例も追加
- Cloudflare ControlおよびRouterの `wrangler deploy --dry-run` はPASS。本番デプロイは未実施
- 範囲を広げた `common_tenant_gateway_e2e_test.mjs` は画像モデレーションR2テストダブルに `list` がないことによる別件FAIL。ログテストの結果とは区別
- Legacy GAS全体スモークにも、未コミットのコミッション仕様変更と旧ルール期待値の別件FAILがある。本件ログ変更の合格として扱わず、リリースゲートを強制的に通過させない
