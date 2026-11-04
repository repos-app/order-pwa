# 共通サーバー診断ログ：365日保持（2026-11-03）

## 保存対象と非対象

- **対象は Control D1 `operational_diagnostics` の許可済み固定メタデータのみ**。API/課金/AI失敗の追跡ID・固定エラーコード・所要時間などであり、リクエスト本文、個人情報、トークン、購入レシートは含まない。
- **業務正本は非対象**。RevenueCat inbox／dispatch attempts、AIクレジット残高・操作履歴・追記台帳、注文、決済、正式QA証跡の削除・保存規則は変更しない。
- Control D1の直近30日は検索用の現役領域。31〜365日は専用R2バケット `izakanpai-operational-archive` の `operational-diagnostics/v1/YYYY/MM/DD/{storeId}/` 以下にgzip圧縮して保存する。
- 365日超のアーカイブのみ期限切れ削除。既存のR2店舗画像・他バケットは操作しない。

## Cronと原本保護

- 新規Worker／Cronなし。Control Workerの既存15分Cronから `archiveDiagnostics` と `expireDiagnosticArchives` を呼ぶ。
- 1巡回あたりD1最大500行。日付×店舗単位に分け、R2へgzipをPUTする。
- gzip展開したR2のSHA-256、行数、イベントIDを**再読込で検証してから**、D1の同じイベントIDを単一の条件付きDELETEで削除。どの段階の失敗でも未削除のD1原本を保持する。内容ハッシュのキーで再試行時の重複アップロードを抑える。
- 365日超のR2期限切れ処理は最大100オブジェクト／巡回。保存時メタデータの最終記録時刻がないものは安全側で保持する。
- Cronの失敗は固定コード `operational_diagnostics_archive_cycle_failed` によってログ確認し、他のテナント運用処理を妨げない。

## 運営管理画面からの検索

- `https://izakanpai.com/admin.html` と `/admin/` の「サーバー共通障害ログ」を使う。既存の `PLATFORM_ADMIN_TOKEN` でログインした場合のみ表示し、APIはControlの既存内部シークレット検証を経由する。
- 店舗ID、追跡ID、開始日・終了日（UTC）を指定。過去365日の**連続31日以内**の範囲に限定し、最大50件表示する。D1・R2を同じ時系列へマージし、R2保存元を表示する。別店舗のデータを混ぜず、同一イベントIDの重複は除去する。
- アーカイブの欠損、ハッシュ不一致、過大な検索範囲は、成功0件と誤表示せずエラー扱いにする。

## 検証・制限

- 本番適用直前の `operational_diagnostics` は33件で、最古は2026-10-31。既存30日削除で失われたデータは復旧できない。
- `test/operational_diagnostics_archive_test.mjs` と既存の診断・管理画面・Control連携テストで、R2アップロード/読戻し/破損/再実行/店舗分離/期限切れ/業務正本非干渉を確認する。
- 実際に30日経過したログが出現するまで本番Cronの真正なアーカイブ実績は0件であり、将来の結果を事前にPASS扱いしない。R2への一時的な検証ファイルを書込・読戻し・削除する場合も、業務ログを合成しない。
