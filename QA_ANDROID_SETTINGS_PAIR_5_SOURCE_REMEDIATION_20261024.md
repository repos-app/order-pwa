# Android SET-016〜020 source ownership remediation（2026-10-24 PHT）

対象：公式Android未完了 `QA2-SET-016/017/018/019/020`。`node scripts/qa-autonomy/qa-source-coverage-selection.mjs --duplicates` による831 Manifest／両OS正本のread-only測定から選定した。SET-021〜027の前回作業とは独立。対象実機操作、ADB、D1変更、正式Runner、正式判定変更は**0件**。

## 独立実測（Android pending分母441）

| Source stage | Before | After | Actual increase |
| --- | ---: | ---: | ---: |
| 1 registered | 253 | 258 | +5 |
| 2 fixture | 253 | 258 | +5 |
| 3 driver | 51 | 56 | +5 |
| 4 D1 selector | 41 | 46 | +5 |
| 5 PNG evidence path | 76 | 81 | +5 |
| 6 immutable expectations | 81 | 86 | +5 |
| 7 oracle source | 81 | 86 | +5 |
| 8 cleanup source | 74 | 79 | +5 |
| 9 complete source contract | 25 | 30 | +5 |

5件すべて既存に実ソースとManifestのexpected/legacy、signed selector、PNG保存先、Oracle/cleanupが定義されていた。今回の増分は重複pairを除去した再集計上の達成件数であり、PNG実ファイル・署名済みDB証拠・実機QAの達成件数ではない。

| Case | Remaining canonical source | Superseded duplicate |
| --- | --- | --- |
| `QA2-SET-016` | `coverage-64307c21fd26d99ae74cbf` | `coverage-0870713eaf2c2fb3e08ab7`, `coverage-5ec11add3e5a4ed7b62283` |
| `QA2-SET-017/018/019` | `coverage-64307c21fd26d99ae74cbf` | `coverage-5ec11add3e5a4ed7b62283` |
| `QA2-SET-020` | `coverage-8644b615fca409539e8746` | `coverage-5ec11add3e5a4ed7b62283` |

`qa-source-pair-ownership.mjs`の既存共通filterに5件追加。旧`build-coverage-5ec11add-pair.mjs`は除外結果0件の場合、旧driver/dataやgeneric directを上書きせず旧ペアの`cases:[]`だけを保持。旧`coverage-0870713eaf2c2fb3e08ab7-publish.mjs`は016を除外し、012〜015の既存豊富なsource metadata、driver、fixture、許可状態を保全した上で変更されたpair SHA参照のみ更新。旧ソースと回帰パッケージ自体は保持しており再利用可能。`QA2-SET-016〜019.direct.json`は既存643正本のまま、`QA2-SET-020.direct.json`のみ旧5ecから既存8644の正本driver/fixture/pair SHAに切替。`executable:false`、`fixtureVerified:false`は維持し、既存`qa-source-direct-owner-reconcile.mjs`に対象020だけを追加した。再実行read-onlyは`changed:false`。

旧013〜016の実装で、`lease`拒否条件が定数`false`だった2か所を修正して、物理アクション開始前の排他lease/端末serial一致を強制した。旧manifest backfillは既存Oracle/cleanupが実装済みのレシピを同一性検査後に保全し、新しく業務Oracleをでっち上げる動作を禁止。新ownerへの切替に合わせて既存013〜016のテスト期待値を更新し、SET016旧ドライバーの独立負例も保持。

## ソースレビュー10観点

| # | Inspection | Actual evidence |
| --- | --- | --- |
| S01 | 現時点の公式未完了から対象抽出 | `--duplicates`に対象5件 |
| S02 | 修正前9工程を読取 | 253/253/51/41/76/81/81/74/25 |
| S03 | 643の既存4ケースをManifestに直接比較 | existing focused contract checks PASS |
| S04 | 8644の既存SET020をManifestに直接比較 | existing focused contract checks PASS |
| S05 | 087旧ペアの残ケース | 012〜015 4件保持、016を除外 |
| S06 | 5ec旧ペア | 実ソース保持、pair entries 0件 |
| S07 | 2つの旧generator | `canonicalPairCases`の再登録拒否をテスト |
| S08 | direct参照の所有者整合 | 016〜019 643、020 8644、偽の実行済み状態なし |
| S09 | 旧driver/cleanupのlease負例 | 誤った排他lease拒否のテストPASS |
| S10 | 修正後独立9工程readback | 258/258/56/46/81/86/86/79/30 |

## 横展開レビュー10観点

| # | Related scope | Actual evidence / limitation |
| --- | --- | --- |
| X01 | SET012 | 087 pair既存実装とgeneric directを保持 |
| X02 | SET013〜015 | 旧実source/24 assertions維持、Node検証PASS |
| X03 | SET016 | 643正本1件、087/5ec旧登録0件 |
| X04 | SET017〜019 | 643正本と既存Oracle/cleanupを再利用 |
| X05 | SET020 | 8644既存source-only driver、claimが無ければ不可 |
| X06 | SET021〜024 | 前回の8644 owner維持、同族Node回帰PASS |
| X07 | SET025〜027 | 前回のc88 owner維持、今回編集なし |
| X08 | 異店舗/排他device lease | 旧013〜016実装は改修済み、負例をNodeで検証 |
| X09 | 実行レーン / 正式831 manifest | source-lane, routing, Runner, Android/iOS公式stateは変更なし |
| X10 | release/DB/real device | ADB/D1/commit/push/deploy未実施、実証未完 |

Focused regression：`node --test`で`qa-source-pair-ownership.test.mjs`、`qa-automation-backlog.test.mjs`、`coverage-64307c21fd26d99ae74cbf.test.mjs`、`coverage-8644b615fca409539e8746.test.mjs`、`qa2-set013-016-direct-binding.test.mjs`、`qa2-set-013-016-official-contract.test.mjs`、`settings-manifest-static-contract.test.mjs`、`official-paired-runtime.test.mjs`を実行。**128 tests PASS / 0 FAIL / exit0**。`git diff --check` exit0。

現ソースのSHA-256（ソース区別・再現用。配布artifact SHAではない）：

| File | SHA-256 |
| --- | --- |
| `coverage-0870713eaf2c2fb3e08ab7.pair.json` | `253EDD6FE6AD2A6FD6ED9516CF89F019919608156851909CA57A20560236A4AD` |
| `coverage-5ec11add3e5a4ed7b62283.pair.json` | `EC9525E0C253946B719FE31C5502A0059DDC09B3FC3C96080891BC248BE0E40E` |
| `coverage-64307c21fd26d99ae74cbf.pair.json` | `9503E3F2192A665B133D599202406D11513A1114E366CF5FD4651193AACF61DF` |
| `coverage-8644b615fca409539e8746.pair.json` | `AAADFEB9A979660A2A7CA7089779D55606319737C6405432154BF4672A173CB1` |
| `QA2-SET-020.direct.json` | `CE089AF36873B5E8452C9EB09F8EB8B7B5A22C9C1C7EB4742068FFA56EDC0636` |

既存正式PASSの再実行・書換えなし。未完了条件は実端末Realme、実際の署名D1読戻し・PNG/cleanup、残りの重複ケース、工程10〜15。**今回正式QA verdict追加0件**。
