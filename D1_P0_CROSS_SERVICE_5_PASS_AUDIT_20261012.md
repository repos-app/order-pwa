# P0 D1 cross-service static audit — 2026-10-12

Status: static inspection completed for listed local sources; production EXPLAIN, D1 rows_read deltas, user flows, account ownership and deploy state **UNVERIFIED**. This is an audit, not a release approval. No production SQL, configuration, QA runner, migration, commit, push or deploy was executed.

## Evidence scope and 7-DB matrix

| Database | Local source owner | Observed 2026-10-12 UTC rowsRead in incident handoff | Pass 1 bindings/routes | Pass 2 SQL | Pass 3 amplification | Pass 4 isolation | Pass 5 operational |
|---|---|---:|---|---|---|---|---|
| izakanpai-yuwaku | /izakanpai tenant API; prime owns fix | 7,729,355 | documented, partial | documented P0 JOIN, prime | 8s polling documented, prime | store_id verification pending | UNVERIFIED |
| izakanpai-teat | /izakanpai tenant API; prime owns fix | 930,449 | documented, partial | same tenant implementation, verify DB plan | polling and QA pending | store_id verification pending | UNVERIFIED |
| izakanpai-platform | /izakanpai hybrid router | no row in snapshot | wrangler.toml and wrangler.hybrid-router-production.toml, no cron | full SQL fingerprint review pending | router concurrency pending | routing identity pending | UNVERIFIED |
| izakanpai-control | /izakanpai controlPlaneWorker.js | 21,111 | wrangler.control-plane-production.toml 15min cron | dispatch/deletion query plan pending | scheduled dispatch and deletion jobs share trigger | authority/tenant guard pending | UNVERIFIED |
| kurasias-db | /kurapinas Worker | 286,700 | wrangler.toml DB binding, 5min/15min cron | **risk found**, details below | **risk found**, details below | API/admin auth review incomplete | UNVERIFIED |
| kurasias-staging-db | /kurapinas Worker staging | no row in snapshot | env.staging DB binding, crons=[] | same source code, actual deploy version UNVERIFIED | staging cron disabled in config | production/staging binding separation in config | UNVERIFIED |
| pitayasu-analytics | source repository unlocated in approved accessible roots | 498 | **owner/Worker UNVERIFIED** | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED |

Numbers above reproduce the handoff's UTC-day GraphQL sample and do not represent new queries. The handoff observed 8,968,113 rowsRead across listed DBs and separate 24h SQL Insights 8,387,960 rowsRead for the yuwaku JOIN; different windows must not be added.

## Pass 1 — ownership, bindings, execution routes

- /kurapinas/wrangler.toml:1-29 binds production DB as `DB` -> `kurasias-db`, with `*/15 * * * *` and `*/5 * * * *` triggers. Lines 69-93 bind staging `DB` -> `kurasias-staging-db` and disable staging cron. Source: /kurapinas/worker/index.js:156 scheduled handler.
- /kurapinas/worker/api.js:2400-2410 routes 5min cron to Buffer social-window checks; 15min cron collects and stores feed plus LINE/privacy tasks. This is source configuration only; remote actual deployed triggers not checked.
- /izakanpai/wrangler.control-plane-production.toml and /izakanpai/wrangler.tenant-provisioner-production.toml both show 15min schedules; /izakanpai/src/controlPlaneWorker.js:1648-1651 dispatches tenant and automatic deletion jobs, and /izakanpai/src/tenantProvisionerService.js:804-806 dispatches physical cleanup. Hybrid router production config has no scheduled trigger.
- PitaYasu source is not among named approved roots; ownership requires Cloudflare Worker metadata/repository mapping, with no D1 traffic probing.

## Pass 2 — SQL efficiency findings

**KP-READ-01, P1 candidate:** /kurapinas/worker/db.js:200 `storedFeed()` queries `feed_items WHERE julianday(published_at) >= julianday('now', '-7 days') ORDER BY published_at DESC LIMIT 150`. Line 202 `attachTrendHistory()` repeats this pattern over 61 days with LIMIT 5000. Applying a function to the indexed column may prevent an ordinary `published_at` range seek, despite `idx_feed_items_published_at` declared at line 10. For every feed GET, index.js:153 can invoke BOTH methods. Measure local SQLite EXPLAIN and D1 meta.rows_read with representative data before switching to bound UTC ISO cutoff strings; verify mixed/legacy timestamp formats to preserve behavior.

