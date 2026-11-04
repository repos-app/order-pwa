# iPhone keyboard residual screen audit — 2026-10-12

Source audit across `mobile-app/web`; iPhone runtime QA is still required. The audit checks keyboard-focused inputs, viewport resize callbacks, fixed overlays and viewport-unit height constraints.

## Verified risk and local repairs

- `account.html`: account deletion textarea/password handler centered out-of-view input via `scrollIntoView` and then applied a second `window.scrollBy` on visualViewport resize/scroll. Replaced with a single minimal visibility adjustment; avoids repeated centering jumps. Retains existing landscape handling.
- `order-entry.html`: membership phone/birthday, coupon code, feedback comment were in fixed center overlays (`.overlay.show` from `styles.css`), allowing keyboard-driven recentering. Added iOS portrait only top alignment, outer scrolling, naturally sized sheets, and 16px feedback input to prevent zoom.
- Synced both files to `mobile-dist`, iOS packaged public, Android packaged public. Named regression test verifies assertions and exact mirrored bytes.

## Screen-by-screen unchanged findings

- `coupons.html`: inputs are in document-flow form rather than centered overlay; the existing adjustment runs only in short landscape viewport and moves only obstructed fields. The unrelated editor smooth scroll runs on Edit click, not keyboard focus.
- `reserve.html`: reservation fields have natural-flow layout and 16px font; no keyboard-triggered viewport resize scrolling or centered fixed sheet. Existing landscape narrow layout addresses small landscape keyboard.
- `reservations.html`: the readonly URL input may receive focus for selection, but the listing is normal-flow without keyboard-opening editable fields or viewport-dependent vertical centering.
- `support.html`: normal-flow textarea; landscape-only focus-recovery checks visualViewport bounds with minimal scroll; no portrait recenter behavior.
- `clock.html`: clock-in modal is vertically centered, but has no text/password/textarea input; soft keyboard not triggered.
- `attendance.html`: date/month controls and evidence display modal have no text keyboard entry or focus-centering scripts.
- `sales.html`: month picker and data tables; no keyboard text input, fixed input modal, or competing visualViewport scroll.
- `drink_inv.html`: no detected keyboard-triggered fixed center text-entry dialog; normal-flow fields.
- `reservations.html` external booking link: readonly and copy selection only; no soft keyboard layout reflow expected.

## Five audit passes

1. Input and textarea inventory; focusability of dialogs.
2. Fixed overlay and flex center placement.
3. 100vh/100dvh and vh-limited sheet height.
4. visualViewport/resize/focus and scrollIntoView/scrollBy overlap.
5. Changed-source distribution parity and targeted regression test.

Remaining gate: run a real iPhone portrait recording for account deletion, membership, coupon and feedback input focus, blur, and keyboard dismissal. No device testing, commit, push, build, or deploy during this task.
