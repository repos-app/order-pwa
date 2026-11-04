# P0 | Cloudflare D1 account-wide rows-read incident: remediation and release gate

2026-10-12 PHT. STATUS: LOCAL SOURCE/TES​T COMPLETED, LIVE INCIDENT NOT YET CLOSED. This is a review artifact, not production or deploy approval. Base incident: docs/D1_ROWS_READ_P0_INCIDENT_HANDOFF_20261012.md (IZK-UT-069).

## 1. RCA and 5 Whys

1. Other services became unavailable because all seven named D1 databases share one Workers Free **account-level**, not per-DB, 5 million rows-read daily quota. Cloudflare notification anticipated UTC reset 2026-10-13 00:00 / PHT 08:00. Live recovery is not confirmed.
2. On 2026-10-12 UTC, recorded GraphQL D1 metric totaled 8,968,113 rowsRead across visible databases. Yuwaku 7,729,355 (prior day 16,099, roughly 480x), teat 930,449, KuraPinas 286,700, control 21,111, PitaYasu 498; platform/staging had NO OBSERVED ROW (not established zero).
3. Rolling 24h D1 Insights identified src/orders.js active-orders detail JOIN: 116 executions, 8,387,960 rowsRead, mean 72,310 per execution. Unbounded order_items history was joined to orders even when only a handful of orders were active. Rolling 24h and UTC day are different windows and their counts MUST NOT be added.
4. Frequent admin/KDS 8-second polling, incorrectly overridden user 10/30/60s setting and broken GAS-compatible getOperationsDelta (version 0 / unchanged false forever) multiplied full scans. Specific originating device/QA runner NOT PROVEN from request logs.
5. Co-located production services had no quota isolation or complete non-D1 telemetry and backpressure; one service's excessive SQL queries exhausted the shared account budget.

Confirmed: SQL fingerprint, 116 calls, historic high-read SQL, 7-DB UTC sample, source polling/delta defect. Inferred/unproven: real production planner/indexes, exact device attribution, live deployed Worker versions, other websites' current recovery.

## 2. Exact local code repairs (NOT committed/pushed/deployed)

| File | Local change | Safety invariant |
| --- | --- | --- |
| src/orders.js | Bounded 80-ID chunks SELECT from order_items WHERE store_id=? AND order_id IN(binds), using orders returned from authenticated active-only query; zero active IDs skips items | No historical JOIN, no LIMIT truncation, stable detail ordering and public API shape, tenant scoped |
| migrations/0045_operations_revision_low_cost_poll.sql | New operations_revision keyed by store_id; seed existing and new stores, trigger updates for orders/items/calls/occupancy/demo/menu/localized labels/table changes | Per-tenant random revision token, guarded store ownership. REMOTE MIGRATION NOT APPLIED |
| src/orders.js, gasApi.js, index.js | sinceVersion matched to single indexed revision row -> unchanged true without full snapshot; changed returns full | Revision read *before* snapshot to avoid lost updates, missing migration => full load, never fake unchanged; authenticated tenant only |
| mobile-app/web/admin.html and kds.html; docs/yuwaku and docs/yuwaku/test equivalents | Admin honors 10/30/60s; KDS visible 15s/hidden 60s; no read internal retry, exponential+jitter network backoff, >=15m quota cooldown | No automatic retry for uncertain writes; force refresh respects cooldown; multiple in-flight suppression retained |
| mobile-dist, ios/App/App/public, android/app/src/main/assets/public | Local admin/KDS asset SHA parity verified | NOT an APK/IPA install or TestFlight build |
| tenantDb.js, accountDeletion.js, scripts/extract-tenant-d1-data.mjs, tenantProvisioningMigrations.generated.js | Register 0045 tenant table, account erasure and fresh destination revision, package migration for future tenant provisioning | 45 migration / 85 table / 74 guarded tables A/B SQLite integrity |
| scripts/d1-p0-monitor.mjs | Offline-only D1-SQL-free GraphQL response analyzer | Live account secrets, credentials, API adapter and notification schedule NOT configured |

