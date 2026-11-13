# izakanpai: Git push 後のお知らせ自動公開

## 正式運用方針（2026-11-10更新）

- ユーザーの指示により、`main` への push に利用者向けの製品変更が含まれるときは、リリースの個別承認やストア配信の完了を待たず、Control D1 に登録して**自動公開**する。
- CI/QA/文書のみの変更では利用者向け告知を作らない。製品変更の有無はプッシュ前後の Git diff を共通判定する。
- 同じ HEAD SHA は同じお知らせIDとし、再実行時にも重複投稿しない。既存のレビュー済み文面は上書きしない。
- 日英の内容は実際の Git diff に基づく。未配布のネイティブ機能が使用可能になったと断定せず、必要なら配信状況で差があると明記する。
- 公開後、Control D1 の `published` と公開日時を読み戻して検証する。認証情報不足、登録失敗、公開失敗はCIをFAILにし、成功として扱わない。
- 通知データの公開は新たなアプリのビルド・ネイティブ配布を伴わず、既存アプリが次回情報取得時に閲覧できる。

## チャットからのコミット・プッシュ作業

1. コミット前に `git rev-parse HEAD` で BASE_SHA を記録し、製品変更を確認する。
2. 可能ならレビュー済みの日英文面を `test-results/release-notices/reviewed.json` に保存する。JSONには `severity`、`titleJa`、`titleEn`、`bodyJa`、`bodyEn` を含める。
3. コミット・プッシュ成功後、GitHub Actions が自動で登録・公開する。待機中や失敗時は公開済みと報告せず、GitHub Actionsと本番D1で結果を確認する。
4. チャットから手動で同じ自動処理を再実行する際は次を使う（重複防止あり）。

   ```sh
   node scripts/release/announcement-draft.mjs --base=BASE_SHA --publish
   # or reviewed bilingual text:
   node scripts/release/announcement-draft.mjs --base=BASE_SHA --input=test-results/release-notices/reviewed.json --publish
   ```

5. 最終報告には BASE/HEAD SHA、告知ID、日英概要、公開状態、Worker/Web/iOS/Androidの実配布状況を区別して記載する。

## GitHub Actions

- `.github/workflows/release-announcement-draft.yml` が `main` のすべての push を処理する。
- `github.event.before` と HEAD の差分をもとに `--publish` を実行し、生成JSONをartifactとして保持する。
- Control D1への接続認証は既存 GitHub Actions secret `CLOUDFLARE_API_TOKEN` を再利用。最小権限の `IZAKANPAI_RELEASE_NOTES_D1_TOKEN` が設定されていれば優先する。
- Cloudflare複数アカウント時は `IZAKANPAI_CLOUDFLARE_ACCOUNT_ID` を設定する。認証情報がなければ利用者向け変更を公開できずCIがFAILになる。
- お知らせ上限100件に達した場合や通信失敗時はFAIL。既存のお知らせを勝手に削除しない。
- 公開前後で同じnotice IDを読み戻す。現在の`published`レコードの再登録は`ALREADY_PUBLISHED`で成功として扱う。

## 検証

```sh
node --test test/auto-ci/release-announcement-draft.test.mjs
node scripts/release/announcement-draft.mjs --base=HEAD~1
```

後者はプレビューのみ。`--publish` を渡さない限り本番DBを変更しない。
