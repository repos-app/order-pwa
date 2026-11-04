# IZK-UT-075 member create/update input handling — LOCAL ONLY

## Proven root and change

`src/crm.js` silently applied `slice(0,120)` to member names, `slice(0,1000)` to allergies and `slice(0,2000)` to notes in both `saveMember` and `updateMember`. These pre-existing business limits are now checked before member lookup and batch mutation. Overlength returns `{success:false,error:'name_too_long'|'allergies_too_long'|'note_too_long'}`; valid persisted strings retain their entire value. Birthdate uses existing strict YYYY-MM-DD parser. Member phones already use digit-only `normPhone` as primary key; no new arbitrary digit limit is imposed and digit normalization is unchanged.

The Native `mobile-app/web/members.html` registration/editing form and Web production `docs/yuwaku/members.html` / TEST `docs/yuwaku/test/members.html` editing forms check their own three fields. `paste` and `beforeinput` reject an exceeding insertion and show a localized error; selection replacements within the limit remain possible. IME composition remains unblocked, with `compositionend` notice and save-time check. Programmatic overlength assignments are detected before RPC. Removed maxlength from the relevant name/allergies/note fields to avoid silent browser-side clipping; existing edit values are not altered. Native pre-existing phone maxlength 30 removed because server has no 30-digit business constraint. Long phone values still require future business/DB review.

## Verification

`node --test test/izk_ut_075_member_input_local_test.mjs`: **4 PASS / 0 FAIL** (Native/Web production/Web TEST source-executed VM, direct backend save/update with SQLite in-memory real query and batch binding). SQLite invalid create and update inputs for each of the three fields lead to zero writes and original member/profile row unchanged. Positive update exercises name 120, allergies 1000 and note 2000. First fixture attempt failed due a missing `member_profiles.updated_at` column; fixture schema corrected to represent actual upsert target, then 4/4 PASS. `git diff --check` exit 0; existing Web CRLF normalization warnings only.

No official QA was executed. No actual mobile UI, browser, backend network, production DB or deployment evidence exists for this local fix. Native, Web and TEST have separate release pipelines and still require proof after packaging.

## Self reviews — 10 distinct checks

| ID | Evidence | Outcome |
|---|---|---|
| S01 | Inspect two server functions, identify three slices and their existing 120/1000/2000 bounds | PASS |
| S02 | Negative saveMember on max+1 all three fields | PASS |
| S03 | Negative updateMember on max+1 all three fields | PASS |
| S04 | SQLite real SELECT and row snapshots across reject paths | PASS |
| S05 | SQL write spy confirms zero batch mutations on bad input | PASS |
| S06 | SQLite positive update preserves full max-length data | PASS |
| S07 | VM paste overflow and selection replacement for all three release faces | PASS |
| S08 | VM programmatic overflow detects allergies/note before RPC code path | PASS |
| S09 | IME composition is not prevented; compositionend and save guard available in source | PASS (source); physical IME PENDING |
| S10 | Changes restricted to member functions, three member UI files, owned test/doc; prior CRM reservation changes remain intact | PASS |

## Horizontal reviews — 10 independent checks

| ID | Evidence | Outcome |
|---|---|---|
| H01 | Native create and edit use same `saveMember` form, single guard | PASS |
| H02 | Web production edit form guards same trio | PASS |
| H03 | Web TEST edit form guards same trio | PASS |
| H04 | Both backend write paths independently reject before SQL | PASS |
| H05 | Web readonly member phone left unchanged during editing | PASS |
| H06 | Birthdate parser unchanged and constrained by calendar format | PASS |
| H07 | Existing member points/visits/spend columns not overwritten on positive profile update | PASS (source) |
| H08 | Form input maxlength clipping removed and save-time validation present on all surfaces | PASS |
| H09 | Member phone normalization/30-character HTML historical mismatch identified; no unsupported new API limit introduced | PASS (audit); phone policy PENDING |
| H10 | Related member enrollment through other flows, GAS/legacy backend, locale/real-device rendering and whole-input inventory still pending prime integration | PENDING |

These reviews concern local source only. **Formal QA PASS newly recorded: 0**. Member phone normalization and other enrollment surfaces require further cross-contract investigation; they are not claimed complete.

## Follow-up review: Native registration phone 30

The existing Native `mPhone` maximum was 30 raw UTF-16 code units. The first patch accidentally removed its HTML maxlength before adding a guard; the completed patch explicitly includes `mPhone:30` in the same paste/beforeinput/save-time mechanism and rejects direct **create** requests with raw trimmed phone length over 30 (`phone_too_long`). The existing digit normalization `normPhone` remains unchanged; this is the previously deployed UI limit, not a newly invented narrower policy. Legacy phone keys are immutable on Native editing (`refreshMemberFormMode` sets readOnly) and Web editPhone readonly; existing >30-character keys remain editable for non-phone profile fields, and updateMember does not newly reject their key length. A VM regression proves mPhone 31 is invalid when editable, yet bypassed when readOnly; SQLite negative create proves no write. **The digit-only normalization may remove separators and remains a separate historical behavior, not silently truncated suffix.**

The final repeated `node --test test/izk_ut_075_member_input_local_test.mjs` reports **4/4 PASS**; `git diff --check` exit 0. This closes the earlier H09 length-control gap for Native **create**; telephone format and other capture surfaces remain PENDING.
