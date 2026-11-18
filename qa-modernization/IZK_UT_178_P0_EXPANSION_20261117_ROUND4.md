# IZK-UT-178 第4弾 — データ管理ジョブの完了後再送防止 (BW-EXT-074)

2026-11-17 / 既存S5-053シナリオとS4/S5の証拠管理を再利用。新規テスト基盤、DBマイグレーション、専用Workerは追加していない。

## 実成果

| 指標 | 第3弾 | 第4弾 | 増減 |
| --- | ---: | ---: | ---: |
| 要求総数 | 206 | 206 | 0 |
| 実行ケース紐付け | 111 | 112 | +1 |
| 未紐付け | 95 | 94 | -1 |
| P0未紐付け | 31 | 30 | -1 |
| 正式実機QA PASS増分 | 0 | 0 | 0 |

### 真因・変更

従来のqueueDataAdminJobは同じ操作と対象の「実行中ジョブ」だけを重複除去していた。
処理が完了してからネットワークACK不達などで同じ復元要求が再送されると、新しい復元ジョブや復元前バックアップを作り得た。
また、元の削除/復元APIはクライアント生成のリクエストIDを受け取っていなかった。

既存CSVのjob_id方式を再利用し、システム管理者が再認証したうえで送ったUUIDを
そのままデータ管理ジョブの永続的なリクエストIDとして利用する。
同じ店舗、担当者、操作、対象で同じIDの再送は、pending/running/completed/failedの
どの状態でも元のジョブIDと状態を返す（alreadyQueued=true）。
同一IDの他操作・他担当者での流用は409で拒否する。
異なるIDで同時に新しいジョブを申し込むと既存の店舗単位activeジョブロックで拒否する。
DB一意制約違反時のみ競合照合を実施し、通常のD1障害は元の障害として伝播する。
新しい意図で明示的に別IDを発行すれば、既存仕様どおり新規ジョブを開始できる。

UIもNative、docs/yuwaku PROD、docs/yuwaku/testの3系統で同じUUID送信方式に統一。
旧クライアントの3引数APIは互換維持するが、完了後の冪等性は新方式のIDを送るクライアントに限定される。

### 実行証拠

- S5-DATA-JOB-LIFECYCLE-053：**1/1 PASS**（実Chromium→本物のGateway→独立SQLite、証拠adapterでPASS、最新ソースhash一致）
  - 画面から実復元ジョブ登録、同じIDの同時2要求を送って単一pendingを確認
  - 異なる操作、別のSystem社員、別ID、無効UUID、空IDを拒否
  - 実サーバージョブの復元完了後に同一IDで再送して、completedを返し、ジョブ/バックアップ/業務行に再変更がないことをSQLで証明
  - 旧セッション認証失効、別店舗不変、実ブラウザ再ログイン、復元監査・時刻など従来053の全検証も維持
  - 最終証拠：test-results/qa-modernization/s5-data-jobs/S5-DATA-JOB-LIFECYCLE-053-2026-11-17T09-54-43-112Z-p27028/result.json
- 関連P0オラクル・3系統画面の同等性・DB障害故障注入：**4/4 PASS**
  - ローカルD1相当のINSERT失敗は409の重複扱いに誤変換せず、元のDBエラーが伝播。偽pendingはゼロ
- 既存業務/WEB要求の独立証拠契約：**16/16 PASS**（4ケース追加前の同回帰）、FAIL 0
- 構文検査、diff whitespace検査：PASS（行末改行警告はあり）
- 実機・本番・Cloudflare remote：未実施。正式QA PASS増分0。

### 作業対象

- src/dataAdmin.js（リクエストID検証・同一キーの全状態再送・競合処理）
- src/gasApi.js（4番目の引数と重複時バックグラウンド実行抑止）
- mobile-app/web/data_admin.html、docs/yuwaku/data_admin.html、docs/yuwaku/test/data_admin.html（同等UI送信）
- scripts/qa-modernization/s5-data-job-lifecycle-browser.test.mjs（既存053の拡張）
- scripts/qa-modernization/s5s6-evidence.mjs（独立オラクル）
- scripts/qa-modernization/business-web-scenario-requirements.mjs（BW-EXT-074→053）
- test/auto-ci/izk-ut-178-new-p0-oracles.test.mjs（成功/偽証拠/障害注入/横展開テスト）

## OPEN継続

206要求中94件は実行ケース未紐付け、うちP0が30件。
本番Worker再起動を実際に伴う BW-EXT-019、削除・復元・CSVの全3操作を同時に
複数タブ監視するBW-CROSS-04、権限別の操作拒否＋監査を証明するBW-EXT-031等は未完了。
ローカルソース編集と自動テスト実施まで。コミット/プッシュ、本番Worker/DB反映、
実機QA/ユーザー確認は実施していない。別チャットの未コミット変更は維持した。
