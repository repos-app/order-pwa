# izakanpai ワークスペース整理台帳

更新日: 2026-11-07（Windows / Chat On Steroids で実ディレクトリ確認）

## 目的と完了条件

稼働しているアプリ、Worker、D1マイグレーション、ビルド・配布手順、CI、QA自動化、正式QA証拠を壊さず、ファイルを用途別に見つけやすく整理する。移動時は参照元の検証、内容の同一性、既存のテスト確認を行う。**整理作業は正式QAのPASS件数として計上しない。**

## 現状スナップショット（整理着手前）

- ルート直下: 38フォルダ・34ファイル（確認中に別作業が `tool/` を作成し、39フォルダとなった）。
- Git管理対象: 5,781ファイル。
- `test/` 2,330ファイル、`scripts/` 2,305ファイル、`docs/` 531ファイル（いずれもGit管理対象）。
- `test-results/`: 9,774ファイル、約1,242.5 MB。
- `.gradle-user-home/`: 34,286ファイル、約1,209.2 MB。
- `node_modules/`: 4,881ファイル、約289.3 MB。
- `.android-qa-emulator/`: 794ファイル、約208.2 MB。
- `scripts/qa-autonomy/runtime/`: 約6,978ファイル、約77.7 MB。
- これらはサイズ測定結果であり、不要ファイルの判定結果ではない。

## 整理の実施記録

### 2026-11-07 / 第1段階: ルート画像の用途別移動

- 移動前: `_capcut_background_20261025.png`、`_capcut_background_big.png`、`_capcut_screen_20261025.png`。
- 移動後: `store-assets/capcut/` 内の同名ファイル。
- Git管理テキストとGit外の通常ソース・設定から旧ファイル名への参照を検索し、該当なしを確認して移動。
- 移動前後の個別SHA-256照合は3/3件一致。内容変更なし。
- 旧ルート画像は物理的に移動済み。Gitにコミット・プッシュはしていない。
- 既存の `scripts/developer-console/` → `tool/developer-console/` の移設作業は他の変更と並行しているため、今回の整理操作では触れていない。

### 2026-11-07 / 第2段階: ナビゲーション

- ルートの `README.md` を追加し、プロジェクト各領域への入口と保全ルールを明示。
- 本台帳を今後の整理作業の正本とし、別チャットでも確認できるようにする。

### 2026-11-07 / 生成キャッシュの限定削除

- `scripts/__pycache__/` の内容を事前調査し、Git未管理のPythonバイトコード `*.pyc` 3ファイルのみ（合計53,746バイト）と確認。
- 実体の絶対パスと拡張子、ファイル数を検査したうえで3ファイルと空ディレクトリを削除した。
- ソースの `*.py` は削除していない。QA稼働状態・ログ・正式証拠には手を付けていない。

### 2026-11-07 / 第3段階: 読み取り中心の検証

- `store-assets/capcut/` の3画像について、移動後のGit blobハッシュと元の `HEAD` のblobを比較し **3/3一致**。
- `README.md` 内の相対リンク **21/21存在確認**。
- 旧ルート画像パス **3/3不存在**。元画像の直接参照を検索した範囲では参照なし。
- `git diff --check` **終了コード0**。
- `node --test test/distribution_parity_test.mjs` **FAIL（終了コード1、正式QAではない）**。Source→mobile-distに13件の不一致、Source→iOS/Androidに各18件の不一致と各2件の欠落が検出された。iOS↔Androidの113件とWeb本番↔TESTの92件は一致。対象はアプリ配布資産の同期差分であり、今回の移動画像や文書ファイルは比較対象ではない。今回の整理ではビルド・配布物再生成を行っていないため、別作業の同期課題として保留。
- 正式QA runner・正式台帳更新・モバイルビルド・Workerデプロイ・commit/pushはいずれも未実施。

### 2026-11-07 / 第4段階: scriptsの参照ベース分類を開始

