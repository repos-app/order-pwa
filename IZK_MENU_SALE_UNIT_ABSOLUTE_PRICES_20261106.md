# Menu sale-unit pricing — 2026-11-06

## Agreed product behavior

- One catalog product with selectable serving units (Glass, Bottle, or user-defined), each displaying its FULL selling price rather than a surcharge. The existing toppings and optional extras retain their add-on amounts.
- Manual menu creation has Normal price or Unit-specific price mode. In unit-specific mode the lowest real selling price is the base price and each defined unit has an absolute selling price.
- AI PDF/photo import uses the extracted per-unit prices unchanged, for example Glass PHP 280 / Bottle PHP 2,500; Cloudflare Workflows, prompts and 1-credit-per-page billing are not altered.
- New options_json groups use kind=price_variant, type=single, required=true, choices[].price as absolute selling prices. Other option groups without that marker remain legacy additive extra charges.
- Server-side order/takeout calculates authoritative prices from the menu master, never trusting a price posted by the device. Orders preserve the canonical selected unit and final unit price.

## Existing yuwakubar products

Read-only production audit found 17 legacy AI-imported Serving/提供方法 groups, including Iichiko (Barley) with base PHP 280, Glass +0 and Bottle +2,220 (correct total PHP 2,500). All 17 passed the conversion dry run. Yuwaku, teat and test1 each had zero matching groups.

Older Capacitor builds embed their own local WebView assets. Rewriting the choice-price values to absolute amounts BEFORE the old builds are replaced would show incorrect extra charges in those old builds. Therefore DO NOT migrate the live 17 rows while older native app versions may be used. New client screens recognize the narrowly defined legacy AI group and display the correct full selling price while retaining its unchanged additive calculation. New imports use the absolute-price representation.

Cross-version compatibility is handled at BOTH boundaries: each new native
client explicitly includes unitPriceFormat=absolute-v1 with its immutable R2
Workflow upload, so old apps (which omit the capability) continue to register
the legacy delta encoding. Additionally, the shared menu API projection
(menuItemToGas) returns new absolute-price DB items to ALL order apps using
kind=legacy_sale_unit_delta, with prices transformed to deltas on the wire,
leaving actual DB absolute prices untouched. Old bundled apps ignore the
unknown marker and compute correct totals from deltas. Updated apps recognize
the marker, display the full price (base+delta), and send normal option
selection indexes; the server always calculates from its authoritative raw
physical tenant D1 absolute-price menu. Both predefined and custom units
use the same capability. The admin menu editor reads the original raw model
so the new absolute price is editable without lossy reconversion.

The guarded migration utility is scripts/menu-ai-serving-unit-backfill.mjs. It defaults to DRY_RUN, requires an explicit --apply flag, stores before/after evidence, applies only exact physical tenant and row matches and verifies each row independently. It is reserved for a coordinated later cutover.

## Formal verification boundary

Local browser, mocked Workflow and SQLite assertions are not an actual iPhone QA verdict. A new iOS build must demonstrate both historical AI imported items and new manual/AI items, product editing, customer and staff ordering, takeout, receipts, zero double charge, and expected pricing after suspension/restart. No AI credits or menu products are created during these offline tests.
