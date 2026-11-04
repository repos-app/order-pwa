# iOS OPR-BCP-019〜023 SOURCE境界契約（2026-10-27 PHT）

## 適用範囲と再利用

正本 `.qa-v2-official/manifest.json` の831件から指定5件のみ。既存
`scripts/qa-autonomy/ios-bcp-tenant-boundary-family.mjs`（014〜018の
共通Manifest検査、teat/yuwaku所有fixture、claimed iOS物理要件、独立before/after
Oracle、所有cleanup）をデータ駆動で拡張。既存
`qa-v2-ios-claimed-bridge.mjs`、HID、DDI、Source Registryに接続する
ソース要件を追加し、新規の個別ドライバー、ケース専用登録helper、publisher、
正式Runner操作は作成・実施していない。

| ID | Manifestのaction → checkpoint | 必須の独立観測と期待状態 |
| --- | --- | --- |
| 019 | Tenant A inventory IDをBでadjust → `0/403` | A=teatの在庫IDをB=yuwakuの認証セッションからID指定で操作し、拒否を実HTTPで観測。A/Bの在庫数量・inventory_moves・業務スナップショット不変、影響行0 |
| 020 | store_id欠落write → `fail closed` | QA所有settings INSERTで**実SQLのstore_id列を省略**。NOT NULL/tenant guardの該当エラーによる実ABORT、変更0、A/B不変。認証済API bodyのstoreId省略では代用不可 |
| 021 | store_id別値write → `auth tenant優先/拒否` | teat認証のbodyにyuwakuを送信。HTTP拒否で両店不変、または実際にteat所有行だけが更新されyuwaku不変と独立D1で確認。別店への1行でも書込みは不可 |
| 022 | store_id update attempt → `immutable trigger拒否` | teat所有settings行をteat→yuwaku UPDATE。実際に導入済みの`settings: immutable store_id`トリガーでABORT、行変更0、双方のDB不変。既存APPROVED Oracleに整合 |
| 023 | public reservation store tamper → `fail closed` | teat固定の専用公開ルートと原URLを別途実証し、クエリをyuwakuへ改ざんしたHTTPを拒否。双方のreservations・reservation_contacts不変、連絡先漏洩0。**共有公開フォームで別の有効店舗URLを開く行為はこの負例に算入不可** |

全ケースで現行Bridgeのtap/fill/PNGだけでは業務攻撃操作を表現できない。
`makeIosBcpStoreGuardPhysicalScenario` は `sourceOnly=true`、
`executableWithCurrentBridge=false`、`formalVerdict=null` とし、個別
`missingCapability` を返す。 `makeIosBcpStoreGuardPlan` /
`runIosBcpStoreGuardCase` は未接続機能名でfail closed。新しい5件の欠落理由は
従来の `IOS_BCP_TENANT_MISSING` 集約を通じて
`ios-source-contract-registry.mjs` の Stage10診断へ届くが、
独立D1 Reader/実機runnerの7要素が揃わないためSOURCE登録完了・実行可能とは数えない。

## 特に注意する実装の意味

- 019: `src/index.js:554-575` の receiveStock/logWaste/stocktake は名前基準。
  `src/inventory.js:195-211,222-244` のsaveDrinkInventoryは
  店舗内スナップショットの行削除・追加も行うため、名前検索や全量保存だけで
  「foreign ID adjustを拒否」と判定しない。対象IDへの実際の正規ルートと
  QA所有行だけの安全なfixtureをレビューすること。
- 020/022: `migrations/0026_store_id_child_isolation.sql:632-640` の
  settings INSERT guardとUPDATE immutable trigger。
  022の期待値は `test/plans/qa-approved-oracles/QA2-KEEP-OPR-BCP-022.json` の
  APPROVED内容と同一。Android側の過去の実SQL/実機証拠はiOSへ転用しない。
- 021: `src/index.js:1693-1703` の認証body店不一致は403。
  Manifestが許す「認証店舗優先」を仮に観測した場合にも、必ずteatの
  独立データ差分・yuwaku不変を確認する。
- 023: `src/index.js:682-699` と `mobile-app/web/reserve.html:128,149-156`
  の通常公開URLはstoreIdによって正しい店舗を選択する。
  `src/db.js:67-89` の専用TENANT_ID固定ホスト境界を実証したうえで
  不正なURL改ざん試行を観測する必要がある。元URLの署名やhost由来を
  仮定しただけではfail closedを認めない。

## 後始末と独立証拠

