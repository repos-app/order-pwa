# QA2-SET-002 independent review proposal

Status: PROPOSAL_ONLY / INCOMPLETE. No original oracle authorization or device evidence established.

Original manifest: six actions, six legacy assertions (PT-SET-007 through 012), and two checkpoints. Three settings fields each require save/reload and Back/reopen/restart plus comparison across order and admin. tableLabelEn targets English table term (007/008); counterLabelJa targets Japanese counter term (009/010); counterLabelEn targets English counter term (011/012).

Source paths: mobile-app/web/settings.html exposes all three edit controls; mobile-app/web/app.js seatLabel renders order table/counter naming; mobile-app/web/admin.html seatLabel renders admin order naming and downstream rows; src/regionalSettings.js defines normalization and locale fallback. Both target render paths use configured locale with fallback to the other language. This is static path coverage only: it cannot establish that remote save, API response, running app or legacy records behaved correctly.

Physical acceptance proposal: capture owned fixture/settings before; save each A to B; independently read back; observe Japanese and English order/admin effects separately, new and old data, previous receipt immutability and unaffected IDs; Back/reopen, restart and optionally second Android device; detect stale cache overwrites; restore original A and verify; link genuine PNG/SHA, build/claim and API or D1 readback to all six original legacy IDs. Do not auto-approve expectations from source inspection.

Executable review: node scripts/role5-set002-original-effect-review.mjs; negative tests: node --test scripts/role5-set002-original-effect-review.test.mjs. Fail closed on manifest cardinality/field/legacy/action/checkpoint or missing code paths. No official state writes.

Ten review scenarios: Japanese fallback, English fallback, empty term, stale cache, reopen, restart, second device, fresh order, existing order/old receipt, restoration. Ten horizontal surfaces/behaviors inspected or flagged for later runtime assessment: order table chip, order selector, admin seat, admin calls, admin payment, admin receipt, settings preview, KDS, receipt history, reservations. This list is scope review, not ten runtime PASS results.
