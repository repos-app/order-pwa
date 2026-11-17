# Customer-facing reviewed release notes

The published release note is a **version-level summary of verified user-visible changes**, not a count of Git pushes, changed files, or inferred categories.

- Review the actual product diff and write concrete, accurate Japanese and English bullets in `reviewed.json`. Use the same release version in both titles (`izakanpai vX.Y 更新内容`, `izakanpai vX.Y update notes`).
- Change `reviewed.json` **in the same push as the product changes being announced**. The existing release script only auto-detects this review file if it changed in that push. The version rollup then deduplicates individual bullets across previously published notes.
- Without a changed reviewed note, the release pipeline creates a draft preview only and returns `SKIPPED_REVIEW_REQUIRED` for publication. Generic file-name categories must **never** be sent to customers as confirmed changes.
- For manually prepared review files, `node scripts/release/announcement-draft.mjs --base=<before-sha> --input=<reviewed-file> --publish` remains available with the existing pushed-commit and D1 guards. Confirm the note scope matches the pushed code.
- Existing auto-generated published records are preserved for audit/read receipts. The tenant API and frontend never display their commit count as a change count and exclude their empty category claims; absent verified details appear as an explicit missing-details message.

This process does **not** build or distribute an iOS/Android binary. Commit/push, Worker deploy, production data changes, and any mobile build/distribution remain separately authorized operations.