共通cleanup契約にはcaseId、fixtureId、実際の所有者、teat/yuwaku、対象ID、
両店舗元スナップショットを紐づける。専用fixtureのみ復元・セッション破棄・
Native interception解放・監査保全・例外終了時reconcile後、
**別readIdの独立D1読戻し**で双方の復元ハッシュを確認する。023のみ
元公開リンクの復元証拠も必須。いずれもremote D1をこの作業で操作していない。

## SOURCE検証

- 変更ファイル: `scripts/qa-autonomy/ios-bcp-tenant-boundary-family.mjs` と
  同名の `.test.mjs`。既存014〜018のAPIは維持。
- `node --test` に対象13件（旧7/新6）を含め、隣接BCP004〜018、
  `ios-automation-contract-audit`、`ios-831-stage-action-matrix`、
  `qa-ios-contract-scope` を組み合わせ **45/45 PASS、FAIL0、exit0**。
- `node --check`（両変更ファイル）と `git diff --check` exit0。
- 上記のNodeテストは合成fixtureでのSOURCEコード契約検証のみ。
  iOS実機・本物のDDI/HID/Apple/TestFlight・HTTP/D1・正式Runner claim、
  Oracle承認、PASS/FAIL記録は **0件**、正式判定への加点 **0件**。

## 自己レビュー S01〜S10（SOURCE、各独立観点）

| 観点 | 実際に確認した箇所/判定条件 | 結果 |
| --- | --- | --- |
| S01 正本 | `.qa-v2-official/manifest.json:11704-11871` 5 IDの存在・831固定 | PASS |
| S02 旧ID/期待 | `verifyIosBcpStoreGuardManifest` action/checkpoint/legacy個別不一致を負例テスト | PASS |
| S03 fixture隔離 | 2店舗のQA許可・所有・exclusive lease・collision・readId検証 | PASS（実fixtureは未検証） |
| S04 実機起動遮断 | `makeIosBcpStoreGuardPlan` と `runIosBcpStoreGuardCase` は必ず個別missingで停止 | PASS |
| S05 在庫の型 | 019 ID指定と数量/履歴SHAを独立照合。名前基準の擬似ID指定を不可とする | PASS（実HTTP経路は未実装） |
| S06 欠落SQL | 020 実SQL store_id列省略と正しいDB拒否理由を負例まで検査 | PASS（remote実証待ち） |
| S07 認証優先 | 021 拒否/認証teat側書込の2経路とyuwaku副作用拒否を検査 | PASS（remote実証待ち） |
| S08 immutable | 022 APPROVED期待と完全一致するエラー・変更行数0の負例を検査 | PASS（remote実証待ち） |
| S09 公開URL | 023 専用ホスト境界・元URL・通常の別店舗有効URL誤分類拒否を検査 | PASS（host実証待ち） |
| S10 cleanup | 5件のcase所有限定、監査保全、2店舗SHA復元、別readId拒否の負例 | PASS（実cleanupは未実施） |

## 横展開レビュー H01〜H10（独立した関連実装の探索）

| 観点 | 調査元と照合点 | 結果 |
| --- | --- | --- |
| H01 在庫API入口 | `src/index.js:554-575` 認証からstoreId確定、name基準在庫操作 | 確認 |
| H02 在庫データ副作用 | `src/inventory.js:195-244` full snapshot削除・更新分岐 | 確認 |
| H03 認証店舗の検査 | `src/index.js:1693-1703` body.storeId不一致403 | 確認 |
| H04 GAS認証系 | `src/gasApi.js:1236-1255` 認証store固定の別入口 | 確認 |
| H05 DB欠落guard | `migrations/0026_store_id_child_isolation.sql:632-636` INSERT制約 | 確認 |
| H06 DB更新guard | `migrations/0026_store_id_child_isolation.sql:638-640` immutable制約、隣接テーブルにも同型trigger | 確認 |
| H07 専用Worker固定 | `src/db.js:67-89` verifiedStoreId != TENANT_IDなら404 | 確認 |
| H08 公開予約API | `src/index.js:682-699` URL店舗入力の仕様とサービス境界 | 確認 |
| H09 Native予約画面 | `mobile-app/web/reserve.html:128,145-156` URL指定・フォームconfigの整合性 | 確認 |
| H10 iOS共通実機基盤 | `qa-v2-ios-claimed-bridge.mjs:63-83,165-171`、HID driverの許可4入力、DDI admissionと既存BCP014〜018回帰 | 確認（物理controller不足） |

この20観点はSOURCEレビューであり正式iOS QA結果を意味しない。次の実機段階では
現行のiPhone/署名ビルド・公式claimとDDI、019の所有ID型HTTP controller、
020/022の独立SQL controller、021のbody境界HTTP、
023の専用ホスト付き実URL改ざんと独立teat/yuwaku D1・cleanupを
それぞれ別の証拠として取得する。