- `scripts/` ルート直下のGit管理対象は1,033件。ファイル名接頭辞別に `qa-v2-` 760件、`android-qa-` 174件（接頭辞の件数であり旧方式の確定件数ではない）。
- `package.json` → `scripts/run-project-test-pipeline.mjs`、`QA_START_HERE.md` → `scripts/qa-v2-official-runner.mjs`、Windowsドライバ → `scripts/android-qa-autopilot.mjs`、QA共通Saga → `scripts/qa-v2-official-runner.mjs` といった**ルートパスを前提とする実参照を確認**。
- `docs/qa-modernization/` に既存のS1棚卸し結果があることを確認。同じQA棚卸しを最初からやり直さず、これを再利用する。
- `scripts/README.md` を作成し、現役入口、QA共通、旧系の可能性のある候補、保護すべきQA稼働状態を索引化。
- 今回の分類段階では実行スクリプト本体の移動・削除はしていない。参照されるものを無理に移すと、CI/正式QA/Windowsタスクを破損させるため。

### 2026-11-07 / 第5段階: QA専用スクリプトの参照監査・履歴移設

- 既存の `node scripts/qa-autonomy/qa-source-reference-inventory.mjs --summary` を実行（終了コード0）。約11,900ファイルを走査し、対象の専用QAスクリプト669件のうち文字列参照あり669件、文字列参照なし0件。これは**このスキャナーが対象にする特定命名規則のファイルだけの結果**であり、全スクリプトが現役である証明ではない。参照先の無条件な削除はしない。
- `scripts/qa-v2-realme-0344-build-readiness.md` は同パスへの外部文字列参照がなく、過去のビルド準備報告書であると確認したため、`docs/qa-history/qa-v2-realme-0344-build-readiness.md` へ移動した。SHA-256 **CD98DC1060F6C0014A687E77D06FD57D1A5C17377AD49ACA239EF3090BFBA730**、移動前後一致。
- 0344のread-onlyゲート用スクリプトとテストは移動せず、`node --test scripts/qa-v2-realme-0344-build-readiness.test.mjs` は移動前後 **3/3 PASS**（2回とも終了コード0）。QA実機PASSではない。
- `docs/qa-history/README.md` と `test/README.md` を作成し、履歴、単体・業務・実機・QA計画の置き場所を分類した。元の起動パスと正式台帳は変更していない。
- 参考: 参照監査専用の `scripts/qa-autonomy/qa-source-reference-inventory.test.mjs` は存在せず、そのコマンドは **未実行扱い（指定ファイル不存在、終了コード1）**。同名のテストがPASSしたとは報告しない。
- 移動後の元HEAD Git blob（`scripts/qa-v2-realme-0344-build-readiness.md`）と移動先のGit blobは **一致**。旧場所の文書は不存在で、関連 `.mjs` と `.test.mjs` は元の場所に残存。
- `README.md`、`scripts/README.md`、`test/README.md`、`docs/qa-history/README.md` の相対リンク **49/49存在**。
- `node test/store_assets_test.mjs` **11/11 PASS（終了コード0）**、`node --test scripts/qa-v2-realme-0344-build-readiness.test.mjs` **3/3 PASS（終了コード0）**、`git diff --check` **終了コード0**。これらはソース・資産検証であって正式実機QA判定ではない。

## 保全・隔離するもの

| 場所 | 判断 | 理由 |
| --- | --- | --- |
| `test-results/` | 保全 | 正式QA証拠、スクリーンショット、APK・実行ログが含まれる |
| `.qa-v2-official/` | 保全 | 正式台帳、判定状態を保持する可能性 |
| `scripts/qa-autonomy/runtime/` | 保全 | QAの稼働状態、引継ぎ、監査の実体を含む |
| `handoff/` | 保全 | 引継ぎや長期証拠の保管場所 |
| `.android-*` | 保全 | 実機/エミュレータの状態・証拠が混在 |
| `.gradle-user-home/` | 今回削除しない | 再取得・再ビルドへの影響がある |
| `node_modules/` | 今回削除しない | 開発・テスト実行中の依存関係 |
| `mobile-dist/` | 今回削除しない | 各配布面の生成物、参照切れを未検証 |
| `docs/yuwaku/` と `mobile-app/web/` | 維持 | 同名画面が配布面ごとに必要な場合がある |

## 未着手・今後の順序

1. **scripts**: 現役実行入口、旧QA互換、共有ランナー、ローカル専用生成物の参照関係を洗い出す。実行入口が確認できないファイルもただちに削除しない。
2. **test**: テストケースの正本、旧方式の履歴、実行結果を分ける。公式台帳への直接編集はしない。
3. **docs**: 公開画面・TESTレプリカ・設計資料・過去の調査報告を区別する。ファイル名が似ているだけの削除はしない。
4. **生成物**: 開発やQAの停止状態と証拠保全条件を確認してから、不要な一時ファイルを個別に選定する。削除前に実体と参照を記録する。
5. **最終検証**: 関連テスト、参照解決、Git差分、変更前後のパスとSHA、正式QA台帳が不変であることを照合する。

