# 設定横断QA・全件ローカル回帰の現行証拠（2026-11-20）

## 結論（正式QAと混同しない）

- **既存 auto-discovered ランナーの全件通し実行：216/216ファイル PASS**。
  実行: node scripts/ci/run-auto-discovered-tests.mjs。
  exit 0、fresh 216、reused 0、fail 0、deferred 0、
  durationMs 1437559（約23分58秒）。
- **全件実行中の参照ソース変更：0/617ファイル**。
  test/auto-ci、src、mobile-app/web、scripts/ci、
  scripts/qa-modernization のJS/MJS/HTML全617件について実行前後の
  SHA-256を比較し、変更・増加ともゼロ。
- **設定横断の現行証拠ゲート：33/33 LOCAL_PASS**。
  scoped-strict exit 0。
- **CONFIG-CROSS-01～06はすべて PARTIAL_LOCAL_PASS**。
  全体 strict exit 1 は正常な未完了判定。正式QAに昇格しない。
- **正式実機QA：NOT_RUN / PASS 0**。GitHub Actions不使用。
  コミット・push・Worker/Web/DB本番反映は未実施。

## 検証ログ

| 種別 | test-results 以下の相対パス |
|---|---|
| 216ファイル全件のTAP/最終exit記録 | qa-modernization/auto-discovered-final-216-rerun.log |
| 実行直前の617ソースSHA-256 | qa-modernization/auto-discovered-final-216-before.json |
| 全件の独立件数検証・ハッシュ突合 | qa-modernization/auto-discovered-final-216-validation.json |
| 設定横断33レーンの現行証拠判定 | qa-modernization/configuration-matrix/configuration-coverage-status.json |
| scoped / full-strict の終了状態 | qa-modernization/final-config-scoped.log / final-config-strict.log |

PowerShell 5.1のリダイレクトで作成した全件ログは **UTF-16 LE（BOM付）**。
独立検証はエンコーディングを識別して
AUTO_CI_CASE_RESULT の216行を再パースし、PASS 216、
重複なし、最終ランナー集計と一致を確認した。
UTF-8と誤認して0件と数えない。

## 初回通し実行で発生した2件のFAILの解決

初回216件の全件実行は **214 PASS / 2 FAIL** だった。
そのFAIL証拠を消したり、別実行のPASSを元の全件結果に
混ぜたりせず、下記を修正して216件を**最初から再実行**した。

1. 料金・割引の複合業務：実Chromeと物理SQLiteの9業務を
   3つの隔離テナント群で処理する集約テストが従来の親135秒と
   ランナー180秒の時間制限に達した。
   独立SQL期待値とケースを削除せず、親上限360秒、
   **ローカルFULL専用**の当該集約ランナー枠900秒とした。
   単独実行で業務9/9・TAP10/10 PASS、最終全件でもPASS。
2. 売り切れ注文の証拠：UI変更で既存スクリーンショット・
   ソースSHAが STALE_SOURCE になっていたため、既存の
   実ブラウザ売切→注文拒否→Gateway/SQLite検証を再実行。
   PNG・業務アサーションの改ざん検出テストまでPASS、
   最終全件でもPASS。

## 設定と実業務の範囲

- 保護画面34、固有権限キー29、本人セッションで
  許可/取消ナビゲーション68、実UI・RPC・物理SQLite証拠を維持。
- CONFIG-CROSS-01 のローカル証拠175サブケース。
  そのうち実ブラウザでの更新・削除・承認等の
  権限業務フロー95ケース。Clock署名Gateway打刻は別途4ケース。
  TAP親ケースやS4/S5の再利用分を二重計上しない。
- 書込み・状態変更・端末操作を持つ28画面のうち、
  **代表的な実ブラウザ書込みの権限フローは25/28画面**。
  ただし各画面の全ボタン・業務アクションを網羅した意味ではない。
- 追加検証：コミッション/利益試算6/6、KDS5/5、
  持ち帰り編集/取消4/4、注文入力/管理と一般客QR8/8、
  Clock署名Gateway4/4。
- 製品修正：KDS優先度確定後の画面表示即時反映、
  Dashboard売上目標を混在させた設定保存の権限迂回防止、
  署名済みスタッフの注文送信・打刻に対する
  Gatewayの権限取消後拒否。客の無署名QR注文維持を確認。

## 未完了の3画面と外部依存

- **bridge.html**：Bluetooth/USB接続、実印字、機器ACKは実機依存。
- **clock.html**：実画面の本人タイル表示と署名Gateway打刻は確認。
  実UIでのカメラ撮影・GPS付き打刻は未検証。
- **data_admin.html**：既存S5でCSV書出し、非システム管理者の
  破壊操作拒否はPASS。
  システム管理者の実ボタンからの非同期削除/復元、
  ワーカー完了・バックアップ生成までの横断権限ライフサイクルは未検証。

実通知配信、OS権限、カメラ/GPS、紙印字、カード/QR外部入金、
外部メール、本番D1/R2復旧も別途の正式実機・外部QAが必要。

本書は独立した最新全件報告であり、
旧報告の209件中208 PASS/1 FAILおよび
旧ギャップ監査当時の13/28という**当時の履歴を改ざんしない**。
