# Realme正式QA 0344・0363 — INCOMPLETE原因調査（2026-10-15）

実機: Realme RMX3938 / Android QA APK `910017` / 720×1600 px / QA専用店舗 `teat`。**2件とも実機で正式RUNNING claimを取得して複数回試行したが、いずれも原アサーションを完了できず、公式PASS/FAILとして記録しない。** 最後の現行台帳は PASS297 / FAIL47 / BLOCKED2 / NOT_RUN485 / RUNNING0。親のグローバル停止設定と他のiOS/AVDレーンは変更なし。

## 原因区分（アプリ、テストドライバー、テストデータ／仕様）

| ケース・試行 | 原因分類 | 客観的な結果・根拠 | 修正／残課題 |
|---|---|---|---|
| 0344 初回 | **共通QAドライバー** | `QA_DISCOUNT_OFFICIAL_CLAIM_REVOKED`。実際の公式claimはRUNNINGだが、所有権コールバックが `true` を返さないため共通入力ガードが拒否 | コールバック契約を `return true` に統一して修正、テストデータは復元済み |
| 0344 2回目 | **共通QAドライバー** | `QA_0340_WRONG_UI_RULE`。所有割引のEdit押下後に該当IDが選択されなかった。初期fixtureの選択状態未確証 | 共通 `openRetainedNativeEdit` をhit-test＋visualViewport座標＋1回限定ネイティブBack/reopen再試行へ改修（否定系テスト3 PASS）。アプリ障害とは未確定 |
| 0344 最新 | **配布APK仕様差異＋QA判定不足** | `QA_DISCOUNT_INVALID_SAVE_REACHED_NETWORK`。空・0・-1はネイティブ入力/HTML妥当性不成立を確認済み。その次の入力（計画上 `0.001`）でAPI.post呼出しが一時インターセプターに捕捉された。**実送信・実保存は行われていない** | APKは `value<=0`、HTMLは `min=0.01`、ローカル修正版は `value<0.01`。**アプリ配布版のUI min不一致は確定**。ドライバー側も旧QA仕様「送信前**または**サーバーで拒否」より厳しく、RPC試行だけで中断している。次回は直前値・API応答・署名付きDB不変を分けて証明。新APK/Workerの承認後に再試験 |
| 0344 仕様 | **要件未確定** | `fixed` 割引額最大値は製品ルールに設定されていない。percent100上限のみ存在する | P0ケースは「max=仕様値」要件を含むため、上限について製品仕様の合意が必要。上限を想像してPASSにしない |
| 0363 初回 | **共通QAドライバー** | `QA_REAL_TARGET_NOT_PHYSICALLY_VISIBLE`。DOM全体456×630だが visualViewport360×497, offsetLeft33/offsetTop133.5, DPR2で、ドライバーが `innerWidth=360/innerHeight=800` に固定して誤って不可視判定。ネイティブタップ0件 | 共通 `visibleRealmeTarget` に表示オフセットを適用。独立再読込と画面状態一致後に公式孤児claimを解放 |
| 0363 2回目 | **共通QAドライバー** | `QA_REAL_NATIVE_BOOLEAN_READBACK_FAILED`。チェックボックスではなく関連ラベル中央へのタップを選択し、OFF→ONの状態変化が確認できなかった | 実 `input` 中心点、elementFromPoint、一意のタップ対象、状態変化のbounded readbackを共通座標処理へ反映。復元は成功 |
| 0363 最新 | **テスト前提データ不足** | `QA_FORMAL_QR_IMAGE_REQUIRED_FOR_VISIBLE_CHECKOUT_ORACLE`。実機ネイティブのQR ON/OFFタップ、保存後のsigned `getSettings` 確認は成功。だがQA店舗には `gcashQr` がなく、実際の会計QRボタン表示を観測できない。`admin.html` は `qrPaymentEnabled && !!gcashQr` の場合だけQRボタン表示 | QRを使えない**非決済用テスト画像**をQA所有・一時R2データとして準備する工程が未実装。配置、署名付き照合、実会計しないプレビュー、R2削除＋設定全復元までセットで準備してから再試験。画像未登録をアプリ不具合扱いしない |

## 最終実機証拠（read-only独立監査）

