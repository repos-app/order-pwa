# OPR-TAKE-018 — append-only proof clarification

2026-10-11 14:43 Philippine time: Actual **PASS** proof is preserved at
`.android-qa-emulator/qa-takeout-screen-wake-20261011064252.json`.

The real actions were **Android KEYCODE_SLEEP**, verified asleep for
**2,417 ms**, Android KEYCODE_WAKEUP, verified Awake and unlocked, same
authenticated takeout WebView with loaded menu, followed by **two real
native taps**: open the product options modal then cancel/close it. Both
modal-open and modal-closed states were independently read back. Cart count
remained zero and **no order was submitted or DB write made**.

The initial runner summary text incorrectly said "native language toggle
JP/EN then restored" because a message constant was not updated after the
native action strategy was changed. The trace and proof evaluator itself
correctly certified `touch.target=optionsOpenClose` with `overlayOpened`
and `overlayClosed`. The script's future summary has been fixed.

**The completed formal runner case and all PASS/FAIL are immutable.** A
metadata-only correction was attempted through the approved runner update
API; it explicitly rejected the change with
`runner_completed_result_overwrite_denied:OPR-TAKE-018`, as intended.
The formal runner result has **not** been overwritten. This append-only
clarification is the correct source for interpreting the original proof.
