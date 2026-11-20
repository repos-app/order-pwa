# Izakanpai カテゴリ統合・名称変更から顧客注文までの実ブラウザQA

実施日: 2026-11-20。区分: **ローカル実Chrome + 既存Gateway + 隔離された実SQLiteテナント**。正式実機QAとは区別する。

## 完了実績

| 実施項目 | 実測結果 |
|---|---|
| 新規業務サブケース | **14/14 LOCAL_PASS**。TAP親を含め15/15 PASS |
| 変更後の関連10テストファイル一括回帰 | **266/266 TAP PASS、FAIL 0、skip 0、exit 0** |
| 追加テストの検出 | auto-discovered **219ファイル**。旧218ファイル全件PASSの証拠は保持 |
| **219ファイルの新しい全件実行** | **未実施**。前回218/218実行と今回の関連266件を合算しない |
| ソース証拠 | 新規テストの参照15ファイルのSHA-256一致。PNGスクリーンショット15件のSHA-256一致 |
| 網羅性判定 | scoped-strict は exit 0。全設定・業務横断 strict は exit 1（未完了） |
| 正式実機QA | **NOT_RUN：PASS 0、FAIL 0** |
| リリース作業 | GitHub Actions不使用。commit・push・Worker/Web/DB本番反映は未実施 |

## 新たに検証した業務

既存のS4にはカテゴリ統合のサーバーRPCテストがあるため、今回そこは作り直さず、実画面操作と業務結果をつないだ。

1. 管理者本人が権限編集UIからスタッフの編集権限を付与。スタッフ本人でログインしカテゴリ2件をチェック。
2. 統合確認ダイアログをキャンセルすると、統合RPC未発行・全SQL不変。
3. スタッフ操作中に権限を取消すると、既表示画面からの統合RPCがサーバー側で拒否されDB不変。
4. ほかの編集者が商品を追加した場合、古い商品件数による統合を拒否し全SQL不変。
5. 統合先と移動元にそれぞれコミッションルールがある場合の拒否、ルール不変。
6. 異なるキッチンプリンター割当が競合する場合の拒否、印刷先不変。
7. 衝突解消後の統合成功。商品単価・販売状態・日英カテゴリ名・コミッション率・プリンタールート・表示順・旧名履歴をDBで検算。
8. 再読込後、移動元カテゴリの消失、仮登録商品が非公開のままであること、他店舗不変。
9. 既存カテゴリとの名称重複をUIで拒否し、変更RPCを送信しないこと。
10. 権限取消中のカテゴリ名変更をサーバーで拒否し、DB不変。
11. 権限復帰後のカテゴリ名変更成功。日英の名称、コミッション適用先、プリンター割当、カテゴリ順、名称履歴、価格・状態を検算。
12. 名称変更後の再読込で日英表示・商品価格・他店舗不変・スタッフ認証継続を確認。
13. 顧客向け公開注文PWAで匿名の本物のbootstrapを取得。変更後カテゴリのJA/EN表示、旧カテゴリ消失、仮登録非表示、単価415を確認。
14. 顧客PWAで不正な署名付き席トークンからの注文を実Gatewayが拒否し、DB注文0件、カート数量1・金額415を維持し、送信ボタンが復帰する。続けて正しいQR署名に戻して同じ画面から再送し、注文1件・明細1件・数量1・単価415、成功後の空カート送信ボタン無効を検証。他店舗不変。

顧客PWAは docs/order/index.html を実Chromeで開き、docs/order/config.js のAPI URLだけ隔離Gatewayに切替えた。顧客UI、注文ロジック、Gateway、署名付き席トークン、SQLite書込みはモック化していない。

## 実際に発見して修正した商品不具合

**注文が正常登録されてカートが空になっても、注文送信ボタンが再び有効になる。**

発生源: docs/public/order-app.js。注文成功後のカート合計更新で送信ボタンを無効化していたが、Promise終端で無条件に有効化していた。

修正: Promise終端で会計済みセッション状態と現在のカート小計を再評価する。これにより空カート/会計済みではボタンが無効となり、商品が残るエラー時には再操作できる設計を維持する。

修正前の実Chrome E2Eでは注文・明細・単価のSQLは正しくても、空カート送信ボタン条件がFAILした。**修正後、同じE2Eを再実行して15/15 TAP PASS、関連10ファイル一括回帰266/266 TAP PASS**。さらに、サーバーによる注文拒否からの実画面再送も追加検証し、拒否時DB不変・カート保持・再送成功時の注文1件を確認した。ただし、OSレベル通信遮断とタイムアウト後の再送は今回のテスト対象外。

初回の別FAIL（カテゴリ統合後にテスト側が旧カテゴリ件数を待ち続けた）は、テスト側の期待件数を更新して再実行により解消。両FAILの途中証拠は削除していない。

## 証拠の保管場所

- 新規テスト: test/auto-ci/configuration-cross-live-category-merge-authorization-browser.test.mjs
- 新規E2E実行の詳細・PNG: test-results/qa-modernization/configuration-business/cross-live-category-merge-*/result.json の最新フォルダ
- 変更後の関連回帰ログ: test-results/qa-modernization/config-category-public-order-20261120-regression.log
- 独立照合結果: test-results/qa-modernization/config-category-public-order-20261120-validation.json
- 再照合プログラム: test-results/qa-modernization/config-category-public-order-20261120-verify.mjs
- 限定・全網羅判定ログ: test-results/qa-modernization/config-category-public-scoped-strict-20261120.log と config-category-public-global-strict-20261120.log
- 前回218/218の全件実行: test-results/qa-modernization/auto-discovered-full-218-20261120.log

## 残件・範囲

全画面・全業務の許可/拒否と設定組合せ、税・SC・コミッション・VIP/人数・返金/決済横断、外部印刷/通知、OSカメラ・GPS、Cloudflare本番D1/R2などの正式検証は残る。今回は既存の画面内の未検証操作を追加したので、代表的な権限書込み画面数25/28を増やしたものではない。全網羅strictの未完了判定は維持した。