- 0344: `test-results/qa-v2-evidence/realme-0344-f56a28bb0884e572/`、4 PNG、各720×1600、SHA一致。成功入力ベクトルは3件（空、0、-1）。`cleanup.verified=true`、所有QA割引の変更前後SHA一致、他8割引ルール不変。理由コード `QA_DISCOUNT_INVALID_SAVE_REACHED_NETWORK`。正式ケースは依然 `NOT_RUN`。
- 0363: `test-results/qa-v2-evidence/realme-checkbox-formal-0363-1792054776536/`、4 PNG＋1構造証拠、SHA一致。ネイティブ4タップ（QR ON／保存／QR OFF／保存）、ONとOFFの署名付き保存確認、QR OFF時の実会計プレビュー確認、27項目の署名付き復元SHA一致。理由コード `QA_FORMAL_QR_IMAGE_REQUIRED_FOR_VISIBLE_CHECKOUT_ORACLE`。正式ケースは依然 `NOT_RUN`。
- 再確認: `node scripts/qa-v2-realme-incomplete-evidence-audit.mjs QA2-KEEP-PT-INP-0344 realme-0344-f56a28bb0884e572` および `... QA2-KEEP-PT-INP-0363 realme-checkbox-formal-0363-1792054776536` とも `errors: []`。
- 0344の独立read-only生データ: 割引rule ID `ca85d6ed-a801-406b-b5ea-a047f546d39a`、コードは原fixture値、percent=10、enabled=false、他ルール8件。0363独立read-only生データ: cash=true、card=false、qr=false、QR画像未登録。**いずれも最終状態は試行前と同一**。
- APK 910017の `assets/public/settings.html` ソース実抽出監査: `node scripts/qa-v2-realme-0344-apk-contract-audit.mjs`。旧APK内のSHA `fb3e84d9...` と現在作業木 `e6fdf6d6...` の不一致を確認。**ローカルソース修正をデプロイ済みと報告してはならない**。

## 共有テスト基盤の対処と残留条件

1. ドライバー: QA-owned fixtureの復元、実画面hit-test、実ネイティブ入力、viewport座標、押下後独立読戻し、失敗時の強制INCOMPLETEを共通モジュール中心に改修。`qa-v2-realme-discount-physical-ui.mjs` の不正入力再入力後の実際の値を照合する追加ガードを導入。
2. 親ランナー: 子プロセスがexit2で終了しても、正確なcase、署名付き全スコープ復元証拠、独立SHA、現在claimが合う場合だけINCOMPLETE claimを解放。**PASS/FAILへ昇格しない**。旧0342 PASS等の公式記録は変更しない。
3. 配布物: 未デプロイの最小値0.01修正を**新しい署名付きQAビルド**へ反映し、Worker側の正確なバージョン、同一UI/Server拒否基準を配信証明してから0344を再開。ユーザー側でビルドを起動する方針があるため勝手にビルド/配信しない。
4. テストデータ: 0363のQR画像とR2ライフサイクルを隔離・所有証明・復元可能にする準備が完了するまでは、QR有効時の会計ボタン表示を正式PASSとしない。
5. 新規アプリ障害 `IZK-UT-076`（最小値の配布APK不一致）を別文書に記録。既存 `IZK-UT-073/074`（画面長文や揺れ）と、今回のQA操作失敗は混同しない。

## 実施/未実施の境界

- **今回実施:** 2件の実機複数試行、正式claimの取得・証拠保全・原状復元と解放、共通ドライバーのソース修正と否定系オフラインテスト、APKとworktreeのハッシュ/関数比較、調査文書作成。
- **今回未実施:** 新しいAPKビルド、Worker本番デプロイ、R2テストQR画像の設置/削除、未確定値の実API保存・集計、iOS正式QA、0344/0363の正式PASS/FAIL登録、コミット・push。修正後ソースは新しい依存SHAレビューを経ずに再試行しない。
- **正式台帳:** `PASS 297 / FAIL 47 / BLOCKED 2 / NOT_RUN 485 / RUNNING 0`。古い状態 `ORPHAN_CLAIM_REQUIRES_RECONCILIATION` は最終試行終了後の最新 `NO_FORMAL_PROGRESS` に更新され、現在の排他ロック残留なし。

### 自己レビュー10観点（原因調査、実機10巡ではない）

S01 原QA期待、S02 manifest旧ID、S03 現行公式台帳、S04 初回・2回目・3回目の証拠、S05 Realme所有権/排他、S06 署名付き店舗境界、S07 データ前後SHA、S08 PNGと証拠SHA、S09 APK配信SHAとソース差、S10 app/driver/fixture/specの誤分類防止を実際に照合。

### 横展開10観点（各製品実機は未再試験）

H01 割引固定/割合上限、H02 native/Web/iOS settings、H03 直接API入力、H04 会計QRプレビュー、H05 cash/creditと全OFF拒否、H06 設定ラベル依存項目、H07 image R2テナント所有権、H08 子プロセス異常時のclaim、H09 未完了の証拠SHA復元、H10 Android以外の停止設定。**横展開のアプリ正式実機テストはPENDING**。
