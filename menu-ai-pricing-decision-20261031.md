# Menu PDF/image import: business-cost and entitlement decision (2026-10-31)

**SUPERSEDED POLICY:** The initial no-per-page-charge proposal below was
replaced by the user's subsequent explicit request for a shared prepaid
AI-credit wallet, with Free 3 introductory credits, Pro 30 monthly credits,
and optional 30/100/300 prepaid packs. See
`docs/ai-credits-implementation-20261031.md`. The measured 8-page model
inference evidence and source limitations below remain historically useful;
the earlier subscription-only launch policy is not current.

## Decision for initial release (proposal, not deployed)

- Do **not** charge users per page at launch. Include menu document analysis in
  izakanpai Pro, within a monthly page allowance.
- Suggested product quotas: Free: one-time **2-page trial**, preview only, with
  the existing Free **10-item registration limit** enforced; Pro: **30 pages
  per store per calendar month**, no separate AI fee. A page consumes one quota
  unit even if the page uses a second inference pass. No anonymous requests.
- Extra scans after a monthly quota is exhausted require the next quota
  period. Do **not** silently bill customers or launch an add-on purchase flow.
- Cap each upload at 15 pages and provide an explicit remaining-page counter.
- Maintain a shared account-wide daily AI cost budget across izakanpai
  services and other applications on the same Cloudflare account; stop or
  queue a menu job if the free allocation cannot be safely honored.
- Proposed initial operational warning/stop threshold: **8,500 of 10,000
  daily Neurons**, leaving a 1,500-Neuron estimation and analytics-lag buffer.
  This is a safety target, **not a guaranteed provider-enforced hard cap**.
  Cloudflare Workers Paid can bill automatically on overage, so a truly
  zero-cost guarantee requires a separate enforceable account-wide cap or
  disabling paid inference. Coordinate with all other workloads.
- Cloudflare AI Gateway supports spend limits that return HTTP 429 after
  the chosen price budget. Use a gateway-level cost guard if the feature is
  routed through AI Gateway, with a separate per-tenant guard. The gateway
  guard tracks estimated request prices, **not** the remaining free Neurons
  of all non-gateway traffic in the account. Do not mistake a dashboard
  billing alert for a hard stop.
  https://developers.cloudflare.com/ai-gateway/features/spend-limits/
- Make separate provider-cost decisions only after measuring real customer
  adoption, long documents, photo-only menus and peak-day queues.

## Pricing sources (verified 2026-10-31)

- Workers AI Free/Paid: 10,000 Neurons/day free, reset at 00:00 UTC. Workers
  Paid charges **$0.011 per 1,000 Neurons** above that allocation:
  https://developers.cloudflare.com/workers-ai/platform/pricing/
- Gemma 4 26B: **$0.10 / M input**, **$0.30 / M output** tokens:
  https://developers.cloudflare.com/ai/models/%40cf/google/gemma-4-26b-a4b-it/
- Mistral Small 3.1 24B: **$0.351 / M input**, **$0.555 / M output** tokens:
  https://developers.cloudflare.com/ai/models/%40cf/mistralai/mistral-small-3.1-24b-instruct/

## Grounded actual usage, not a sample estimate

Cloudflare GraphQL aiInferenceAdaptiveGroups, account-local usage windows on
2026-10-31 UTC, from the real PDF-rasterized izakanpai 8-page test:

| Workflow | Measured requests | Input tokens | Output tokens | USD equivalent beyond free | Neurons equivalent |
|---|---:|---:|---:|---:|---:|
| Gemma, 8-page first-pass, 12:02–12:07 UTC | 8 | 9,856 | 13,120 | $0.0049216 | ~447.4 |
| Gemma Japanese recheck, whiskey page | 1 | 516 | 202 | $0.0001122 | ~10.2 |
| Gemma Japanese recheck, food page | 1 | 579 | 402 | $0.0001785 | ~16.2 |
| Gemma Japanese enlarged food crop | 1 | 583 | 354 | $0.0001645 | ~15.0 |
| Mistral, 7-page independent extraction, 12:17–12:21 UTC | 7 | 22,516 | 8,470 | $0.012604 | ~1,145.8 |

The cropped-image recheck is a *separate extra* inference, not part of the
nominal two-pass cost. GraphQL group counts matched the independently saved
test request counts in the selected UTC windows.

Normal two-pass Gemma: approximately 70 Neurons per page, **$0.006 per
8-page menu** at overage rates. Adding independent Mistral for every page
may increase this to about **235 Neurons/page**, or **$0.021 per 8-page
menu**. These are measured-sample extrapolations, **not hard maximums**.
Tokens, image detail, prompt size, retries and unknown complexity can increase
both usage and per-page cost.

Previous account-wide utilization (the account also runs translation,
inventory, tests and potentially other apps):

| UTC date | Measured model requests | Approximate consumed Neurons |
|---|---:|---:|
| Oct 28 | 539 | 3,850 |
| Oct 29 | 483 | 4,581 |
| Oct 30 | 467 | 6,328 |
| Oct 31 (partial day, includes this test) | 278 | 5,230 |

Daily observed usage is not a forecast of normal production baseline.
Both model prices and the exact mix of other account workloads can change.

## Peak-day sensitivity: fixed 6,328-Neuron other usage

If all stores upload one 8-page menu **on the same UTC day**, estimated
additional Workers AI overage is:

| Stores that day | Gemma two-pass (70 Neurons/page) | Independent second model on all pages (235 Neurons/page) |
|---|---:|---:|
| 1 | $0 | $0 |
| 10 | ~$0.021 | ~$0.166 |
| 100 | ~$0.576 | ~$2.027 |

This is **Cloudflare incremental AI cost** only, not end-user pricing.
It excludes D1/R2/other API costs, taxes and retries. The true free cap is
per Cloudflare **account per UTC day**, NOT per customer/store.

The product's existing inventory vision quota (`src/platformUsage.js`) is
30 calls/month for Free, 300 calls/month for Pro; those counters measure
**requests**, not shared Workers AI Neurons, and do not cover the new
menu document importer. Dedicated page quota and account-wide cost reserve
must be introduced before release.

## Implementation gates before public release

1. Store-specific and account-wide atomic quota reservations **before**
   any model call (including retries, second opinions and page splitting).
   Reconcile actual token usage; reserve a pessimistic ceiling and refund
   unspent budget if possible. Include **all Workers AI workloads** sharing
   the account, not merely menu uploads.
2. On Workers Paid, the account free allocation is **not** a spending cap;
   fail closed on unavailable/stale usage observations and queue until the
   next UTC-day window rather than assuming free capacity.
3. Apply the existing app Free/Pro 10-item registration restriction after
   extraction; never bypass it with bulk import. Verify tenant isolation.
4. Separate usage/entitlement UI for scanned **pages**, retries, and
   provider cost, with no customer charge hidden in the feature.
5. Independently test **camera photos** and poor-quality scans, not only
   images rasterized from PDF; benchmark non-English names and category
   consistency. Do not treat English-name/price 90/90 on this dataset as
   general quality approval.
6. Track provider errors, queued pages, mean/p95 Neurons and cost per
   *successfully reviewed* item, plus invalid-JSON and retry counts.

## Implementation status

This document is a cost/entitlement **recommendation**, not a release.
The menuDocumentImport source and offline probes exist locally, but the
proposed per-store page limits, account-wide hard budget and customer billing
rules are **not yet integrated with the production app**. No build, deploy,
commit, push, customer charge or source-menu registration was performed here.
