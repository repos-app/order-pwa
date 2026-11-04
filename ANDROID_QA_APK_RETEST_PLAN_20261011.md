# Android QA NG repair/retest readiness — read-only gate

Run `node scripts/android-qa-retest-readiness.mjs` for a deterministic per-ID JSON report. It reads the **2026-10-10 21:15:57 UTC snapshot** in `docs/ANDROID_QA_NG_FAIL_SNAPSHOT_20261010.json`, the backend repair register, and the current source/packaged/debug-APK files. The report does not access the runner, devices, Cloudflare, or databases.

At audit time, the snapshot contained **210 distinct FAIL IDs**. All 210 were marked source repair candidates pending reverification, but **zero are confirmed physical PASS** by this input. Source-to-packaged drift was absent; the local debug APK was older than both source and packaged assets. The snapshot is static and must not be presented as the current live runner.

The machine states are `source_fix_unconfirmed`, `release_or_install_pending`, `physical_retest_pending`, and `physical_pass_evidenced`. The first source claim comes from the register only. Commit confirmation, Worker/deployment confirmation, current APK, and device-install identity are separate explicit checks. The report defaults all unspecified checks to false. A physically confirmed PASS requires an explicit evidence record, including device serial, build identity, evidence reference, and timestamp, plus verified installation; the official runner must still be updated separately by its QA owner.

Relevant source fixes may require Cloudflare deployment, the 0043 coupon date D1 migration, platform bundling, or all three. Local APK mtime and asset hashes do not prove installed APK identity or remote schema. `preflightQaFixtureContract` only evaluates synthetic dataset/store isolation, snapshot and restoration prerequisites; it never applies fixtures or writes live D1.

Release sequence after separate authorization: verify code review / release state, apply approved Worker and schema rollout, build and fingerprint Android APK, verify deployed package/build on the target physical device, rerun each original case with evidence, and then update formal runner status through the authorized QA workflow. No step here authorizes commit, push, deploy, build, install, or runner mutation.
