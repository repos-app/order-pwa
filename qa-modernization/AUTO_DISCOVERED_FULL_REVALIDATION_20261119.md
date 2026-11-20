# 2026-11-19 自動検出全件回帰と修正後の再判定

## 実行条件・証拠

GitHub Actions、Codex、別CIランナーは使用していない。既存の
scripts/ci/run-auto-discovered-tests.mjs をローカルでそのまま利用し、
各テストファイルを単独の Node 実行単位として実行。1件FAILでも次のファイルへ進む。
実テナントと本番D1には書き込まず、S4/S5/S6は隔離Gateway、Chrome、
SQLite、ローカルworkerd/D1/R2で実行した。正式QA件数はPASS 0、FAIL 0、NOT_RUN。

| 実行 | 対象ファイル | PASS | FAIL | skipped / deferred | exit |
|---|---:|---:|---:|---:|---:|
| 初回全件 | 208/208 | 183 | 25 | 0 / 0 | 1 |
| ソース修正後の再全件 | 209/209 | 208 | 1 | 0 / 0 | 1 |
| 再全件後・残1ファイルの単独再検証 | 1/1 | 1 | 0 | 0 / 0 | 0 |

初回証拠: test-results/auto-discovered-full-20261119T103719Z/result.json、
stdout.log、stderr.log、failure-excerpts.log、実行前後のテストソースハッシュ。
実行時間 1,496,808ms。実行中に11テストソースの変更があったため、
初回のPASS・FAILをそのまま現在の判定に使わない。

再全件証拠:
test-results/auto-discovered-full-current-20261119-194956/result.json、
stdout.log、stderr.log、source-hashes-before.json、
source-hashes-after.json、exit-code.txt。
実行時間 1,489,529ms、fresh 209、reused 0、deferred 0。
実行前後で209テストファイルと既存ランナーのSHA256を比較し、
**sourceDrift 0/210**。唯一のFAILは
test/auto-ci/configuration-role-navigation-browser.test.mjs。
再全件実行時のテストファイル変更がなかったことを確認した。

## 失敗の切り分けと修正

1. 既存S4・S5集約ファイルの「FAIL」は最初の180秒上限による
   ETIMEDOUT。両方とも単独実行で S4 35/35、S5 41/41 PASSを確認。
   既存ランナーの通常テスト/CI/precommitの180秒は維持し、
   **ローカルFULLでS4/S5の2ファイルだけ900秒上限**に変更した。
   再全件でも実際に S4 35/35・S5 41/41 PASS。
   S6は単独9/9・再全件9/9 PASS。
2. 既存テストの期待/VMモックが現行仕様の追加関数や
   SQL構造に追従していなかったものを修正し、実画面/DBの負例や
   競合拒否の期待を削除しない。
   複数注文会計の読取回数は旧14回固定オラクルを単に緩めず、
   新しい人数/VIP料金読取2件を識別し、4注文8行と1注文1行の
   実会計を同一テナントで比較して N+1 読取がないことを検証。
3. 売切後注文拒否 BW-MENU-03 は現行ソースを実Chromeで再検証し、
   P0の証拠改ざん検出テストもPASS。再全件内でもPASS。
4. 実装上の不具合を修正：OS通知拒否後の虚偽ON表示をOFFに戻す。
   再許可登録・通信断中のOS解除・再接続時のサーバ登録解除は
   実ブラウザ+隔離SQLiteで4/4 PASS（OSプラグインは模擬）。
   Nativeのstaff-push.jsをv9、Service Workerキャッシュをv376へ更新。
   メニュー画像モードタブの横折返しをNative/Web本番/Web TESTで修正し、
   実Chromium8/8 PASS。
   席人数選択の「確定後は減員禁止」ロジックをWeb両版にも統一し
   13/13 PASS。
   フィードバック日付入力に共通CSSを全3サーフェスへ追加。
5. 再全件の唯一のFAILは、4人目の新しいChrome/ログイン画面で
   loginViewが15秒間 hidden のままとなった一時的な起動タイムアウト。
   この時点までに3役割×34画面=102件をPASS。
   同一ソースの直後の単独再実行は137/137 PASSだった。
   原因を無断で「製品障害なし」と断定しない。
   製品の認証起動watchdog（9秒/9.5秒）とWindowsの
   ブラウザコールドスタートの余裕を踏まえ、テストの表示待ちを
   30秒に拡大。さらに本当に停止した場合はloading/login/hub、
   API、アクセストークン有無、ブラウザJSエラー、スクリーンショットの
   SHA256を証拠保存してFAILにする。盲目的な再ログインや失敗隠蔽はしない。
   変更後の単独再実行は137/137 PASS、exit 0。

## 最終的に言える範囲

設定横断の限定監査は
scripts/qa-modernization/configuration-coverage-status.mjs --write --scoped-strict
で**26/26 LOCAL_PASS、exit 0**。ただし
CONFIG-CROSS-01～06はすべてPARTIAL_LOCAL_PASS、
全体 --strict は**未完了としてexit 1**のまま。
34保護画面・29権限キー・68件の本人セッションの許可/拒否ナビゲーションと
191種の権限拒否は検証したが、
書込み/状態変更/端末操作を持つ28画面の実ボタン代表権限テストは13/28。
未検証15画面、および検証済み13画面の全アクション網羅は未完了。

実機のAPNs/FCM配信、Bluetooth/USBプリンタ実印字、カード/QR外部入金、
OS位置情報、実ドロワー現金、外部メール、実クラウド復旧は
ローカルPASSに含めない。正式実機QAはNOT_RUN / PASS 0。
コミット・プッシュ・Worker/Web/DB本番反映も行っていない。

**注意：再全件の正式なランナー結果は209ファイル中208 PASS、
1 FAIL（exit 1）の履歴として保持する。**
残1ファイルの改修後137/137 PASSを根拠に再全件209/209 PASSと
書き換えることは禁止。現行ソースの全209ファイルを再度
一括実行した証拠はまだない。
