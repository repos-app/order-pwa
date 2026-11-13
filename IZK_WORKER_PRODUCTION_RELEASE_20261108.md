# 2026-11-08 izakanpai Worker production release verification

## Scope and source

- Authorized action: commit/push all currently uncommitted files and deploy production Workers.
- Production Worker deployment source: `main` / `7f67983f7126507e071222679e36b32bc6c47f31` (already pushed at work start).
- Pre-existing working tree: 0 uncommitted files at initial check. Subsequent parallel QA edits are reviewed/tested and committed separately from the Worker upload.
- No iOS/Android build or store distribution, no tenant database schema mutations, and no mobile formal-QA verdicts.

## Preflight evidence

- Current remote Control registry + physical D1 provisioning owners: **13/13 matched**.
- Generated common Gateway bindings: **D1 14 (Control 1 + physical tenants 13), R2 13**. Inventory source is live Cloudflare, not historical hardcoding.
- Production D1 schema contract gate: **13/13 PASS**, schema `0056_ai_menu_review_reasons.sql`.
- All three Wrangler `deploy --dry-run --keep-vars` validations exit 0.
- Related pre-deploy regression: image search 10/10 PASS, image generation credit ledger 8/8 PASS, image UI 15/15 PASS, order confirmation 24/24 PASS, gas compatibility 561/561 PASS; shared UI preservation PASS.

## Deployed Worker versions

| Order | Worker | Version | Wrangler exit | Cloudflare deployment status |
| --- | --- | --- | --- | --- |
| 1 | `izakanpai-common-gateway` | `16f157dc-08a4-43f3-814f-7bd9b5fdcbe4` | 0 | 100% |
| 2 | `izakanpai-control-plane` | `52b1f5fc-d202-4422-bd28-de26479a8cdc` | 0 | 100% |
| 3 | `izakanpai-api` | `c8f58e5f-437e-440c-a7a2-3d30d742e1b2` | 0 | 100% |

All deployed with `--keep-vars` to preserve existing Worker secrets. No dedicated per-store Worker was created. Actual Cloudflare `deployments status --json` returned each exact version at 100%.

## Independent remote checks

- Public `https://izakanpai-api.izakanpai.workers.dev/health`: HTTP **200**, `{"ok":true,"service":"izakanpai-hybrid-public-router"}`.
- Public authenticated-free read-only API `bootstrap`, `getMenu`, `getSettings`, `getTables` over all 13 registered stores: **52/52 PASS** (13/13 stores; 0 failures). Each response HTTP 200 and `ok:true`.
- Read-only R2 object `_izakanpai/provisioning-owner.json` physical ownership audit: **13/13 PASS**, 0 failures.
- Local read-only test evidence: `test-results/common-worker-b-cloudflare-readonly-20261104/public-read-*-release1108.json` and `r2-owner-all-active-audit.json` (ignored from Git; no customer data stored).

## Boundaries / outstanding checks

- Runtime authenticated end-to-end image generation (credit decrement, real Cloudflare AI execution, R2 and product save) and iOS native UI not yet formally verified. No claim of formal Android/iOS QA PASS.
- No mobile binaries, TestFlight or Android distributions were built/published; new source-side iOS/Android UI needs a separately authorized mobile build and distribution.
- The public Web / PWA static hosting mirrors are separate from Worker deployment. This release records the Worker update only; frontend publishing is not inferred from Worker status.

## 2026-11-08 PHT — AI画像生成・クレジット修正の追加Worker本番反映

- Git変更対象は `c2ef9f72a787d391170e454fa12005db0dcd8944` → `35cdb5fcd2d5a285a6b884d35413f7ee72747a3a`。68変更パスと進行中の資料整理1件を計2コミットで `origin/main` へpush、実リモートSHA一致。
- 既存 `scripts/release/deploy-impacted-workers.mjs --base=c2ef9f72a787d391170e454fa12005db0dcd8944 --execute-production` を使用。依存グラフが選んだのは **common Gateway** と **public API** の2Worker。Control PlaneとProvisionerは未変更のため既存版を保持。DB migration、モバイルbuild、Web静的配信は行わない。
- ライブControl登録と物理D1所有マーカーからGateway構成を再生成：**13店舗、D1 14（共通Control 1 + 店舗13）、R2 13**。両Workerの `wrangler deploy --dry-run --keep-vars` が成功してから、同じ `--keep-vars` で本番デプロイ。
- `izakanpai-common-gateway`: バージョン **`011e0756-c42a-495c-89ee-2a816bdeccfb`**、Cloudflare deploy status **100%**。
- `izakanpai-api`: バージョン **`8a9a92ef-8bc8-43fa-9a8b-c5d15517d2b5`**、Cloudflare deploy status **100%**。公開 `/health` **HTTP 200**。既存の課金・秘密変数を保持。
- 本番デプロイ後の独立読取監査：物理13 D1のschema contract `0056_ai_menu_review_reasons.sql` **13/13 PASS**、R2の所有者証跡GET **13/13 PASS**、13店舗×4公開読取API `bootstrap/getMenu/getSettings/getTables` **52/52 PASS**（FAIL 0）。公開読み取り結果は `test-results/common-worker-b-cloudflare-readonly-20261104/public-read-*-release1108ai.json`（Gitignore下）へ記録。
- コミット前の `pre-commit` フックはPASS。S4 SQLiteの **47/47 PASS / FAIL0**、これは正式端末QAではない。
- **未検証**：AI画像生成の本番認証付きRPC、実AIモデル・R2への画像格納・実ウォレット減算・実機iPhoneのヘッダー表示。今回のWorker配備だけで `mobile-app/web` / `docs/yuwaku` の静的画面変更は本番アプリへ届かない。iOS/Androidビルド、TestFlight、Web静的サイト配信、正式QA判定はいずれも実施していない。