Risks: added triggers increase rows written (must separately monitor Free writes/day); page-level cooldown is not an account-global rate limiter, and future canary must check Worker concurrency across tenants.

## 3. SQL Before/After EXPLAIN and representative local measurement

Run python test/d1_p0_rows_read_benchmark.py. Offline SQLite fixture: same-store 10,000 settled orders/30,000 settled item rows, 3 active orders/10 active items, separate-store 1,000 settled orders/3,000 items.

| Metric | Before | After |
| --- | ---: | ---: |
| Returned active item rows | 10 | 10 (exact equality) |
| SQLite VDBE progress-based work estimate | 420,200 | 100 |
| Local VDBE improvement | — | **99.976%** |
| SQLite EXPLAIN QUERY PLAN | SEARCH oi USING INDEX idx_order_items_store_order(store_id=?), then order PK search | SEARCH order_items USING INDEX idx_order_items_store_order(store_id=? AND order_id=?) |
| Local single-run time | approximately 18.3 ms | approximately 0.055 ms |
| Real Cloudflare D1 meta.rows_read | UNVERIFIED | UNVERIFIED |

This is **NOT** proof of 98% reduction in D1 rows_read. Production D1 execution plan, pragma_index_list, D1 Insights and meta.rows_read MUST be measured separately, without hammering an exhausted production DB.

### Nominal maximum polling frequency / 24h per continuously active screen

| Usage | Before | After |
| --- | ---: | ---: |
| Admin | 10,800 polls at 8 seconds | 8,640/2,880/1,440 at 10/30/60 seconds |
| KDS foreground | 10,800 at 8 seconds | 5,760 at 15 seconds |
| KDS hidden | 1,920 at 45 seconds | 1,440 at 60 seconds |
| KDS full safety refresh | about 480 per 3-minute cycle | approximately unchanged; incremental overhead must be measured |

Illustrative 2 KDS @15s + 2 admin @30s = 17,280 revision polls/day. If every poll were unchanged, its revision probe costs approximately one indexed row per invocation (plus UNKNOWN auth, guard, middleware queries). This is **not** a certified per-account forecast below five million; the actual incident SQL had 116 observed executions, not 10,800, and other D1/Cron/UI reads remain unmeasured.

## 4. Seven databases and mandatory five passes

Full evidence: docs/D1_P0_CROSS_SERVICE_5_PASS_AUDIT_20261012.md

| DB | Pass 1 binding | Pass 2 SQL | Pass 3 amplification | Pass 4 isolation | Pass 5 remote recovery |
| --- | --- | --- | --- | --- | --- |
| izakanpai-yuwaku | Local source inspected | P0 SQL repaired locally | Admin/KDS repaired locally | Local A/B SQLite PASS | UNVERIFIED |
| izakanpai-teat | Same source, DB metrics known | Actual D1 plan UNVERIFIED | Per-device traffic UNVERIFIED | Local A/B SQLite PASS | UNVERIFIED |
| izakanpai-platform | Router Wrangler inspected | SQL fingerprint audit incomplete | Router concurrency incomplete | Binding/role proof incomplete | UNVERIFIED |
| izakanpai-control | 15-minute cron found in source | Job SQL plan incomplete | Scheduled job retry incomplete | Tenant dispatch proof incomplete | UNVERIFIED |
| kurasias-db | Source binding + 5/15-minute Cron | Feed julianday index risk, 16+ PV queries per admin metrics call | Fresh cache GET schedules saveFeed; isolate schema batch overhead | API authorization review incomplete | UNVERIFIED |
| kurasias-staging-db | Separate Wrangler DB binding, staging cron disabled in source | Same risky code, deployed version unknown | Staging execution unknown | Secret/route inspection pending | UNVERIFIED |
| pitayasu-analytics | Worker/source owner unknown | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED |

Five separate **static audit** viewpoints were documented, NOT five production-verified passes. KuraPinas source has active concurrent work, so its production code was deliberately not modified. Named high-load candidates require local fixtures and owning maintainer's review. PitaYasu Worker ownership is unresolved.

## 5. Regression test evidence and limits

