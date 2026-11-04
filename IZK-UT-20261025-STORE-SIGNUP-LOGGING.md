# New-store signup failure: logging, investigation, and remaining audit work

Updated: 2026-10-25 (Asia/Manila)

## Why the first test1 failure could not be reconstructed

The old physical Provisioner normalized Cloudflare failures to a generic API
error and wrote at most a sanitized console.error event. It never wrote the
pre-activation failure to Control D1 provisioning_jobs.last_error; this column
remained NULL and attempts stayed zero. Cloudflare real-time Wrangler tail is
not historical storage. The historical Workers observability query also
returned HTTP 403 with the available Wrangler OAuth.

The earlier underlying Cloudflare response and exception are not recoverable
from the stored data. Do not assert a specific upstream API error number.

## LIVE as of 2026-10-25

- Production Provisioner version after audited redeploy: 6511afb4-9a8d-4114-b7ca-003caeed6c20.
- Wrangler config: observability.enabled=true; head_sampling_rate=1.
- Every accepted registration emits structured `provision_stage_event` records
  with `attemptId`, `provisionRequestId`, `storeId`, `stage`, `outcome`, and only
  on failure: sanitized `errorCode`, `cfStatus`, `cfCode`, `cfOperation`.
- A missing completed/failed outcome after a started event suggests an abrupt
  invocation failure or platform interruption and should be correlated with
  Worker invocation logs for that attempt/time range.
- No password, raw email, bearer token, user IP, raw exception, or Cloudflare
  error body is logged by these custom events.
- Control D1 audit persistence is now enabled in production after authenticated
  API, table and retention were deployed. Actual row generation from a fresh
  registration remains pending until a legitimate registration occurs; do not
  claim the end-to-end audit path has been witnessed while the table is empty.

## Procedure on the next signup incident

1. Cloudflare dashboard > Workers & Pages > `izakanpai-tenant-provisioner`
   > Observability > Logs. Set the narrow timeframe around the error.
2. Search `provision_stage_event`, filter by `storeId` (e.g. `test1`) and
   collect all messages sharing its `attemptId`.
3. Inspect the last `stage`/`outcome`. For `failed`, collect `errorCode`,
   `cfOperation`, `cfStatus`, `cfCode`. Compare with the matching invocation
   status, exception, and duration. If only `started`, inspect the next
   invocation failure/timeout rather than assuming the Cloudflare API failed.
4. Independent read-only Control D1 check:

   npx wrangler d1 execute izakanpai-control --remote --json --command="SELECT r.store_id,r.state AS tenant_state,j.state AS job_state,j.attempts,j.last_error,j.updated_at FROM tenant_registry r LEFT JOIN provisioning_jobs j ON j.store_id=r.store_id WHERE r.store_id='test1';"

5. Compare the dedicated D1 marker, R2 owner marker, Worker deployments and
   Control service binding, using exact store identity and generation.
   Do not create another store ID, overwrite credentials or mark QA PASS from
   source-only checks.
6. For provider 401/403, investigate token rights; 429 investigate quota/rate;
   5xx/transport investigate provider transient conditions and safe read-back;
   mismatched existing resources require manual provenance review.

Workers Logs are NOT permanent: Cloudflare currently documents up to 3 days
on Workers Free and 7 days on Workers Paid. Investigate promptly. Changing
sampling or retention/pricing needs separate review.

## LIVE: bounded Control D1 audit (deployed 2026-10-25 PHT)

- `control-plane/0008_provisioning_audit.sql` defines a separate event history. It was executed against remote `izakanpai-control` (D1 `bb86691d-c208-4690-b15e-ab7b841558b2`), and the table plus both indexes were read back.
- `src/controlPlaneWorker.js` adds the authenticated, operator-only endpoint
  `/internal/operator/provision-audit` with field allowlists and prepared SQL.
- `src/tenantProvisionerService.js` has a gated write-through implementation;
  `PROVISION_AUDIT_PERSISTENCE_ENABLED=1` is now present in the live Provisioner variables.
- Live `TENANT_TEST1` and all 11 other Control service bindings were reconciled to `wrangler.control-plane-production.toml` before deployment. Post-deploy: 12/12 services and 4/4 secret bindings retained.
- Final Control Worker version: `735d37b4-7011-4c76-9664-3035a03314e2` at 100% traffic.
- Final Provisioner version: `6511afb4-9a8d-4114-b7ca-003caeed6c20` at 100% traffic, retaining 3/3 secrets and Control service binding.
- `pruneProvisionAudit` runs in the Control scheduled handler, bounded at 1000 events per execution. It deletes events older than 30 days and events for retired stores. It does not delete or modify tenant or job tables. The live D1 query planner accepted its SQL (read-only EXPLAIN).
- Public hybrid router `GET /health` returned HTTP 200, and remote D1 `SELECT COUNT(*) FROM provisioning_audit` succeeded with 0 events immediately after deployment. These checks confirm deployment and data-path readiness, **not an observed new registration/event round trip**.

After safely deploying the table, endpoint and flag, read back with:

   npx wrangler d1 execute izakanpai-control --remote --json --command="SELECT recorded_at,attempt_id,stage,outcome,error_code,cf_operation,cf_http_status,cf_error_code FROM provisioning_audit WHERE store_id='test1' ORDER BY recorded_at, event_id LIMIT 100;"

When the next authorized registration is exercised, verify event rows in Control D1 and that a failed upstream operation produces a sanitized audit record. Never perform a new production registration only to make the monitor look healthy. Control D1 cleanup removes events after 30 days or retirement; independently review broader platform privacy/deletion workflows when changing this retention contract.
