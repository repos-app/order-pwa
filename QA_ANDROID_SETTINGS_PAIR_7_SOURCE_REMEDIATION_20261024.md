# Android SET-021〜027 共通ソース正本化（2026-10-24 PHT）

対象は公式Android未完了 `QA2-SET-021/022/023/024/025/026/027` の7件。既存のclaim付き実行コードを作り直さず、競合していた `coverage-*.pair.json` の旧エントリだけを正本から外した。ソース・旧パッケージ・既存単体テストは保持。**本記録はSOURCEのみであり、実機操作、D1読み書き、正式Runner claim、公式PASS・FAILの新規確定はいずれも0件**。

## 正式台帳と同一集計による前後比較

`node scripts/qa-autonomy/qa-source-coverage-selection.mjs --duplicates` が `.qa-v2-official/manifest.json` と両OSの既存台帳から未完了対象を取得し、`readAutomationBacklog` に同一ペア定義を読ませた結果。実機証拠やソースSHAの配布確認を意味しない。

| Android 15工程のSOURCE部分 | 修正前 | 修正後 | 正味増分 |
| --- | ---: | ---: | ---: |
| ① ペア定義登録 | 246/441 | 253/441 | +7 |
| ② fixture宣言 | 246/441 | 253/441 | +7 |
| ③ driver宣言 | 47/441 | 51/441 | +4 |
| ④ 独立D1 selector宣言 | 37/441 | 41/441 | +4 |
| ⑤ claim専用PNGパス宣言 | 72/441 | 76/441 | +4 |
| ⑥ 正本期待条件宣言 | 77/441 | 81/441 | +4 |
| ⑦ 独立Oracle参照宣言 | 77/441 | 81/441 | +4 |
| ⑧ cleanup参照宣言 | 70/441 | 74/441 | +4 |
| ⑨ ソース契約の全参照 | 21/441 | 25/441 | +4 |

Android未完了分母441、iOS/Android公式statusは作業中に変更していない。SET-021〜024の4件だけが既存ペアにManifest一致の期待条件、D1 selector、Oracle/cleanup等を備えるため③〜⑨も各+4。SET-025〜027の3件は既存ペアにfixture/driver宣言があるものの、未宣言のOracle/PNG/D1を新設していない。

| 対象ケース | 採用した既存ペア正本 | 旧重複側 |
| --- | --- | --- |
| SET-021 | `coverage-8644b615fca409539e8746` | `coverage-6a03e81fa6e3dc3c9cf5b3` |
| SET-022/023/024 | `coverage-8644b615fca409539e8746` | `coverage-2e649d0ae647a8d48130ac`、`coverage-6a03e81fa6e3dc3c9cf5b3` |
| SET-025 | `coverage-c88e1f106b08dc74607f77` | `coverage-2e649d0ae647a8d48130ac`、`coverage-6a03e81fa6e3dc3c9cf5b3` |
| SET-026 | `coverage-c88e1f106b08dc74607f77` | `coverage-2e649d0ae647a8d48130ac`、`coverage-515a21f9956e3adeb603ba` |
| SET-027 | `coverage-c88e1f106b08dc74607f77` | `coverage-515a21f9956e3adeb603ba` |

共通`qa-source-pair-ownership.mjs`に既存オーナーを明示し、3つの旧生成スクリプトは対象ケースの再登録を除外する。生成元パッケージ・モジュール・旧fixtureを消さず、3つの旧ペアに空の`cases`を保存した。`QA2-SET-022/023/024.direct.json`は既存8644ペア/fixture/driverに参照を合わせた。**`executable:false`、`fixtureVerified:false` は維持**し、独立の`qa-source-direct-owner-reconcile.mjs`が対象3件以外や状態違反を拒否する。後から同じ旧ソースを再生成しても登録重複を復活させない。

既存8644/c88ソースの広域テストで、実行前の`lease.exclusive`/`lease.serial`確認不足を検出した。8644のsnapshot gateとc88の読み取りlocator（事前・呼び出し時）でclaimの端末IDに一致する排他リースを必須にした。初回広域回帰では77件中6件FAIL、修正後に対象モジュール・既存旧群・集計・新しい参照整合テストを含む**78件PASS、0件FAIL（exit code 0）**。実際の端末操作はこの実行に含まれない。

