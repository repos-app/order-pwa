# IZK-UT-084: 管理メニュー「プラン比較」後着の再発（2026-10-29）

## 証拠と原因

- ユーザー提供のiPhone録画で、管理メニューへ戻る際にFree/Pro比較バナーが先の管理タイル表示から遅れて現れることを再確認。
- 10/28の対応では、プラン再チェック時に既存バナーを隠す処理だけを除去した。しかし **初回のキャッシュ表示パスは修正されていなかった**。
- `persistHubCache()` は検証済みの `plan` を `'free'` / `'pro'` / `'legacy'` の文字列として保管する。一方 `showHub(lastAllowed,PLAN,ACCOUNT_OWNER)` は `normalizePlanCode(plan)` を呼び、旧実装は `plan.code` しか認めなかった。結果、キャッシュの `'free'` が空文字になり、`renderHub()` が一時的にFreeバナーを隠す。遅れて届く `checkToken` の `{code:'free'}` により再出現し、画面位置が変わっていた。

## 対応

1. `mobile-app/web/manage.html` と `index.html` 双方で、`normalizePlanCode` が検証済みキャッシュの文字列とサーバー応答のobjectの両方を解釈するよう修正。空/未知コードをFreeと推測しない。
2. キャッシュ済みplan・allowed・ownerは、保存元の`storeId`が現在の店舗と一致した場合だけ先行表示する。キャッシュは画面表示用で、API認証・購入・権限制御は引き続きサーバーが判断する。
3. `test/izk_ut_084_pro_comparison_always_visible_test.mjs` に初回`showHub`とサーバー応答後の再描画を原文コードで実行する回帰テストを追加。Free/Pro/legacy、店舗違い、未知のplanを確認する。

## 検証

- 084/099関連ソース/実ブラウザー回帰 **33 PASS / 0 FAIL**。
- 095/068既存遷移回帰 **3 PASS / 0 FAIL**、IZK-UT-054認証回復 **50検査PASS**。
- `npm run mobile:sync` 成功、iOS/Android同梱を更新。
- `node test/distribution_parity_test.mjs` 成功：native source→iOS/Android 各101件一致、iOS↔Android 103件一致、Web本番/TEST 88件一致。
- `node test/izk_project_test_pipeline_contract_test.mjs`：199件のテストコマンド**登録整合**PASS（199件全実行の意味ではない）。`git diff --check`成功。
- **正式QA端末PASSは未実施**。新しい署名IPA/APK作成、TestFlight配信、Android実機インストール、commit/pushは未実施。旧端末に修正が自動反映されたとは扱わない。

## 受入条件

新配布版で管理画面の往復（特に「その他→システム」、管理↔ユーザー/打刻）を録画し、Free案内が初回の管理メニュー描画に含まれており、後から上に割り込んで既存タイルを押し下げないことを確認。Pro/legacyではFreeバナー非表示のまま、同一テナントでのプラン更新時は再検証結果が正しく反映されること。確認までSOURCE完了/端末PENDING。