## 変更履歴の扱い

日付・対象・移動/削除前後のパス・検証コマンド・結果・保留理由を本ファイルに追記する。形式的な整理完了、オフラインPASS、正式QAのPASSを混同しない。

## 2026-11-07 / 第6段階: 公開docsの安全な分類・内部索引

- `docs/CNAME` が `izakanpai.com` を指すことと、`docs/index.html` があることを確認。外部リンク先となっている可能性があるため、`docs/` 直下の過去資料は、Git内の参照が0件でも一括移動しない方針。
- `scripts/maintenance/docs-index.mjs` を追加し、公開ファイルを変更せず内部索引を生成する仕組みを実装。
- `research/WORKSPACE_DOCUMENT_INDEX.md` に、`docs/` 直下Markdown **301件**を用途別に分類してリンク掲載。バイト単位の完全一致資料は **0グループ**。分類はタイトルに基づく検索補助であって未使用判定ではない。
- 索引の出力先は当初の `docs/DOCUMENT_INDEX.md` から公開サイト外の `research/` に変更し、旧生成ファイルは削除・Gitステージ解除済み。公開docs上に追加の内部索引は残していない。
- 参照した複数の2026年10月11日のAndroid QA報告書について、Git内で文字列参照がないものもあるが、外部URLの利用状況は不明のため原本は現位置で保全した。
- `test/docs_index_test.mjs` の機能テスト **2/2 PASS**、生成後の `node scripts/maintenance/docs-index.mjs --check` **PASS**（双方終了コード0）。
- 関連情報は `research/README.md` および `scripts/maintenance/README.md` に集約する。
- 追加でGit管理中の `scripts/` ファイルのうち存在する **2,304件**（1 MiB以下）をSHA-256で照合。完全一致は **1グループ / 4ファイル** のみ。対象 `qa-v2-realme-f134e9c8-qa2-soak-001～004.mjs` は同じ共通Driverをexportするケース別エントリポイントであり、同一内容だけを根拠に削除・統合しない。消してよいと証明された実行コードは0件。
- `README.md` を含む開発案内5ファイルの相対リンクを存在確認し、生成索引から原本資料へのリンクも全件存在確認。公開用 `docs/DOCUMENT_INDEX.md` は存在しない。
- `node test/store_assets_test.mjs` **11/11 PASS**、`git diff --check` **終了コード0**。ソースの正式実機QA・Worker配備は未実施。今回のdocs分類に伴う現役実装の移動・削除件数は0件。

## 2026-11-07 / 第7段階: test/plansの履歴資料整理

- 対象 `test/plans/` はGit管理対象1,197ファイル。内訳の主な区分は `qa-v2-realme-user-authorized/` 818件、`qa-v2-realme-unattended-approved/` 101件、`qa-approved-oracles/` 78件、直下134件。正式ケース計画・Oracle・台帳・ローカル証拠は保全。
- 直下Markdown76件のうち、過去の監査記録を候補として参照検索。現行マスターやドライバーから参照される文書は移動しない。
- Git管理下のテキストにファイル名参照がないことを確認した過去文書3件を `test/plans/history/` へ移動。旧パスからの移設内容は以下のとおり。
  - `QA_V2_PRE_POLICY_SCREEN_RESULT_AUDIT_20261013.md`：過去の1080px画面幅監査、現在は720px以上の基準。SHA-256 `3A48B1C0BFE08F71EB3A5982EDB3EDC7E99494E54A8BB2197FC0F050F34F6AD5`
  - `QA_V2_LEGACY_FIVE_PROVENANCE_REINSPECTION_20261012.md`：旧PASS証拠の重点5件監査。SHA-256 `6B3E835E6D49450F67EB511229B9001BAB1998CA53057878F41CFBE2A9DD320D`
  - `QA_V2_LEGACY_AUDIT_NEXT_ACTIONS_20261012.md`：旧PASS207件の再検証検討。SHA-256 `426944493ED6AB889CFA584F84348EB5319171748CB2D1A157F82503EE0AA1A2`
