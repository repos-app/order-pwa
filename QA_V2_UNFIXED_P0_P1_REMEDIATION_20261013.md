# izakanpai 未修正QA P0/P1 修正・監査証跡（2026-10-13）

## 判定境界

本報告は **LOCAL SOURCE** の修正結果。正式QAのFAILを勝手にPASSに変更しない。`commit` / `push` / `deploy` / 本番DB migration / 実機アプリ更新はいずれも未実施。古いAPK910016/910017のFAILは、それだけで現行ソースのFAILや修正完了を意味しない。

| QA case | 現行ソースでの対応 | 自動テスト | 最終的な未検証事項 |
|---|---|---|---|
| QA2-NEW-TEN-004 | Native/GASの `getOperationsDelta` が空/未指定storeIdをHTTP400で拒否。署名済みA token + B storeIdをHTTP403で拒否 | A/B独立SQL + HTTP認証38 assertions、全回帰 | Cloudflareに配置されたWorkerが現行ソースと一致するか、デプロイ後の認証付きread確認 |
| QA2-KEEP-OPR-AUTH-007 | 同じprotected deltaのtoken不在をNative/GASともHTTP403 | 上記専用HTTP境界テスト | 配置済みWorker版確認 |
| QA2-NEW-ONB-001 | Native `SELF_SIGNUP_AVAILABLE=true`、既存signup formを表示 | QA2専用3テスト | 実機、`SELF_SIGNUP_ENABLED`と非tenant専用登録エンドポイントの配置確認 |
| QA2-UI-manage / IZK-UT-070 | Native portraitログインを縦中央固定からflowに変更、Android `adjustResize` | QA2専用3テスト・IZK-UT-071 142チェック | 新しいRealme APKでGboard送信テスト |
| QA2-KEEP-OPR-AUTH-013 | IZK-UT-071の即時ローカル失効/フォームとHeader消去で対処 | 142 + auth既存回帰 | 通信遮断時の新APK／Keychain/Keystore実機確認 |
| QA2-KEEP-OPR-PRINT-010 | NULL `last_attempt_at` の古い `printing` claim回収を管理・Native/Web bridge・CloudPRNTに横展開 | print専用+既存関連回帰 | 本番ジョブ実測、実プリンタの印刷成功確認 |
| QA2-KEEP-OPR-RACE-042 | 現行ソースにはsame requestId/different payloadのconflict判定が存在。再発防止テスト追加 | qty3→4専用回帰PASS | 古いQA runtimeとの配置版差異・新ビルドでの実機確認 |
| QA2-KEEP-PT-AGGREGATE-074 | 現行ソースにはoption suffixを解決しatomicでレシピ在庫を消費する処理が存在。再発防止テスト追加 | stock5→3専用回帰PASS | 本番版・レシピ/在庫データ差・最新実機確認 |
| QA2-FLOW-N-002 | 注文管理の429/5xx/JSON/network読込失敗を、注文一覧と独立の警告欄へ表示。手動更新の誤成功を修正 | Native/Web/TEST VM 82 checks | 新しいAPK/Web配布UIで表示確認 |
| QA2-UI-admin / QA2-NEW-VIS-002 | 注文管理の長い商品名折返し、右側価格/操作列の最大幅と折返しを調整 | 3配布面CSSチェック | 720px native機器の実際の配置/スクリーンショット |

## P0: QA2-NEW-TEN-004 / QA2-KEEP-OPR-AUTH-007 根本原因

`src/index.js` と `src/gasApi.js` の署名tokenから `storeId` を安全に導出する処理が、**request bodyでのStore ID明示** まで補っていた。結果として、改竄したBの`storeId`は拒否していても、未指定のまま認証済みAの注文差分を読めた。異店舗データ漏洩が起こったという証拠ではなく、fail-closed契約違反。今回は対象QAが実証した `getOperationsDelta` 入口で明示要求を固定した。ほかのprotected APIの明示Store ID強制を全て済ませたとは主張しない。

**自己レビュー10回（実施：コード・実HTTP/SQLite）**

1. 未指定 `storeId` を Native `ROUTES` 入口でDB呼出し前に400拒否。
2. 明示的 `null` で400拒否。
3. 空文字 `''` で400拒否。
4. 空白文字 `' '` で400拒否。
5. GAS互換 `?api=1` でも同じ欠落拒否。Nativeと独立したハンドラを検証。
6. Native token不在では業務読取せず403を返す。
7. GAS token不在ではenvelopeとHTTP403が一致する。
8. A token＋B `storeId` が両protocolで403 `tenant_store_mismatch`、データ無し。
9. A token＋A `storeId` は両protocolで200成功し、正常クライアントを破壊しない。
10. 既存 `tenant_isolation_test`、`tenant_pass3_full_api_intrusion_test`、`gas_compat_smoke_test`、`bilingual_data_test`、`bilingual_option_workflow_test` と全 `npm test` のexit0を確認。

**横展開レビュー10回（実施・非実機）**

