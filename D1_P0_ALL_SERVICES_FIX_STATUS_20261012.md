# Cloudflare D1 P0: all-service source remediation and 5-pass handoff

Date: 2026-10-12 PHT. Incident IZK-UT-069.

**STATUS: local source/test fixes; account-wide production P0 remains OPEN.** No authorization for commit, push, deploy, production migrations, Cloudflare account/plan modifications, official QA verdict changes, or device operations.

Primary evidence: docs/D1_ROWS_READ_P0_INCIDENT_HANDOFF_20261012.md, docs/D1_P0_INCIDENT_REMEDIATION_REPORT_20261012.md, docs/D1_P0_CROSS_SERVICE_5_PASS_AUDIT_20261012.md, docs/D1_P0_MONITORING_ACCOUNT_ISOLATION_20261012.md and three prior follow-up SQL risk audits.

## New local changes

| Surface | Corrected high-load path | Test/evidence |
|---|---|---|
| izakanpai src/commission.js | Replaced history-spanning order_items JOIN with active parent ID lookups via store_id and order_id IN (80 IDs maximum per batch). Menu lookups and staff allocation IDs also chunked. Original created_at and order_item_id ordering preserved. | node test/d1_p0_commission_open_orders_test.mjs: 10k historical + 201 active orders + foreign tenant, row equality, no cross-tenant leak, indexed seek PASS |
| izakanpai Native and hosted Bridge | 1.2s base poll no longer sends D1 requests on every empty interval; idle cooldown 2.4/4.8/up to 6s, network exponential backoff and quota 15min cooldown. Existing unknown-print-ACK stop protects against duplicate printing. | node test/d1_p0_print_bridge_backoff_test.mjs: 3 surfaces idle, job, failure and one ACK PASS |
| izakanpai local packaged mobile bundles | Copied modified Native Bridge to mobile-dist, iOS public and Android public assets with SHA checks. | node test/distribution_parity_test.mjs PASS. **Not** a deployed APK or TestFlight build |
| KuraPinas worker/db.js | Changed julianday(published_at) to indexed range condition where timestamp semantics allow; merged four duplicated PV-count range queries; WeakMap single-flight initialization guards concurrent isolate requests. | Local 30k feed SQL plan SCAN -> SEARCH, 50k PV fixture 4 counts equal; site full test is independent gate |
| KuraPinas worker/index.js | Reduced repeated saveFeed on fresh feed GET, but **retained conditional persistence when translation enrichment actually changes**. Second unchanged feed GET performs no duplicate DB write. | First regression was detected and repaired; focused round30 15/15 PASS and full KuraPinas npm test **669/669 PASS** |
| PitaYasu | Repo owner identified on disk but folder is NOT an approved connector root. Cannot read/edit or independently test SQL, Cron or Worker. | UNVERIFIED / BLOCKED; do not claim five-pass completion or a fix |

## Seven-DB five-pass matrix

PASS here always means **local-only evidence**, never D1 production verification.

| D1 | 1. Owner/routes/cron | 2. High-read SQL | 3. Poll/retry | 4. Tenant/auth/write | 5. Live/recovery |
|---|---|---|---|---|---|
| izakanpai-yuwaku | Source reviewed | Core order and commission indexed fixes local | Admin/KDS/Bridge locally fixed | Tenant A/B local PASS | UNVERIFIED |
| izakanpai-teat | Source reviewed | Same POS code; remote plan unknown | Same POS code; device load unknown | Tenant A/B local PASS | UNVERIFIED |
| izakanpai-platform | Wrangler reviewed | Full SQL fingerprint unknown | Router job execution partially reviewed | Deployed binding unknown | UNVERIFIED |
| izakanpai-control | 15-minute cron identified | Job D1 read metrics unknown | Retry traffic unknown | Tenant dispatch local proof partial | UNVERIFIED |
| kurasias-db | Source 5/15-minute cron identified | Feed index and 4 PV counts locally changed | Init/feed write locally changed, full test still gated | Live admin/route review incomplete | UNVERIFIED |
| kurasias-staging-db | Source config cron disabled | Shared source, deployed revision unknown | Remote binding/traffic unknown | Secrets and staging isolation unknown | UNVERIFIED |
| pitayasu-analytics | Repo cannot be opened within approved roots | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED |

The five static review perspectives are documented; **all seven DBs are NOT five-pass production verified**. The incident observed 8,968,113 D1 rowsRead on UTC day, while the single P0 SQL Insights fingerprint had 8,387,960 rows in a separate rolling-24h window. Different windows must not be added. Local SQLite VM work for the original SQL improved ~99.98%; D1 meta.rows_read >=98% is an unverified acceptance gate.

## Required next controls before closure

1. KuraPinas full regression **669/669 PASS**, preserving translation persistence; verify historic/mixed timestamp lexical semantics on actual non-production feed fixtures before promoting indexed cutoff to production; site owner reviews diff.
2. Grant PitaYasu repository as an approved source workspace, inspect Worker bindings and Cron, repair and test SQL/poll loops, record all five passes independently.
3. Verify actual seven DB names/IDs, live Worker code revisions, index deployment, 0045 migration, account D1 GraphQL budget and SQL Insights without repeatedly reading exhausted production D1.
4. Explicitly approve source commit/push, canary, Worker deploy and migration separately; post-release D1 meta.rows_read and SQL plan must prove >=98% reduction, accounting/print/tenant behavior unchanged.
5. Independently retest Android physical, Android Emulator, iPhone and KuraPinas/PitaYasu public flows; maintain existing QA runner PASS/FAIL/NG/RUNNING and screenshot evidence.
6. Deploy independent read-free D1 GraphQL monitoring / escalation thresholds 3m/4m/4.5m only after approval; separate QA Cloudflare account from business services. Record previous Worker ID, D1 backup/time-travel and an additive trigger rollback plan.

**RELEASE HOLD.** Local remediation does not establish that production sites have recovered.
