# IZK-UT-178 第5弾 — 日本・フィリピン・英国の地域設定と営業日境界

2026-11-17。既存S5-SETTINGS-012、Chromium/実Gateway/独立SQLite、S5S6証拠アダプターを再利用。
前の第4弾BW-EXT-074の修正も保持。

## 進捗・正式QAとの区別

| 指標 | 第4弾 | 第5弾 | 増分 |
| --- | ---: | ---: | ---: |
| 要求総数 | 206 | 206 | 0 |
| ケース紐付け | 112 | 113 | +1 |
| 未紐付け | 94 | 93 | -1 |
| P0未紐付け | 30 | 29 | -1 |
| 正式実機QA PASS増分 | 0 | 0 | 0 |

## BW-EXT-035 → S5-SETTINGS-012

既存のJP地域設定保存→再読込テストを拡張し、実際のsettings.htmlの
操作→ローカルGateway/実テナントSQLite→画面再読込をJP/PH/GBの3国で実行。
既存の税率101入力拒否テストも保持。

- JP: YYYY/MM/DD、JPY、Asia/Tokyo、整数桁
- PH: MM/DD/YYYY、PHP、Asia/Manila、小数2桁
- GB: DD/MM/YYYY、GBP、Europe/London、小数2桁
- 各国で営業日切替時刻02:30を保存。DBのbizDayCutoffHour=2、
  bizDayCutoffMin=30、タイムゾーンをSQLと共通サーバー設定で独立照合。
  画面再読込後にも同じ値であることを確認。
- 共通DateDisplayの表示と、実際の経費画面のdate型入力で2026-11-17を
  入力した表示オーバーレイを照合。3件の経費を本物のGateway経由で保存し、
  SQLのexpense_date=2026-11-17と経費カードの地域別表示を確認。
- 冬期の2026-11-17を参照日として、02:29と02:31の営業日境界を
  businessDateRangeUtcと独立SQL大小比較で照合。
  JP開始2026-11-16 17:30:00Z、
  PH開始2026-11-16 18:30:00Z、
  GB開始2026-11-17 02:30:00Zを確認。
- 他店舗の設定・タイムゾーン不変、実ブラウザのエラーなし、
  シナリオ独立証拠アダプターのPASSとソースハッシュ鮮度一致。

実行済み：S5-SETTINGS-012 実Chromium **1/1 PASS**。
偽証拠・未実行・誤地域・誤UTC境界を拒否する契約テストもPASS。
証拠：test-results/qa-modernization/s5-settings/local-2026-11-17T10-02-11-666Z-p1140/result.json
（8枚のスクリーンショットと独立SQL値、ソースSHA256）。

## 第4弾の回帰も保持

S5-DATA-JOB-LIFECYCLE-053 はソースハッシュが更新されたため再実行し、
実Chromium **1/1 PASS**、独立証拠PASS/最新ソースと一致。
証拠：test-results/qa-modernization/s5-data-jobs/S5-DATA-JOB-LIFECYCLE-053-2026-11-17T10-02-52-945Z-p26732/result.json

業務/WEB要求の整合性・偽証拠拒否・両P0のオラクル・
実データ管理ジョブのDB障害注入等の限定契約回帰：**19/19 PASS、FAIL 0**。

## 未完了・制約

- 実際のCloudflare本番Worker、顧客テナント、ネイティブ実機の正式QAは未実施。
  今回の正式QA PASS増分は0件。CASE紐付けと正式PASSは別。
- 地域設定の境界検証日は11月の冬期。英国の夏時間切替週や
  過去/未来のDST差分を横断した帳簿集計の検証は含まない。
  getTzOffsetHoursが現在のオフセットを使う既存設計の
  過去日付・DST日の正確性は別途検証が必要。
- BW-EXT-019（実Worker停止/再起動）、BW-CROSS-04
  （削除・復元・CSV全種類の複数タブ同時監視）などP0未紐付け29件。
- コミット・プッシュ、Worker/DBデプロイ、端末ビルド、
  正式QA台帳のPASS更新は実施していない。
  共有ワークスペースにある他担当の未コミット差分は維持。

**結論**：IZK-UT-178はOPEN継続。206要求の全件完了とはしない。
