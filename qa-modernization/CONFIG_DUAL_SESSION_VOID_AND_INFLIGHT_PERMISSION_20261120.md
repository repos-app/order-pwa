# Izakanpai 注文取消：2セッション競合・保留リクエスト中の権限失効 QA

日付：2026-11-20。既存Chromium実UI、production Gatewayコード、店舗別の隔離SQLite、既存`configuration-cross-live-admin-order-entry-browser.test.mjs`を再利用。ローカルのみで、GitHub Actions・本番Cloudflare Worker/D1・実端末は使用していない。

## 1. 検証対象と確定結果

前回までに確定した27件に、今回 **6業務ケース**を追加した。

| 判定対象 | 結果 |
|---|---|
| 今回の追加（同一注文競合3、別注文競合1、保留中失効1、復帰再送1） | **6/6 LOCAL_PASS** |
| 注文管理の実業務ケース | **33/33 LOCAL_PASS**（Node TAP親込み34/34 PASS） |
| Gateway受付タイミング | 2つの独立ブラウザのPOSTが両方到着するまで、テスト用バリアでGateway呼出しを保留。双方到着後、**改変していない本番Gateway関数**を実行 |
| 設定網羅性・限定ゲート | **SCOPED_LOCAL_REGRESSION_PASS / exit 0** |
| 全設定×全業務の完全網羅 | **NOT_FULLY_VERIFIED / exit 1**（未完了判定を維持） |
| 正式実機QA | **NOT_RUN / PASS 0 / FAIL 0** |

## 2. ケース別オラクルと実操作

| 新規ケース | 実ブラウザ/Gateway/物理DBの確認 |
|---|---|
| ORDERS-VOID-TWO-SESSIONS-SAME-ORDER-BOTH-UI-READY | 提供済み注文で在庫10→9。マネージャー本人と一般スタッフ（別のマネージャー認証情報あり）の**2ブラウザの取消画面を同時に表示**し、取消対象は同一注文・未取消・監査0件 |
| ORDERS-VOID-TWO-SESSIONS-SAME-ORDER-SINGLE-RESTOCK | 両方の実取消ボタンを同時操作。双方がGatewayに到達するまではサーバー未処理。解放後、**成功1件、`already_void`拒否1件**。伝票取消1件、在庫9→10、返却履歴＋1件、取消監査1件。敗者画面には翻訳済みの取消済みエラーが表示 |
| ORDERS-VOID-LOSING-SESSION-RETRY-LEDGER-UNCHANGED | 負けたブラウザから取消ボタンを再操作し、**再送された新しいレスポンス本体**が `already_void` になることを確認。注文・在庫・在庫履歴・監査は完全不変（既存表示を見ただけでのPASSにしない） |
| ORDERS-VOID-TWO-SESSIONS-DIFFERENT-ORDERS-EACH-RESTOCK | 同在庫を使う2件の注文を提供（10→8）。2ブラウザから**別々の注文**を同時取消し、2件とも成功。在庫8→10、注文別に消費−1＋返却＋1、監査各1件、他店舗DB不変 |
| ORDERS-VOID-IN-FLIGHT-STAFF-PERMISSION-REVOKED-BEFORE-GATEWAY | 一般スタッフが実ボタンから取消POSTを送信し、Gateway実行手前で保留。Ownerが実権限マスタ画面で当該スタッフの`admin`権限をOFFにしてSQLiteへ保存。保留POST解放後、**サーバーが最新権限で拒否**。注文・在庫・取消監査は変更なし |
| ORDERS-VOID-IN-FLIGHT-STAFF-PERMISSION-RESTORED-RETRY | Ownerが権限を再付与し、**同じスタッフのv3ログイン**で取消ボタンを再送。今回は受理され在庫がちょうど1個戻り、取消監査・承認者が1件記録 |

失敗したテスト実行の履歴も保持。初回追加した画面検証は、製品が内部エラーコード `already_void` を人間向け文言へ翻訳する実装を考慮していなかったためタイムアウトした。修正後の再送検証も、旧画面メッセージを即時に読んでしまう同期不足があったので、**再送後のHTTPレスポンスが返るまで明示的に待ち、その中のエラーコードを独立確認**するよう変更した。製品の業務処理を無根拠に変更したり、タイムアウト延長だけで誤PASSにしていない。

## 3. 証拠

- ケース別物理SQLite証拠・監査結果：`test-results/qa-modernization/configuration-business/cross-live-admin-order-entry-*/result.json`（最新、33/33 PASS）
- 本実行でのPNG：2ブラウザ同時取消・失効時・復帰後を含む**17枚**、それぞれSHA256
- ソース根拠：最新のE2E証拠に記録した**15ファイルのSHA256**
- 一括関連回帰：`test-results/qa-modernization/config-dual-void-inflight-20261120-regression.log`
- 設定限定ゲート：`test-results/qa-modernization/config-cross-dual-void-inflight-20261120-scoped.log`
- 完全網羅ゲート：`test-results/qa-modernization/config-cross-dual-void-inflight-20261120-strict.log`
- 独立照合：`node test-results/qa-modernization/config-regular-staff-approval-20261120-verify.mjs --inflight`
- 独立監査出力：`test-results/qa-modernization/config-cross-dual-void-inflight-20261120-validation.json`

中央 `configuration-coverage-status.mjs` に6ケースのID、個別の業務オラクル、Ownerの権限切替履歴、PNGのSHA必須検査を登録した。ローカル業務による代表権限フロー検証数は**132件**（対象画面数と別）。

## 4. 検証できていない重要な境界

**これはブラウザ2つでの同時リクエストをテスト用バリアで揃えたローカル検証**であり、Cloudflareの別Workerインスタンスが本番D1に同時書込みする競合を実証したものではない。実機2台、実通信断によるACKロスト、クライアント再送とD1トランザクション復旧のレース、印刷機への取消送信、外部決済/返金、SC/VAT/VIP/コミッションとの多重境界は今後の正式QAで検証する。

## 5. 新規6業務ケースを含む全219ファイルの再回帰（確定追記）

現行ソースで既存の `node scripts/ci/run-auto-discovered-tests.mjs` を実行し、**219/219ファイルPASS、FAIL 0、skip/deferred 0、過去PASSキャッシュ再利用0、exit 0** と確定した。追加した同時取消・権限失効6ケース、S4/S5等もこの全件回帰の対象。開始前に固定した**625ソースSHA256**が、完走後にすべて一致（変更0）。

- 全件実行ログ：`test-results/qa-modernization/auto-discovered-full-219-20261120-dualvoid.log`
- 終了コード記録：`test-results/qa-modernization/auto-discovered-full-219-20261120-dualvoid-exit.json`
- 実行前ソース：`test-results/qa-modernization/full219-20261120-source-before-dualvoid.json`
- 独立監査：`node test-results/qa-modernization/full219-20261120-verify.mjs --dualvoid` → `FULL219_INDEPENDENT_VERIFY verdict=PASS, pass=219, fail=0, reported=219, sourceHashDrift=0`
- 検証結果：`test-results/qa-modernization/auto-discovered-full-219-20261120-dualvoid-validation.json`

このPASSは**ローカル自動テストのファイル単位結果**であり、全設定組合せ・物理端末・本番Cloudflareの正式QAへ昇格しない。

**正式QA：NOT_RUN、PASS 0、FAIL 0。未コミット・未push・未デプロイ。GitHub Actions不使用。**
