# D1 production --all inventory correction (local only)

Observed BEFORE: `node test/tenant_d1_schema_contract_gate_test.mjs` exit 1; inventory incorrectly included three isolated QA databases. Remote `--all` exit 1: `count:5`, two production PASS plus three `wrangler_remote_read_failed`.

Fix: exclude only three **exact name and UUID pairs** known from a live `wrangler d1 list --json`. An unexpected UUID for the same name throws `sandbox_database_identity_mismatch`, and every other `izakanpai-*` candidate remains under strict owner marker, environment, UUID, store ID and 0046 schema checks. New physical stores are discovered automatically; a missing marker or bad contract fails the gate. No D1 SQL writes.

AFTER: `node test/tenant_d1_schema_contract_gate_test.mjs` exit 0; `node --check` both touched `.mjs` exit 0; `git diff --check` exit 0; live `node scripts/tenant-d1-schema-contract-gate.mjs --all` exit 0, `{ok:true,count:2}`, teat/yuwaku each `failures:[]`, schema 0046.

## Source self-review: independent checks performed

| ID | Inspection and outcome |
|---|---|
| S01 | Read actual Cloudflare D1 inventory: exact three QA names and UUIDs matched exclusion pairs |
| S02 | Reviewed exact-name matching: only Map keys are exempt; arbitrary new store names remain candidates |
| S03 | Reviewed UUID check: reused sandbox name with changed UUID throws before exclusion |
| S04 | Exercised mixed-list test: production teat remains while three sandbox records are excluded |
| S05 | Exercised new-store fixture: unknown `izakanpai-new-store` is discovered, not silently omitted |
| S06 | Exercised sandbox-only fixture: no production tenants causes explicit error |
| S07 | Exercised duplicate production inventory fixture: explicit duplicate error |
| S08 | Reviewed `validateTarget` store/database/UUID/environment checks remain unmodified |
| S09 | Ran `node --check` on both changed source/test modules: both exit 0 |
| S10 | Ran `git diff --check` on both files: whitespace/error-free exit 0 |

## Horizontal review: independent downstream/adjacent checks performed

| ID | Inspection and outcome |
|---|---|
| H01 | Read `src/tenantD1SchemaContract.js`: missing owner marker still fails closed |
| H02 | Exercised new-store missing marker: `TENANT_PROVISIONING_MARKER_MISSING` |
| H03 | Exercised wrong store marker: `TENANT_STORE_ID_MISMATCH` |
| H04 | Exercised wrong database UUID marker: `TENANT_DATABASE_ID_MISMATCH` |
| H05 | Exercised wrong environment marker: `TENANT_ENVIRONMENT_MISMATCH` |
| H06 | Reviewed schema version gate 0044–0046: unchanged contract checks remain active |
| H07 | Reviewed `wrangler.onb004-qa.toml`: QA database has explicit separate QA binding and test environment |
| H08 | Reviewed `scripts/tenant-provisioner.mjs` imports: unchanged schema assessment remains shared with provisioner |
| H09 | Exercised unrelated product inventory: non-izakanpai DB does not enter physical tenant gate |
| H10 | Executed live remote `--all`: only confirmed teat/yuwaku audited, both 0046 PASS; no D1 mutation |

Scope caveat: sandbox identities are pinned to observed UUIDs. If a new QA database under the `izakanpai-*` naming scheme appears, it will fail closed until classified. The production gate intentionally requires inventory classification for every unrecognized candidate.