### 10観点の独立ソースレビュー

| 番号 | 観点と確認方法 | 実結果 |
| --- | --- | --- |
| S01 | 正本2 OSのpendingを既存`qa-source-coverage-selection`で再取得 | Android 441を確認 |
| S02 | 同コマンドの`duplicates`を修正前後で差分確認 | SET-021〜027の競合が各0件に |
| S03 | 8644ペアの対象4件をManifestのexpected/legacyと独立JSON比較 | 4件一致 |
| S04 | c88ペアの対象3件の実driver/dataファイル存在とclaimScope確認 | 3件存在、`teat`限定 |
| S05 | 3つの旧ペアをJSONで確認 | 旧エントリ0件 |
| S06 | 旧生成スクリプトをソース逆引き | 3箇所とも共通filterを使用 |
| S07 | 8644の独立source contract checker呼び出し | 4件missing=[] |
| S08 | generic directを再読み込みし実pair byte SHAと照合 | SET022〜024で一致、executable=false |
| S09 | claim leaseの偽陰性を再現する既存オフラインテスト | 初回6 FAILから関連実装修正後0 FAILへ |
| S10 | `git diff --check`と限定Node suite終了コードを検証 | 回帰78 PASS、exit 0、diff check exit 0 |

### 10観点の横展開確認

| 番号 | 影響先と異なる切り口 | 確認結果 |
| --- | --- | --- |
| X01 | SET-020など同8644グループ内の非対象 | 既存ソースと公式status不変更、関連テストPASS |
| X02 | SET-025〜027の実UI locator / native画面遷移 | 既存locatorテストPASS、実機未実施 |
| X03 | 印字・会計業務への独立効果判定 | 実D1効果は未取得、追加PASSを主張しない |
| X04 | 2eの5件旧回帰パッケージ | 85 assertion相当のoffline報告維持、旧driverを削除せず |
| X05 | 6aの5件旧回帰パッケージ | 130 assertion相当のoffline報告維持、旧driverを削除せず |
| X06 | 515の2件旧回帰パッケージ | 34 assertion相当のoffline報告維持、旧driverを削除せず |
| X07 | 入力系既存5件の正本マッピング | 旧5件ownerが重複なしのまま維持 |
| X08 | SET025〜027の偽装claimと端末lease | locatorが事前に拒否するテストPASS |
| X09 | Android旧PASS/公式runner/端末証拠 | 公式ファイル変更なし、実機証拠を生成せず |
| X10 | iOSケースと共通Windows queue | 本担当で変更なし、iOS正式PASS追加0 |

再現コマンド：

```powershell
node scripts/qa-autonomy/qa-source-coverage-selection.mjs --duplicates
node scripts/qa-autonomy/qa-source-direct-owner-reconcile.mjs
node --test scripts/qa-autonomy/qa-source-pair-ownership.test.mjs scripts/qa-autonomy/qa-automation-backlog.test.mjs scripts/qa-autonomy/coverage-8644b615fca409539e8746.test.mjs scripts/qa-autonomy/coverage-c88e1f106b08dc74607f77.test.mjs scripts/qa-autonomy/coverage-c88e1f106b08dc74607f77-gestures.test.mjs scripts/qa-autonomy/coverage-c88e1f106b08dc74607f77-locator.test.mjs scripts/qa-autonomy/coverage-2e649d0ae647a8d48130ac.test.mjs scripts/qa-autonomy/coverage-515a21f9956e3adeb603ba.test.mjs scripts/qa-autonomy/coverage-6a03e81fa6e3dc3c9cf5b3.test.mjs
git diff --check
```

未対応：その他の重複pairとSOURCE gaps、SET025〜027のOracle/DB/PNG/expected/cleanup参照、実アプリ・独立署名D1・PNG・claim/正式Runnerの実測。その他6工程の公式E2E証拠も未完成。公式QA PASS件数は今回増加なし。既存source SHA差分は実行証拠ではなく診断情報として保持し、固定ハッシュが現在配布の証拠であるとは報告しない。
