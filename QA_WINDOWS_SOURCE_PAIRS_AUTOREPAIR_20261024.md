# Windows Source-pairs 実作業連携とAndroid公式QAソース進捗（2026-10-24 PHT）

## Windowsタスクを実行した結果

登録済み `\ChatOnSteroids-QA-Source-pairs` は `C:\WINDOWS\System32\wscript.exe //B //Nologo …\scripts\qa-autonomy\hidden-task-launcher.vbs source-pairs` を実行する。**タスクの登録Action自体は変更していない**。`hidden-task-launcher.vbs`の`source-pairs`分岐だけを新しい `start-source-pairs-repair.ps1` に接続。これが共通ソース自動修復を試行し、続いて従来の `start-source-lane.ps1 -Lane pairs` を実行する。後段の送達経路、他lane、タスクの実行間隔は変更しない。

実際に `schtasks /Run /TN "\ChatOnSteroids-QA-Source-pairs"` を呼び、**成功応答を確認**。Task Schedulerの実行時刻は **2026-10-24 19:51:12 PHT**、Run完了後の状態は`Ready`。最終`Last Result=2`は後段COS送達の `source-lane-pairs-state.json` が `COS_CONTROL_UNAVAILABLE` / `COS_DELIVERY_STALLED`（`2026-10-24T11:51:16.319Z`）と報告したことに対応。Windowsタスク全体が成功したとは扱わない。一方、ローカル修復の正式台帳独立集計ジャーナルは `progressVerified=true` / `unresolved=false`を記録しており、**ローカル修復は実際に成功**した。

## 実行前後の SOURCE 9工程（Android pending 441件）

`qa-source-pair-automatic-repair.mjs`が既存公式831 Manifest・Android/iOS状態をread-onlyで読み、`reportSourceCoverage` / `readAutomationBacklog`を修正前・各グループ修正後・全修正後に呼んで計測。生成時の推測件数を使わない。

| 15工程のAndroid SOURCE部分 | Task前 | Task後 | 正式台帳に基づく正味増分 |
| --- | ---: | ---: | ---: |
| ① registered | 258 | 262 | **+4** |
| ② fixture | 258 | 262 | **+4** |
| ③ driver | 56 | 59 | **+3** |
| ④ D1 selector | 46 | 49 | **+3** |
| ⑤ PNG証拠先 | 81 | 84 | **+3** |
| ⑥ Manifest期待条件 | 86 | 89 | **+3** |
| ⑦ assertion Oracle | 86 | 89 | **+3** |
| ⑧ cleanup | 79 | 82 | **+3** |
| ⑨ source contract完全定義 | 30 | 33 | **+3** |

純増の公式対象IDは `QA2-SET-001/004/005/006`。`001`は既存17afペア（driver/fixture宣言のみ）、`004/005/006`は既存17daペア（Manifest・独立Oracle・D1 selectorなどが揃ったソース契約）に唯一の登録ownerを残した。旧17afペアから004〜006、旧5745ペアから001/004/005を除外。同じケースが複数旧ペアから除去されても新規達成は**固有ケース単位の4件**。旧モジュールは残し、関係する各旧publishスクリプトに共通`canonicalPairCases`除外を追加した。

`QA2-SET-003`は**公式PASS（4 attempts）**で、現在のsource pending計算の対象外。このケースには自動移管を適用せず、generic directの元SHAを保持した。旧013〜016など既存登録に変更はない。Android/iOS正式状態と831 Manifest・正式PASS証拠は編集していない。実機・ADB・Remote D1・Runner claim/verify・ビルド・デプロイ・Git commit/pushは一切実行していない。

## 共通修復の安全条件・再発防止

共通実装 `qa-source-pair-automatic-repair.mjs` の対象は、レビュー済みの限定旧グループ8種と `qa-source-pair-ownership.mjs`に明記された正式ケースだけ。独立ManifestとAndroid状態が安全な未完了ステータスで、既存canonical groupが唯一のownerであり、`teat`・claimScoped・idempotency・restore条件・実在driver/data・Manifest原文の期待値が整合するときだけ退役する。generic directが別ownerや実行済み状態の場合は停止し、COSへ未確定事項を残す。

ファイル単位のSHA-256照合付き置換を行い、各グループの修正直後に公式バックログでSOURCE数を再計測。**+1以上の実数増がない、あるいは工程の減少がある場合は旧バイトへ戻し、そのグループを失敗扱い**。グループ失敗後も次へ進み、個別のdirect破損も対象ケースだけBLOCK。排他実機や正式Runnerは呼ばない。`--check`は完全read-only、`--once`のみ安全な修正を実施。`start-source-pairs-repair.ps1`は修復失敗時にも後段の既存COSレーンを起動し、COS送達失敗を隠蔽しない。

