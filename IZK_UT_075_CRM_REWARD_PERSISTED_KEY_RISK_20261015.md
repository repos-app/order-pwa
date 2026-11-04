# IZK-UT-075: CRM reward persisted identifiers — final source-only risk audit

Date: 2026-10-15. Scope `src/crm.js` reward order ID, coupon key, reversal and coupon history. Source-only, no production/official QA/commit/deploy.

## Decision — BLOCKED for safe mutation

`prepareOrderRewards` converts `orderId` to `sanitize(...).slice(0,100)` **before inserting** `order_reward_snapshots.order_id`, while callers also persist an independently generated order ID in `orders`. This can break correspondence for inputs over 100 characters, though the current store and takeout order handlers generate UUIDs, so there is no demonstrated end-user form that submits a >100-character order ID. The inserted `coupon_code` is not sliced; it is trimmed and uppercased. `saveCoupons` preserves entered code without silent length clipping. `buildOrderRewardReversalStatements` slices **persisted** snapshot `order_id` to 100 and `coupon_code` to 64; these are historical DB keys, not freshly submitted UI input. Overlong historical values can fail to match the existing rows, leaving coupon usage and reversal flags unchanged. Changed-key behavior could also affect unrelated refund/reverse logic. `redeemCoupon` preserves code; `validateCoupon` only normalizes uppercase; date slices and birthday digest slices have different semantics.

An exact fail-closed rejection in `prepareOrderRewards` is not safe to introduce as a standalone local change: the caller appends reward statements to the same write batch and uses internal generated order IDs, while reverse already handles existing snapshot keys by lossy normalization. Neither 100 nor 64 is documented here as a business input maximum; they are implementation truncations of identity keys. The correct fix needs a single identity contract at order creation and reward snapshot/reversal, plus legacy migration strategy and both submit flows' regression proof. This work is outside the allowed mutation scope. **No edits to `src/crm.js`**; preserve all earlier dirty member/reservation fixes.

## Executed two-tenant evidence

`node test/izk_ut_075_crm_persisted_key_risk_test.mjs` PASS. Local in-memory SQLite creates tenants A/B with independent 101-character order keys and 65-character coupon keys. It constructs **the actual exported CRM reversal SQL and bindings**; tenant-A attempt leaves tenant-A coupon count and `reversed_at` unchanged because the bound IDs were sliced, and independently confirms tenant-B remains unchanged. This reproduces the matching risk. It does not claim an end-to-end real refund failure, because real current UUID order IDs are shorter.

## Self review 10 distinct aspects

| ID | Target / evidence | Status |
|---|---|---|
| S01 | New snapshot `sourceId` 100-length truncation and insert binding | PASS source |
| S02 | New snapshot coupon key uppercase without clipping | PASS source |
| S03 | Legacy reversal order key clipped to 100 | PASS source |
| S04 | Legacy reversal coupon key clipped to 64 | PASS source |
| S05 | Reversal coupon UPDATE depends on unmodified exact stored key | PASS SQLite fixture |
| S06 | Reversal flag UPDATE depends on unmodified exact stored order ID | PASS SQLite fixture |
| S07 | Coupon code admin save preserves normalized full code | PASS source |
| S08 | Historical overlong key risk reproduced from real SQL/binds | PASS fixture |
| S09 | Full new order + reward transaction with overlong IDs | PENDING actual reachable input |
| S10 | Production historical overlength prevalence and migrations | PENDING; no production DB |

## Horizontal review 10 distinct aspects

| ID | Target / evidence | Status |
|---|---|---|
| H01 | In-store order caller uses internally generated order ID | PASS source |
| H02 | Takeout order caller generates UUID | PASS source |
| H03 | Coupons are store-scoped and code-based | PASS source |
| H04 | Snapshot rows keyed by `(store_id,order_id)` in migration 0011 | PASS schema |
| H05 | Reversal binds tenant A only | PASS two-tenant fixture |
| H06 | Tenant B remains untouched by tenant A reversal | PASS two-tenant fixture |
| H07 | Existing nontruncated coupon validation/read path | PASS source |
| H08 | Birthday coupon uses generated digest and month slices | PASS source; intentional |
| H09 | Live cancellation/reversal across historical long keys | PENDING physical/database integration |
| H10 | 0029/0032/0033 triggers and all refund lineage semantics | PENDING full migration suite |

All PASS marks refer to precise source, schema or synthetic SQLite findings. No official QA status changed. Root-cause remedy remains pending coordinated identity contract and historical compatibility design.

## 2026-10-15 最終ソース修正追補（上記BLOCKEDは修正前の監査履歴）

ユーザーの全ローカル修正指示を踏まえ、DB移行不要の**新規入力と保存済みキー照合の安全な境界**を実装した。src/crm.js::prepareOrderRewards は新規注文IDの元文字列が100文字超なら、割引・会員・注文一括記録に進む前に invalid_order_id を送出し、曖昧な接頭辞IDを新たに保存しない。既存の通常注文・持ち帰りは内部UUID生成なので変更なし。src/crm.js::buildOrderRewardReversalStatements は、rewardsから取得した**保存済みorder_idとcoupon_codeの全キー**を使ってWHERE照合・クーポン返金・二重取消防止を実施する。以前の100/64文字への再切詰めを廃止。

- **独立SQLite実証**: node test/izk_ut_075_crm_persisted_key_risk_test.mjs **PASS**。店舗A/Bそれぞれに長さ101注文IDと65クーポンコードをもつ保存済みsnapshotを用意し、Aだけの逆仕訳でusage_count=0、reversed_atセット、coupon_usage1件、Bはusage_count1/未逆仕訳を検証。新規101字注文IDをprepareOrderRewardsに渡すと、DB読書き前にinvalid_order_idで拒否することも証明。
- **互換性**: 従来どおり短いUUID/既存snapshotは元のIDのまま一致し、過去の保存行へのmigration・書換えはない。ただし、過去に**snapshotだけが切り詰められ、ordersには元の長いキーが保存された異常行**は、欠落した末尾が復元できない。このような履歴の実在・復旧には本番DBのバックアップと対象レコード照合が必要であり、未確認の履歴を推測して書換えない。
- **最終判定**: 現在到達可能な新規経路と保存済みsnapshotの正確な逆仕訳についてLOCAL SOURCE FIXED。実D1・他の返金フロー・歴史的な不整合データ修復と実機QAはPENDING。S01-S10/H01-H10は上記詳細の証拠を再利用し、対応箇所を最新結果へ読み替える。元のBLOCKED記述は調査開始時点の証跡であり、コード状態を表さない。