- 3件とも移動前後のSHA-256照合がPASSし、原文を変更していない。`test/plans/history/README.md` を追加し、各記録を再発見できるようにした。
- `test/plans/README.md` の冒頭に、古い2,080件・停止条件と現行QA手順の混同を防ぐ案内を追加。実行コード、公式QA台帳、818件のRealme計画、78件のOracle、業務テストデータは未変更。
- 継続確認でGit管理対象1,197パスを棚卸し。旧パスから移動した3件を除く1,194ファイルを実体照合し、SHA-256の完全一致は**14組・28ファイル**。内訳は承認スナップショット7組、ケース別Fixture3組、Oracleと候補定義3組、Oracleとレビュー記録1組。**役割が違うものを重複の理由だけで削除しない**ため、削除件数0。
- 移動した3ファイルの `HEAD:test/plans/<旧ファイル名>` と移動先のGit blobは**3/3一致**。旧パスの不存在を確認。
- `test/plans/history/README.md`、`test/plans/README.md`、`test/README.md` のMarkdownリンク**25/25有効**。
- `node test/android_real_device_test_plan_coverage_test.mjs` は**1,095/1,095 PASS**（終了コード0）、`node --test test/qa_v2_unified_handoff_test.mjs` は**4/4 PASS**（終了コード0）、`git diff --check` も終了コード0。これらはソース・計画の回帰検証であり、正式実機QAのPASS増分ではない。
- 残件：ケース別パス・承認スナップショットの参照契約を解析してから、次の資料・非実行ファイル候補を個別判断。今回の正式PASS/FAIL増分0、commit/push/deploy/モバイルビルド未実施。
- 終了時の並行作業確認: 2026-11-07 21:10 +08に別作業のコミット `2b4b967` を検出。Gitの `HEAD` とローカル追跡参照 `origin/main` は同一SHAであり、移動3件は同コミット内で `R100` と記録された。**この整理作業からcommit/pushは実行していない**。本節で最後に追加した検証5行はワークツリー差分として残り、他作業の `qa-dashboard/index.html`、`scripts/qa-modernization/test-catalog.mjs` の差分も保護している。

## 2026-11-08 / 第8段階: 過去QA資料の追加一括整理

- 既存の `test/plans/history/` を再利用し、直下の旧QA監査・移行・ドライバー準備文書から**7件**を追加移動（移動容量27,080バイト）。削除やソースの変更はなし。
- 移動対象：`QA_V2_LEGACY_207_EVIDENCE_AUDIT_RESULT_20261012.md`、`QA_V2_LEGACY_FOUR_GROUPS_FINAL_AUDIT_20261012.md`、`QA_V2_LIVE_MIGRATION_STRATEGY_20261012.md`、`QA_V2_REALME_REMAINING_501_DRIVERS_20261014.md`、`QA_V2_REALME_SETTINGS_EXTRA_20261014.md`、`QA_V2_REMAINING_FIXTURE_20261014.md`、`ANDROID_REAL_DEVICE_OFFLINE_EVIDENCE.md`。
- 対象7件について、既存マスター・ソース・資料からのファイル名参照を `git grep` および `rg` で確認し、該当0件。各文書内にMarkdown相対リンクがないこと、Git HEADのblobから本文が変更されていないことを移動前に検証。
- 移動後のSHA-256とHEAD Git blobの一致 **7/7**、旧パス不存在 **7/7**。対象ファイルは以前からGit追跡下にあり未コミット変更がなかった。
- `test/plans/history/README.md` に7件を追記。現在のQA手順・831件正式台帳・端末・テナント・証拠は移動せず、実機操作も実施していない。
- 第1〜第8段階の累計物理移動は**14件**（画像3・過去QA報告1・`test/plans/history` の10件）、限定削除はキャッシュ`*.pyc` **3件**。これはファイル数削減率やQA進捗率ではない。
- **移動前と移動後の回帰:** `node test/android_real_device_test_plan_coverage_test.mjs` **1,095/1,095 PASS**、`node --test test/qa_v2_unified_handoff_test.mjs` **4/4 PASS**。加えて移動後の `node --test test/docs_index_test.mjs` **2/2 PASS**。すべて終了コード0。正式QAではない。
- **独立したパス再照合:** 移動した7件についてGit HEAD元blobと移動先blob **7/7一致**、旧パス不存在 **7/7**、`test/plans/history/README.md` を含む3文書のMarkdown相対リンク **32/32存在**。履歴フォルダ内はMarkdown合計11件（報告書10件＋README）。
- `git diff --check` も終了コード0。未コミット変更には別作業のQA/CI/UI改修が並行して存在するため、今回の整理からcommit/push/deploy/モバイルビルドを実行せず、その差分には触れない。正式QAの新規PASS/FAILは0件。