PASS: full npm test suite; real SQLite 45 migration setup, 85 physical tables/74 structured tenant tables, 201 active IDs split into 80-ID chunks, cross-store known ID cannot leak, empty-ID skip, stable API payload; revisions on orders/calls/occupancy and idle one-row query, missing 0045 fallback full; admin and KDS six native/hosted scripts' mock offline/quota recovery with no duplicate internal retry; distribution SHA parity, menu localization; extract-tenant and erasure compatibility; external GraphQL monitoring module mock 5 tests.

NOT TESTED: Cloudflare production or controlled D1 meta.rows_read, production SQL index plan, business end-to-end on Android device/Emulator/iPhone, Worker deployment, approved migration 0045, KuraPinas/PitaYasu live flows and recovery. No QA runner, device or existing PASS/FAIL/NG/evidence was mutated.

## 6. Monitoring, isolation, other sites and rollback

See docs/D1_P0_MONITORING_ACCOUNT_ISOLATION_20261012.md for options and costs. Monitor through independent Cloudflare GraphQL Analytics, **without issuing D1 SQL**. Account-level 3m INVESTIGATE / 4m WARNING / 4.5m CRITICAL; SQL average reads >10,000, yesterday ×3, seven-day median ×10, unknown DBs and graph gaps flagged as UNKNOWN rather than zero. Live credentials, schedule, notifications and monitoring incident response require user approval.

Account choices:
- One Free account: $0 but cross-service quota risk remains even after SQL fixes.
- QA in separate Free account: $0 if eligible, isolates QA storm from production; production cross-service coupling remains; secrets, traffic routes, D1, R2/queues, staging data and Cron must be separated.
- Workers Paid: begins at $5/month per account, 25 billion rows read/month included, further reads $0.001 per million, plus other Workers CPU/requests and D1 usage; mitigates daily cliff but poor SQL can incur cost.
- Isolated accounts per production service plus dedicated QA account: strongest blast radius isolation; more DNS, SSL, Worker IDs, keys, D1 backups, migration, audit, cost and rollback complexity.

Live site recovery **NOT VERIFIED** for KuraPinas/PitaYasu. The Cloudflare notice projected reset at 2026-10-13 00:00 UTC (08:00 PHT); it is not evidence of recovered user flows.

Release + rollback needs approval:
1. Record actual account IDs, Worker version IDs, DB IDs/bindings, 0045 migration status, full SQL plan in **safe isolation**, prechange backups and time-travel bookmarks.
2. Local/isolated D1 representative dataset verify >98% actual meta.rows_read reduction and no correctness regressions. Evaluate extra trigger writes/quota, Store A/B data isolation, Cron, users, language and offline/recovery.
3. Explicit permission for isolated git commit/push, Worker deploy, additive 0045 migration (tenant by tenant), live canary, QA builds and staged traffic; never assume these are granted merely by this incident request.
4. Canary yuwaku/teat under low load with account-level GraphQL rowsRead plus exact Insights fingerprints; verify order/KDS/checkout/refund/print and user error resilience.
5. Separately validate Android physical, Emulator, iOS build/TestFlight and KuraPinas/PitaYasu home/articles/feed/admin; preserve official QA runner owner assignments.
6. Abort on abnormal quota slopes, order/accounting discrepancies, cross-tenant leak, Worker timeouts or errors. Revert Worker to prior pinned version on authorization, do not blindly DROP additive 0045 triggers: D1 schema rollback requires separately reviewed migration, transaction/state and restore steps.

## 7. P0 completion blockers

1. Production D1 read-row decrease and index use not measured; 99.976% only local VM work.
2. Source fix not committed/pushed/deployed, and migration 0045 not applied, so live sites are not protected by these local changes.
3. KuraPinas candidates not repaired/tested and PitaYasu owner unknown. Seven DB five-pass remote acceptance incomplete.
4. No post-UTC-reset live site restoration, no independent account split or functioning alert dispatch proven.
5. All official Android, Emulator, iPhone QA retests and OS build provenance remain owned by QA teams.

**Verdict: reviewable local remediation available. Account-wide P0 NOT CLOSED, no claim of production restoration.**
