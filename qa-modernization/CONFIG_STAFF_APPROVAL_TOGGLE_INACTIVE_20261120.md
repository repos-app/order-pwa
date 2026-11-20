# Izakanpai 注文取消：一般スタッフ・承認ON/OFF・在籍状態の実業務QA

検証日：2026-11-20
環境：既存の実Chromium・production Gatewayコード・店舗別隔離SQLite。GitHub Actions、本番Worker・D1、外部決済、実機・外部プリンタは未使用。

## 今回の完了条件と結果

| 検証対象 | 結果 |
|---|---|
| 今回追加した7業務ケース | **7/7 LOCAL_PASS** |
| 注文管理の既存＋追加業務ケース | **27/27 LOCAL_PASS**（Node TAP親込み28/28） |
| 関連6ファイル一括回帰 | **164/164 TAP PASS、FAIL 0、skip 0、exit 0** |
| 証拠独立照合 | **PASS**：対象27ケース・ソース15件SHA256・PNG13件SHA256一致 |
| 中央設定網羅性の限定ゲート | **SCOPED_LOCAL_REGRESSION_PASS（exit 0）** |
| 全設定・全ロール・全業務網羅ゲート | **NOT_FULLY_VERIFIED（exit 1）** |
| 正式QA | **NOT_RUN、PASS 0、FAIL 0** |
| 219ファイル全件ベースライン | 前回作業時点で **219/219 PASS、exit 0**。今回の7ケース追記後の全219ファイル再実行は**未実施** |

## 業務シナリオ

既存テスト `test/auto-ci/configuration-cross-live-admin-order-entry-browser.test.mjs` を拡張。対象のスタッフは実ログインした同一v3セッション、設定変更はOwnerが実 `settings.html` 画面で保存。注文は実注文管理ボタンで提供し、取消ボタンから送信。返却対象商品の在庫は提供で10→9、取消成功時に9→10と戻り、失敗時には戻らない。注文、在庫履歴、取消監査、承認者・操作者を物理SQLiteで照合。

| 新規ケース | 実操作と物理DBで確認したこと | 判定 |
|---|---|---|
| STAFF-APPROVER-MISSING-CLIENT-BLOCK | 承認ONで承認情報空欄：取消API送信0、注文・在庫・取消監査すべて不変 | PASS |
| STAFF-NONMANAGER-CREDENTIALS-BLOCKED | 同一店舗の有効な一般スタッフ本人のID/パスワードを承認者欄へ入力：Gateway側で承認拒否、全台帳不変 | PASS |
| STAFF-APPROVAL-OFF-REAL-UI-RESTOCK | Ownerが設定OFF保存後、一般スタッフの取消画面で承認欄非表示。実ボタン操作で取消成功、在庫返却＋1、監査操作者はスタッフ、承認者情報は空 | PASS |
| STAFF-APPROVAL-ON-REQUIRES-CREDENTIALS-AGAIN | OwnerがONへ戻すと同じスタッフの取消画面に承認欄が再表示。未入力はAPI未送信、DB不変 | PASS |
| STAFF-APPROVAL-ON-RESTORED-MANAGER-COMMIT | 正しい別人マネージャー情報なら取消成功、在庫返却1件、監査の操作者と承認者はそれぞれ正確、スタッフのv3ログイン維持 | PASS |
| STAFF-INACTIVE-MANAGER-REAL-UI-DENIED | Ownerが実ユーザー管理画面で承認マネージャーを「退職」に保存。正しい資格情報でも取消拒否、注文・在庫・履歴・監査不変 | PASS |
| STAFF-REACTIVATED-MANAGER-REAL-UI-APPROVED | 同じOwner画面で「在籍」に戻すと、スタッフは再ログインなしで取消成功。在庫返却＋1・取消監査1件 | PASS |

実際に検出した初回のテスト側の不一致は、確認用SQLヘルパーが `actor` 列をSELECTしていないのにその列を期待したこと。既存商品DBは正しく記録されており、SQLオラクルの取得列を追加してテストを再実行した。商品仕様・DB内容は書き換えていない。

## 証拠・検証台帳

- 最新のケース別ログとスクリーンショット：`test-results/qa-modernization/configuration-business/cross-live-admin-order-entry-*/result.json`
- 既存の独立検証プログラムを再利用：`node test-results/qa-modernization/config-regular-staff-approval-20261120-verify.mjs --inactive`
- 機械照合結果：`test-results/qa-modernization/config-staff-inactive-approver-20261120-validation.json`
- 関連6ファイル回帰：`test-results/qa-modernization/config-approval-toggle-regression-20261120.log`（**164/164 TAP PASS**）
- 限定設定ゲート：`test-results/qa-modernization/config-staff-inactive-approver-20261120-scoped.log`（exit 0）
- 完全設定ゲート：`test-results/qa-modernization/config-staff-inactive-approver-20261120-strict.log`（exit 1）
- 監査ゲート本体：`scripts/qa-modernization/configuration-coverage-status.mjs` に新規7ケースID・業務確認値・画像SHA256の必須検査を追加。注文管理レーンは従来20→**27/27**。

前の拡充作業からの連続した業務証拠は、新規24＋今回7＝**31件 LOCAL_PASS**。関係する3レーンの現在の業務ケースは領収書16＋在庫18＋注文27＝**61/61 LOCAL_PASS**。これは全画面・全設定の網羅件数でも正式実機QA件数でもなく、**実証した代表業務ケース数**である。

## 未完了事項

全設定と全ロール、全業務アクションの組合せは依然未網羅。特に複数端末同時取消・権限変更のリクエスト競合、会計とコミッション・VIP・SC・税・在庫の横断境界、実プリンタ応答・外部決済・Cloudflare本番D1/R2・OSカメラ/GPSの正式検証が残る。

**正式実機QA：PASS 0、FAIL 0、NOT_RUN。** 今回の追加後の全219ファイル再実行・コミット・push・本番デプロイは未実施。前回の219/219 PASSはその時点のベースラインであり、今回追加した7ケースを含む全件PASSと混同しない。
