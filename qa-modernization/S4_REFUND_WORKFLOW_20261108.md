# S4｜注文→会計→返金→売上集計の自律QA（2026-11-08）

## 最新状況への引き継ぎ（2026-11-08）

このファイルの7件・固有40件の実行は過去履歴。さらに複数商品・分割会計/片側返金・支払済み報酬clawback・PHP/JPYクーポン会員・同時返金の7ケースを追加。現行S4は固有47件でSQLite47/47・隔離D147/47PASS、改変不正証拠は両レーン56/56検知。最新の証拠・未保証・初回D1 Pilot FAILは S4_COMPLEX_CHECKOUT_REFUND_20261108.md を参照。

**ローカル専用検証。正式Android/iOS QA、実決済やCloudflare遠隔D1ではない。**

## 既存資産の再利用と新規シナリオ

src/refunds.js、src/reports.js、既存 test/gas_compat_smoke_test.mjs の返金・報酬・売上回帰を確認し、S2/S4共通Fixture・実Gateway・独立Oracleへ新規7件を追加した。従来33件と合わせ**固有40業務シナリオ**。

| ID | 業務条件と期待値 |
|---|---|
| S4-REFUND-FULL-034 | 現金会計100→管理者が全額返金、元伝票+100／返金伝票−100／純売上0 |
| S4-REFUND-REPLAY-035 | 同じ元伝票を二重返金しようとすると already_refunded、マイナス伝票1枚のみ |
| S4-REFUND-REVERSE-036 | 返金伝票への再返金は refund_receipt_not_refundable |
| S4-REFUND-REASON-037 | 理由未入力の返金は reason_required、返金伝票は作成しない |
| S4-REFUND-FOREIGN-038 | 他店舗の従業員の返金はHTTP403、元伝票を維持 |
| S4-REFUND-PHP-TAX-039 | PHPのサービス料10%＋任意設定税率12%で+123.20／−123.20、税・サービス料も相殺 |
| S4-REFUND-JPY-TAX-040 | JPYのサービス料10%＋任意設定税率12%で+123／−123、税13円・サービス料10円も相殺 |

任意設定税率12%は丸め検証専用であり、日本の標準税率を意味しない。JPYは小数0桁、PHPは小数2桁を店舗設定から適用。

## 業務横断の独立検証

- 元の正の領収書と負の返金伝票について、小計・VAT・サービス料・割引・総額・商品明細の数量/単価が完全に反転すること。
- receipt_refunds台帳の元伝票/返金伝票/返金理由/承認者、receipt_order_links、order_reward_snapshots、audit_log、op_log、全店舗別テーブルの所有店舗とFK整合。
- 実APIのgetSalesSummary、getReceipts、getSalesAnalyticsの3種類を返金後に呼び、返金後の純売上0、正の会計1件・返金1件、売上金額と元伝票の一致を検証。
- 別店舗のDB不変、テストDB全93店舗別テーブルのbefore/after/cleanup、終了後のGateway拒否、ケース別SHA256証拠。

## 実測

- SQLiteの全40業務ケース：**40PASS / 0FAIL / 0BLOCKED / 0NOT_RUN、22,102ms**。原証拠 test-results/qa-modernization/s4/local-api-2026-11-07T17-13-52-590Z-p1656-n1/summary.json と40ケースの個別JSON。
- **隔離workerd/D1の全40業務ケース：40PASS / 0FAIL / 0BLOCKED / 0NOT_RUN、361,488ms。** 代表例ではなく全件の独立Oracle・DB cleanupまで完了。原証拠 test-results/qa-modernization/s4/local-d1-2026-11-07T17-14-27-509Z-p19724-n1/summary.json。
- D1全40件のうち、テストランナーの更新中に作成された先頭13件はソースSHAがSTALE_SOURCEとなったため、**先頭13件だけ独立した隔離D1で再実行し13PASS / 0FAIL、ソース鮮度PASS**。再検証証拠 test-results/qa-modernization/s4/local-d1-2026-11-07T17-22-37-196Z-p13784-n1/summary.json。全40件を重複実行する代わりに共通カタログが新しい13件の証拠を統合し、現在は**SQLite40 PASS／D1 40 PASS／STALE_SOURCE 0**。
- **CI回帰：S4独立証拠/故障注入/ダッシュボード22テストPASS・0FAIL。既存npm test自動発見10ファイルも実行成功**（これはnpmのトップレベル221ステップ全完走とは区別）。自動発見テストは固定の過去証拠に依存せず、その場で必要な業務ケース証拠を作る形に改修した。
- **ライブダッシュボードの最終確認：SQLite40／D140／正式QA既存395。** 旧サーバープロセスが以前のコードを保持し、初回ライブ確認では0/0表示だったため、対象プロセスのみ安全に再起動しAPIとHTMLを確認。定期QAタスクは変更していない。
- 不正証拠の検出：従来の27種類に返金13種類（金額/負明細/承認者/参照/監査/帳票3種/リワード/店舗分離等）を追加し、**SQLite40/40・隔離D1 40/40検知、見逃し0**。原証拠 docs/qa-modernization/S4_refund_mutation_audit_sqlite_20261108.json と docs/qa-modernization/S4_refund_mutation_audit_d1_20261108.json。
- 本物の業務API成功直後の**実SQLite DB**で、返金伝票総額を−1にする、または返金監査ログ金額を−1にする2種類の故障注入は、それぞれFAILを記録した。cleanupと後続ケースPASSも確認。故障注入の期待FAILは通常の40PASSには加算しない。

## 失敗履歴・修正

- 最初の7ケースの業務APIは応答したものの、独立Verifierは6FAIL/1PASS。テスト側で金額0と−0を異なる値とみなし、認証前に拒否された操作について監査ログの記録を期待した点が原因。業務契約に合わせて独立Oracleを修正し、SQLite7/7PASS。
- 旧共通Oracleは全レシートを通常会計とみなし、負の返金伝票のFK・マイナス明細・承認者・元伝票の監査参照を検査できなかったため、返金用の相互整合性検証を追加。
- 売上サマリーだけでなく、領収書一覧・売上分析の別API結果を必須とした。
- 証拠のソース追跡へ返金処理・レポート・CRM・独立Oracleを追加し、古いソースのPASSの無条件流用を防止。
- 全件D1実行中にテストランナーの故障注入フックを更新したため、通常D1 40件のうち13件はソースSHAの鮮度判定でSTALE_SOURCEとなった。対象13件だけ共通ランナーで再実行し13/13PASS。共通カタログは全件の元runで分母を固定し、**より新しい正常回帰runで独立検証済みの同一caseId**だけ証拠を差し替える方式へ改修。故障注入や未検証の部分runをPASSに転用しない。

## 未保証の範囲

今回の新規ケースは1商品・現金・全額返金・管理者自己承認中心。部分返金（機能サポート有無を別調査）、複数商品/複数伝票・分割会計、非管理者の承認、クーポン/会員ポイント/スタッフ報酬との複合条件、実際のキャッシュの返金・入金、競合実行・通信障害・モバイル画面/実機は未検証。既存の別テストにその一部があってもS4新規ケースに混算しない。

**S4は部分完了。全機能カバレッジ未測定。正式QA新規PASS0。コミット/プッシュ/本番Worker配布なし。**