## 2026-11-08 / 第9段階: Git管理外handoffの限定整理

- 新たな調査対象 `handoff/` 直下に過去のGPT/Claude報告が大量に残存していた。**`.gitignore` に `handoff/*` があり、Git追跡対象は現行の `handoff/IZAKANPAI_SOURCE_FIX_MASTER_RUNBOOK.md` のみ**と確認。Git grepだけで安全と判断するのを中止。
- 75候補のGit参照監査の後、64件の非運用報告を対象に、**Gitignore対象も含めた** `rg --no-ignore` でMarkdown・JS・MJS・JSON・PS1等のソースを再監査。参照もMarkdownリンクもない候補は11件に縮小。現行のマスター、ルール、実機チェックリスト、参照のある報告書は保全。
- 移動前に `handoff/backups/workspace-organization-handoff-20261108.zip` を新規作成。11ファイルすべてについてZIP内エントリSHA-256と元ファイルのSHA-256を照合 **11/11一致**。ZIP 21,901バイト、SHA-256 `0C740A786B2D2811361C83A67E51ABC1B6CE9815FFD070D1AEC00FF11D728CF1`。
- 検証済み11件（37,506バイト）を `handoff/history/reports/` に移動し、移動後のSHA-256と旧パス不存在を確認。直下Markdownは**143件→133件**（11件移動後に新しい `handoff/README.md` 1件を追加）。
- 新しい `handoff/README.md`、`handoff/history/README.md` から現行マスター・過去報告・復元ZIPにアクセスできるようにした。`research/README.md` からも履歴索引へ誘導。
- Git非管理の手元資料はリポジトリ内のcommit/pushでは配布・復元できない点を明記。正式QA台帳、Worker、モバイル配布、アプリのコードは未変更。
- **整理累計**: 物理移動 **25件**（以前14件＋今回11件）、キャッシュ削除3件。Git管理外の過去報告書も含めて整理できたが、元の安全な復元ZIPは保全。
- 移動後にZIPの各エントリと移動先のSHA-256を改めて**11/11一致**と確認。ルートhandoff文書133件、アーカイブ報告11件、関連READMEの相対リンク**33/33存在**、整理対象のGit差分チェックPASS。
- 移動前後に `node --test test/qa_v2_unified_handoff_test.mjs` **4/4 PASS**、`node test/android_real_device_test_plan_coverage_test.mjs` **1,095/1,095 PASS**（すべて終了コード0）。現行マスターとApp Store進捗のパスを確認。正式QAの新規判定は0件。
- 復元ZIPはGitignore下にあり、このPCのローカルバックアップである。Git cloneやpushだけでバックアップが復元できるとは宣言しない。移動した11報告もGitignore下である。

## 2026-11-08 / 第10段階: 旧Android QAチェックポイント・過去作業報告の追加整理

- `handoff/` 直下の当時のAndroid 2,080件実機チェックポイント2件と2026年8月のGPT作業報告5件の計**7件**を移動。対象外の現行マスター、QA実行原本、デバイス証拠、セキュリティ監査・配備手順は移動しなかった。
- 移動前にGitignoreファイルも対象とした `rg --no-ignore` の参照検査を再実施。7件はいずれも他ファイル内のファイル名参照0件、Markdownリンク0件で、Git未追跡であることを確認した。
- 移動対象: `ANDROID_2080_PHYSICAL_CHECKPOINT_20261010_1422.md`、`ANDROID_2080_PHYSICAL_CHECKPOINT_20261010_1641.md`、`GPTソース修正_Claude共有_2026-08-28.md`、`GPTデプロイ後実機確認_2026-08-28.md`、`GPT在庫リンク追加修正_Claude共有_2026-08-28.md`、`GPT本番全画面全アクション走破テスト_2026-08-28.md`、`GPT残件改善対応_Claude共有_2026-08-28.md`。
- `handoff/backups/workspace-organization-handoff-batch2-20261108.zip` を作成。保存した**7/7件**のZIP展開データSHA-256を移動前に検証。その後 `handoff/history/reports/` へすべて移動し、移動先SHA-256一致**7/7**・元パス不存在**7/7**を確認。移動ファイル合計36,265バイト。
- 復元ZIPは18,469バイト、SHA-256 `EF1473CFE4097FBD12DF387C313B7AB6812A235D7DF95656CCE81F44069FD5FA`。ZIPも移動資料もGitignore対象で、このPCのローカル保存分である。
- `handoff/history/README.md` の資料索引を18件に拡充。移動後のhandoffルートMarkdownは**126件**。移動累計**32件**（前回25件＋今回7件）、キャッシュ削除3件。これは正式QA結果の増加でも大きな容量削減でもない。