毎回の実行結果は `scripts/qa-autonomy/runtime/source-pair-automatic-repair-last.json` へ原子的に記録し、`progressVerified` はその回に独立した純増があった場合だけ `true`。後続の定期実行で増分0になっても、最後に記録した真正の純増記録を `lastVerifiedProgress` に保持する改修も追加した。これは**改修前に消えた旧ログの復元を主張しない**（今回の実証はTask Scheduler照会と本セッションの独立readbackが根拠）。

## 10観点のソースレビュー

| # | 独立観点 | 実施内容・証拠 |
| --- | --- | --- |
| S01 | 公式831件のscope | 正本Manifest、両OS state読込のみ、pending 441維持 |
| S02 | 重複owner | `--duplicates`実測からSET001/004/005/006を選出 |
| S03 | canonicalの資産真正性 | 17af/17da既存driver、data、実店舗IDとcase所有権検査 |
| S04 | ケース期待条件 | 17daの004〜006のManifest legacyAssertions / checkpoints一致 |
| S05 | 旧generator再発防止 | 17af/5745 publishが共通canonicalFilterを使用 |
| S06 | false ready防止 | cleanup/fixtureVerified/executableを勝手にtrueにしない |
| S07 | 公式PASS保全 | SET003正式PASSをauto除外、direct SHA変更防止テスト |
| S08 | バイト保全 | 旧ペアのSHA比較付きatomic replace、純増なし時rollback |
| S09 | 実数増分の独立照合 | SOURCE 9工程のbefore/afterをrepair journalで検証 |
| S10 | Windows実行接続 | `schtasks /Run`成功、TaskResult2はCOS配送失敗と識別 |

## 10観点の横展開レビュー

| # | 周辺対象 | 確認結果／残件 |
| --- | --- | --- |
| X01 | SET001 | 旧5745の重複のみ除去、17af driver/fixture保持 |
| X02 | SET002 | 重複対象外、5745にそのまま保持 |
| X03 | SET003正式PASS | owner変更・元direct SHA・official PASS証拠に触れない |
| X04 | SET004〜006 | 既存17daの独立oracle、snapshot復元契約を再利用 |
| X05 | SET016〜020 | 先行5件の一意正本を保全、ダッシュボード上+5を二重計上せず |
| X06 | SET021〜027 | 先行7件の正本を維持、後から準備契約を創作せず |
| X07 | input系既存5件 | 共通canonical ownersがそのまま維持 |
| X08 | Primeのdispatcher/routing | 当該ソースを編集せず、既存レーンに直列で復帰 |
| X09 | Windows他レーン | VBSの`source-pairs`分岐だけ変更、driver/data/evidence/ios分岐保持 |
| X10 | 本番・QA実機・署名DB | 対象範囲外、正式PASS追加0、実機証拠未実施 |

## テストとソースSHA-256

修復ユニット・公式backlog・所有者回帰は **31/31 PASS, exit0**（追加後の結果）。既存17af/5745/17da/SET004〜006業務アサーション群は **18/18 PASS, exit0**。`git diff --check` exit0、PowerShell wrapper構文検証`PS_PARSE_OK`。公式state変更・PASS更新はゼロ。再現には `node scripts/qa-autonomy/qa-source-pair-automatic-repair.mjs --check`（read-only）、本番同等の既存タスク実行には `schtasks /Run /TN "\ChatOnSteroids-QA-Source-pairs"` を使用した。

| 現在のソース・証拠メタデータ | SHA-256 |
| --- | --- |
| `coverage-17afdd9a11ca4ca8312ce7.pair.json` | `A537167853E59E91FB9228031C06728A3F1C0655DADAF07334383151C833A938` |
| `coverage-5745ab8093847c60cb5dcb.pair.json` | `BFD547CF769F4CF8E530192B95ED2D60CA5DDE9587D29A47537DE29E46CDC3CF` |
| `coverage-17da0e59a906514a955641.pair.json` | `7D34FD47DFAEEF8EEC1E8D1ED1C3613D7FFF13FB0FDCB915E93A59C45B8B072B` |
| `QA2-SET-003.direct.json`（元正式PASS証拠保全） | `152F5CA9E4513717CC97DC124608040F0D451237FB18F286EEB8942959F10FCD` |
| `.qa-v2-official/android/state.json`（read-only） | `330D6F059483AB4F5AE2381341839B4FC51FA90955DCA3E0BC6B9F6A5E90945E` |
| `.qa-v2-official/ios/state.json`（read-only） | `CD9F913B748A5CFC734C3CCBEF4FA482689EADB6047FC829F5AB7A17DC5D3BFC` |

**未完了：** COSのChrome入力送達 `COS_DELIVERY_STALLED`、他ケースの重複owner、Source stages1–9残件、Android/iOS工程10–15の実物証拠。今回SOURCEの増分は公式QAのPASS数ではなく、正式追加PASS **0件**。