**KP-READ-02, P1 candidate:** /kurapinas/worker/db.js:454-488 `dbPageViewMetrics()` performs at least 16 individual COUNT/GROUP BY scans per admin metrics request, covering current/previous/global/KuraPinas countries/devices/paths/SNS. Indexes visible at db.js:50-51 are `(created_at)` and `(path,created_at)`; aggregation of range subsets can still read every matching row repeatedly. Consider cached materialized daily aggregates or one conditional group scan after validating exact metrics semantics. Do not guess rows_read from SQL alone.

**KP-READ-03, conditional:** /kurapinas/worker/db.js:117 `ensureDb()` executes the entire schema statement batch, additive columns, migration introspection and `PRAGMA optimize` once per live isolate/binding, protected by a WeakSet afterward. New isolates can repeat the work; if concurrent first requests arrive before WeakSet insertion, the batch can race. The code comment at lines 105-115 documents historic subrequest exhaustion. Quantify cold-start rate and consider single-flight initialization plus moving schema changes into approved migration, with rollback and compatibility checks.

## Pass 3 — amplification and retry findings

**KP-LOAD-01, P1 candidate:** /kurapinas/worker/index.js:153 schedules `ctx.waitUntil(saveFeed(env,stored))` when cached feed is fresh, on each eligible feed GET; coupled with `storedFeed` and `attachTrendHistory` this may create avoidable D1 work. Preserve trend freshness and translation state before suppressing same-data writes; include concurrency tests and idempotency.

- Public KuraPinas UI /kurapinas/worker/ui.js includes limited UI timers and request paths; an 11-occurrence regex scan of `setInterval|setTimeout|retry fetch` does not establish absence of all retry paths. Full generated scripts, third-party bot and load-check route inventory remains open.
- 5min cron executes 288 times/day; 15min cron 96 times/day *if Cloudflare fires every scheduled trigger*. For a path averaging R rows_read, daily estimate is `288 × R5 + 96 × R15`, plus HTTP/API traffic; actual per-call rows_read and concurrency are unmeasured.
- Feed endpoints and control-plane jobs need finite retries/backoff on quota errors; no production tests were performed.

## Pass 4 — security and isolation

- KuraPinas production/staging DB bindings are explicitly separated in source configuration. Actual deployed bindings/secrets/routes are unverified.
- KuraPinas is a community DB with admin and public entrypoints, not the POS store_id tenancy scheme. Admin authorization and write idempotency must be tested at endpoint level; no security PASS is assigned solely based on static paths.
- izakanpai store_id, platform routes, control-plane tenant dispatch and tenant provisioner physical cleanup require parent-child tenant isolation and no cross-tenant cache tests by the owning agent. This audit did not change those agents' files.

## Pass 5 — operational gate and cross-service release

1. Obtain actual account/Worker binding inventory and per-SQL Insights for all seven D1s via analytics, avoiding production SELECT/EXPLAIN during quota outage.
2. On local fixture with large historical feed/page_views, compare EXPLAIN and results for KP-READ-01/02, plus cold-start ensureDb calls and feed GET write count. Record proof that translation, trend ordering, PV counts, admin date range, cron schedules and social sends are unchanged.
3. Coordinate with KuraPinas maintainer before touching dirty `worker/db.js`, `worker/index.js`, `worker/api.js` files. Existing working tree contains concurrent edits, so this audit intentionally avoids speculative modifications to those shared files.
4. Validate staged Worker routes/bindings and public home/articles/feed, admin metrics, translation and social dispatch using non-production fixtures. Keep remote validations UNVERIFIED until separately recorded.
5. After user-authorized release, use external Cloudflare analytics to watch per-DB and account-summed daily rowsRead, including the 3m/4m/4.5m budget checkpoints, abnormal slope and SQL fingerprint spikes; verify recovery after UTC reset and stop on regression. Compare dedicated Cloudflare accounts for QA and business production before any migration.

## Outcome and limitations

Five independent static viewpoints documented; **none of the seven DBs has five-pass production verification**. KuraPinas high-read candidates KP-READ-01/02 and amplification KP-LOAD-01 need measured fixes; KR ensureDb cold-start risk needs instrumentation. PitaYasu repository owner remains unverified. This file was added locally without altering service behavior.