## 2026-11-08 / 第11段階: 旧Android QA引継ぎ・ソースレビュー追加整理

- 旧Android QAの日時付き引継ぎ4件とソースレビュー2件（計**6件**）を、前段階と同じ `handoff/history/reports/` へ移動した。旧2,080件の状態を示す資料と2026年10月のソースレビューであり、現行QA runner、ケース定義、正式証拠、承認状態ではない。
- 移動対象は `ANDROID_QA_CHAT_HANDOFF_20261010_2030.md`、`ANDROID_QA_CONTINUOUS_20261010_2103.md`、`ANDROID_QA_EMULATOR_API36_CHECKPOINT_20261010.md`、`ANDROID_QA_EMULATOR_DEDICATED_20261010.md`、`QA_PRINT_026_030_DB_SOURCE_REVIEW_20261024.md`、`QA_UI_DRINK_INV_SOURCE_REVIEW_20261022.md`。
- Gitignore対象ファイルも含める `rg --no-ignore --hidden` で移動前の参照が0件、内部Markdownリンクが0件、現行Git追跡対象でないことを確認。操作手順に利用する `ANDROID_QA_AUTOPILOT_GUIDE.md`、QA Windows watchdog、iOSのsource契約、D1のpreprod証拠は移動していない。
- ZIP `handoff/backups/workspace-organization-handoff-batch3-20261108.zip` を作成し、ZIPの6件のエントリと移動前のSHA-256 **6/6一致**を検証してから、原文を変更せず移動した。移動先SHA-256 **6/6一致**、旧パス不存在 **6/6**。原文の合計33,821バイト、ZIP 17,338バイト、ZIP SHA-256 `3CBF44233CCDA190A29B24BBE5A7C267E5B3B9BB9625649D63B1A0870E0DB1DC`。
- `handoff/history/README.md` に6件を追加し、履歴報告は**24件**（11＋7＋6件）。handoffルートのMarkdownは**120件**になった。**累計移動38件、キャッシュ削除3件**。現行の正式QA台帳の新規判定0件、Gitignore対象のバックアップはローカルのみに存在。

## 2026-11-08 / 第12段階: Gitignore履歴の独立照合を自動化

- バックアップ3本のZIP内容を手作業で数えた際に「31件」と誤記したため、原本ZIPの実際の内訳**11＋7＋6＝24件**へ履歴README・台帳を修正。移動累計38件とhandoff履歴24件は別の集計値。
- `scripts/maintenance/Test-HandoffHistoryIntegrity.ps1` を追加し、`handoff/backups/workspace-organization-handoff*.zip` から全ファイルの内容ハッシュ、移動先の存在、元パスの不存在、重複の不在、索引記載、ZIPと配置件数の一致を**読み取り専用**で検査できるようにした。
- Windows PowerShell 5.1で実ワークスペースを検証し、**PASS**: ZIP3本、アーカイブ24ファイル、移動先24ファイル、元文書合計107,592バイト。3本のZIP SHA-256は前記の第9〜11段階の記録と一致。
- 別の一時テストフォルダに検証用のZIPと報告書を作成し、正常状態が**1/1 PASS**、報告書だけを意図的に改変すると `ARCHIVED_CONTENT_MISMATCH` で**1/1拒否**されることを実証。一時フォルダ削除も確認。正式実機QAには一切カウントしない。
- 実行コマンドは `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/maintenance/Test-HandoffHistoryIntegrity.ps1`。現行QAの起動、コードビルド、Worker配備、DB変更は行わない。