1. Native API入口・`handleGetOperationsDelta` 関数にも二重ガードを設置。
2. GAS API入口・`dispatchDirect`の署名tenant決定と二重照合を確認。
3. Native `mobile-app/web/api.js` はstoreIdをJWTへ結び付けた `currentStoreId()` から明示送信することを確認。
4. Web production `docs/yuwaku/api.js` は `CFG.STORE_ID` を明示送信することを確認。
5. Web TEST `docs/yuwaku/test/api.js` は同様のtenant routingを確認。
6. Native注文管理/KDSの両画面が共通APIを使うことを確認。
7. Web注文管理/KDSの両画面が共通APIを使うことを確認。
8. DB側の `orders.getOperationsDelta(db,storeId)` に署名由来tenantが渡されることを確認。
9. 独立A/Bテナントの境界テストで相互アクセス拒否と通常アクセス成功を確認。
10. GAS互換・Native・多言語メニュー/オプション・基本smokeと `npm test` 全回帰を確認。

**適用保留:** Cloudflare Workerが未デプロイのため **P0は運用上OPEN/FAILのまま**。承認後も本番の匿名化されたテストリクエストでHTTP400/403と他テナント非開示を確認する必要がある。

## QA2-FLOW-N-002 / QA2-UI-admin / QA2-NEW-VIS-002

従来のエラー表示は初回だけ存在する `#loadMsg` に依存していた。注文一覧が一度描画された後にはこの要素が無く、429/5xx等がサイレントに消えていた。手動更新 `manualRefresh()` もcatchで解決されたPromiseを無条件に「✅ 更新しました」と表示していた。3配布面に、独立して存続する `#opsReadError` 警告欄・エラーコード別日英説明・成功後の消去・手動更新失敗表示を実装。長い商品名はflex列内で折り返し、価格/操作列は50%以内で折り返す。

**自己レビュー10回（実施：ソース・VM）**

1. `#opsReadError` は注文 `#list` の外にあることを3配布面で静的確認。
2. `role=alert` / `aria-live` があることを3配布面で確認。
3. 429は利用制限の文言と遅延retryを伴い、既存注文を保持するVM検証。
4. 500/503はサーバーエラー文言、同じく既存注文保持をVM検証。
5. JSON malformed/invalid responseは不正応答案内と同じ保全をVM検証。
6. 自動読取失敗が`{ok:false}`で手動更新成功と混同されないことを確認。
7. バックオフ期間中の手動更新は成功toastを出さないことを確認。
8. 回復後の正常応答で警告が消え注文一覧が更新されることを確認。
9. 日英切替で残存警告を現行言語に再表示するコードパスを確認。
10. `.row .it` 折返しと `.row .rt` flex最大幅・折返し、`npm test`を確認。

**横展開レビュー10回（実施・非実機）**

1. Native注文管理 `mobile-app/web/admin.html` に同じ警告仕様。
2. Web本番注文管理 `docs/yuwaku/admin.html` に同じ仕様。
3. Web TEST注文管理 `docs/yuwaku/test/admin.html` に同じ仕様。
4. 本番・TESTの注文管理ソースbyte一致を自動チェック。
5. 日本語429案内を3配布面で実行。
6. 英語503案内を3配布面で実行。
7. 日本語不正JSON案内を3配布面で実行。
8. 自動polled readと手動 `manualRefresh()` の両経路を実行。
9. 注文の長文と価格・提供ボタンの競合を全3配布面CSSへ横展開し静的確認。
10. Web/PWA本番・TESTのService Workerを`v279`に更新し、古いadmin.htmlを保持し続けない版管理を確認。

**回帰証跡:** `node test/qa2_flow_n_002_orders_error_regression_test.mjs`: **82 checks PASS**。新規/既存のテストを `npm test` に組込。`npm test`: exit0。新しいWeb/Nativeでの実表示・長文字幅については正式QA再実施が必須。

## 他の担当による独立10×10レビュー

- QA2-NEW-ONB-001、IZK-UT-070: `test-results/qa-v2-evidence/QA2_LOGIN_SIGNUP_IME_FIX_REVIEW_20261013.md`。自己10 / 横展開10の実施内容・物理未確認を記録。
- QA2-KEEP-OPR-PRINT-010 / RACE-042 / AGGREGATE-074: `test-results/qa-v2-evidence/WORKER2_BACKEND_BUSINESS_INTEGRITY_REVIEW_20261013.md`。自己10 / 横展開10の実施内容・過去ビルドとの不一致を記録。
- IZK-UT-071即時ログアウト: `handoff/GPT_実機テスト障害台帳.md` IZK-UT-071項、自己10 / 横展開10・142ケースと実機未確認を記録。

## 全体検証・保留

- 全体 `npm test` exit0：`test-results/izk-qa-unfixed-remediation-npm-test-20261013.log`
- Native `npm run mobile:sync` exit0：`test-results/izk-unfixed-mobile-sync-20261013.log`
- 配布整合 `npm run verify:distribution` exit0：`test-results/izk-unfixed-distribution-20261013.log`
- `git diff --check` は確認対象、既存Line-ending注意のみ（最終再確認する）。
- 正式QA stateは更新していない。現在のFAIL/WAIT_TESTは「修正済みだが旧APKのFAIL」も混在する。ソースにない修正（本番D1 migration 0045、Worker deploy、本番signup flag確認、実機受入試験等）は残件として分離する。
