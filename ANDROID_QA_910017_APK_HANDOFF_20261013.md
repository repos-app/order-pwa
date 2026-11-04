# izakanpai POS | Android QA APK 910017 handoff (2026-10-13 PHT)

> **QA全体の端末要件（2026-10-13追加）**：`test/plans/QA_V2_DEVICE_REQUIREMENTS_20261013.md` に従い、Android実機・Emulator・iPhone実機は縦向きネイティブ短辺720物理px以上でQAする。600px環境でのレイアウトFAILのみでは正式不具合としない。旧原本は保存する。

## Actual archived APK

- Absolute Windows path: C:\Users\user\OneDrive\_work\izakanpai\qa-build-registry\apks\android-qa-v910017-680211cfad5a.apk
- Repository path: qa-build-registry/apks/android-qa-v910017-680211cfad5a.apk
- Build record: qa-build-registry/records/android-qa-910017-680211cfad5a.json
- Source Git commit: 3c170afd5b6c60908696d5316b13d65c636ae1c3
- APK SHA-256: 680211cfad5ab06874809de1a097222790911fdb59996bd7bd638f52e2f70b3d
- APK size: 9,105,186 bytes
- Package: com.izakanpai.commissionpos.uitest
- versionCode: 910017
- versionName: 1.0-qa-3c170af-20261012 (date suffix supplied by existing build script; actual build 2026-10-13)
- Type: signed debug QA-only APK, not a Play Store release.
- Signing certificate SHA-256: 8951f0c50757cff72c36a1026faa3948da5bb81c38766bfbeffcdefca9cef8be

## Build provenance evidence (all local, no device operations)

1. Tracked source tree at HEAD was clean and matching source Git SHA was recorded.
2. Built using scripts/build-qa-android-latest-local.ps1 with an isolated TEMP Android staging copy, versionCode 910017 and QA-only package ID.
3. All 100 mobile-app/web source assets match exactly the embedded APK ZIP assets/public source bytes.
4. Compared all 100 ZIP source assets against git show HEAD:mobile-app/web/file. 93 byte-identical to Git, seven CRLF/LF line-ending-only differences, zero other differences.
5. Android aapt and apksigner inspection confirmed versionCode, package ID, valid QA signature.
6. APK preserved with content-hash filename, old 910015 and both 910016 APK archives left unchanged.

## Device assignment / signer compatibility

- Android physical device 910016 installer used the SAME signature cert as this 910017 APK. The new package is update-compatible with physical QA APK if package ID is unchanged.
- Android Emulator 910016 installer used a DIFFERENT cert digest: dad75968539f7a7951f06598ad6ba99203c5be20266adc4c231ec6720880e637. A direct update will normally fail with INSTALL_FAILED_UPDATE_INCOMPATIBLE. DO NOT uninstall the old app automatically; preserve session/test data and consult the QA owner for migration strategy.
- The actual installed package/version/hash must be checked independently; a verified stored archive is not proof the right device has it installed.

## Formal QA retest instructions

- Preserve all existing QA2 PASS/FAIL/RUNNING, screenshots and claimed ownership. Never double-claim RUNNING cases or re-run previously approved historical PASS cases without scope permission.
- Install only on the QA owner's authorized Android physical device/Emulator. Record device, installed package/version and binary SHA.
- Prioritize authorized still-FAIL new QA2 cases and old NG cases mapped from the legacy FAIL 245. Cross-check backend deployment before declaring success on Worker or D1-related defects.
- Focus on order/KDS, checkout/refund/printing, auth/tenant isolation, language/currency/date, attendance, and Android input keyboard focus regression.
- The iPhone keyboard-jitter fix was included in the shared frontend assets, but only Android regression can be tested with this APK; it does NOT constitute an iPhone fix verification.
- D1 optimization contains backend code/migration changes that are NOT proven deployed by this APK. Do not load/stress test production DB as part of QA.
- Only actual device behavior and preserved evidence may change formal FAIL to PASS.

## Exclusions

No physical device/emulator install, official QA runner mutation, Worker deployment, production DB migration, iPhone TestFlight build, new Git commit or push took place in this APK-only build request.
