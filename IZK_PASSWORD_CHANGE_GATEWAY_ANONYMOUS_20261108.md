# IZK-UT-148｜ログイン画面からパスワード変更で401になる

日付: 2026-11-08 PHT。依頼証跡: ユーザー提供画面写真（本書に資格情報・画像の複製は保存しない）。

## 完了条件と原因

- ログイン済みでなくても、ワークスペースID、ログインID、**現在のパスワード**が正しければ変更可能。
- 不正な現在のパスワードは変更不可。許可対象は `changePasswordByLogin` 一つだけ。
- 別店舗への移動、偽トークン、他の管理APIを開放しない。成功時に過去セッション失効。

原因: `src/gasApi.js` の `DIRECT_PUBLIC_ACTIONS` は `changePasswordByLogin` を公開（現在パスワード本人確認・IP+IDベース回数制限あり）として定義している。一方、その前段 `src/commonTenantGateway.js` の `ANONYMOUS` に同アクションがなく、`chooseVerifiedStore` が `!signedStore` に対して `unauthorized` を返していた。`mobile-app/web/api.js` / Hosted `api.js` は `unauthorized` を「ログインの有効期限が切れました」と表示するため、ログインしていない状態で矛盾したメッセージとなった。

修正: `src/commonTenantGateway.js` の `ANONYMOUS` に **`changePasswordByLogin` のみ追加**。パスワード認証と回数制限は従来のテナントPOS処理を使用。UI、トークン、サーバーの本人確認方式を変更していない。

## 修正前の再現と修正後の実行証跡

- `node --test test/common_tenant_guest_route_boundary_test.mjs`：追加した未ログインのテストが**修正前に1 FAIL**（`chooseVerifiedStore` の `unauthorized`）、修正後 **13/13 PASS / exit 0**。
- `node --test test/common_tenant_change_password_without_login_e2e_test.mjs`：実 `Gateway→POS→GAS互換→物理分離D1` を既存のin-memory fixtureで実行し、**1/1 PASS / exit 0**。誤った現在パスワード拒否、正しいパスワードで変更、旧ハッシュ不一致、他店のハッシュ不変、旧セッション失効、他店セッション保持、新パスワード再ログイン、管理RPC未ログイン拒否を検証。途中の `email_unverified` はfixture所有者に検証済み日時を設定して解消（本番仕様を変更せず）。
- `node test/gas_compat_smoke_test.mjs`：**572チェックPASS / 該当コマンド exit 0**。既存の `changePasswordByLogin` 認証・変更・旧セッション失効・再ログイン契約を含む。
- `node test/common_tenant_control_internal_boundary_test.mjs`：**8/8 PASS / exit 0**。Control専用の内部境界保持。
- 一方、従来の包括 `test/common_tenant_gateway_e2e_test.mjs` は画像公開停止機能と旧R2 fixtureの `list` 契約不一致で **FAIL**（`image_moderation_storage_unavailable`、`src/imageStorage.js`）。本件追加を包括テストから撤回し、既存のS2ローカルGateway fixture再利用による独立E2Eで検証。包括スイートをPASSと扱わない。

## 自己レビュー S01–S10（実ソース・実テスト確認）

| 観点 | 根拠 | 判定 |
| --- | --- | --- |
| S01 UI操作 | Native `toggleChgPw` から `doChangePw`、`API.post('changePasswordByLogin')` を逆引き | PASS |
| S02 既存入力引継ぎ | Nativeは `storeId` と `loginId` を送信。`cpWorkspace` と `cpLoginId` を検査 | PASS |
| S03 UIエラー一致 | APIの `unauthorized` → 日本語の「ログインの有効期限が切れました」を確認 | PASS |
| S04 根本の遮断箇所 | `chooseVerifiedStore` の `!signedStore && !ANONYMOUS.has(action)` が401相当を発生、修正前にテストで再現 | PASS |
| S05 最小差分 | 匿名許可集合に `changePasswordByLogin` 一件だけ追加、管理RPC設定を変更しない | PASS |
| S06 Backend公開契約 | `src/gasApi.js` `DIRECT_PUBLIC_ACTIONS` と `dispatchDirect` 両方に当該actionが既存 | PASS |
| S07 本人確認 | `verifyPasswordHash(oldPass)` が不一致のとき `wrong_password` を返すE2E | PASS |
| S08 変更前回数制限 | `consumeGenericRateLimit` の `storeId + loginId + clientIp` 使用をソース確認 | PASS（ソース、制限到達ライブ負荷テスト対象外） |
| S09 DB原子性 | `db.batch` のハッシュ更新とセッション無効化。変更成功E2Eのハッシュ・失効readback | PASS |
| S10 別店舗保護 | 複数物理テナントで一店舗変更後、他店舗のハッシュ・sessionを独立readback | PASS |

## 横展開 H01–H10（個別に対象を確認）

| 観点 | 根拠 | 判定 |
| --- | --- | --- |
| H01 Native ホーム | `mobile-app/web/index.html` 変更フォーム送信・トークン非依存 | PASS |
| H02 Native 管理 | `mobile-app/web/manage.html` 同一経路、ストアID付き | PASS |
| H03 Hosted本番 | `docs/yuwaku/manage.html` 同名ActionとID+旧パスワード送信 | PASS |
| H04 Hosted TEST | `docs/yuwaku/test/manage.html` Hosted本番と同名Action | PASS |
| H05 Public Router | `src/hybridPublicRouter.js` の `requestStoreId` → Control転送 → 物理Gateway連携をソース追跡 | PASS |
| H06 共通Worker | `src/commonTenantGatewayWorker.js` は変更対象Gatewayの `fetch` を呼ぶ | PASS |
| H07 店舗不一致 | 有効な別店舗トークン+指定店舗不一致は既存 `tenant_store_mismatch`。境界テストPASS | PASS |
| H08 偽トークン | 署名されていないトークン付き変更は従来どおり `unauthorized`、境界テストPASS | PASS |
| H09 他機能の非開放 | `rpc`、`saveSettings`、`saveEmployee`、未登録類似 `changePassword` が匿名で拒否される | PASS |
| H10 Auth/DB区分 | GAS互換の旧パスワード判定・従来session失効を不変としたまま実バックエンドE2Eで再ログイン確認 | PASS |

## リリースと未確認事項

未コミット・未Push・本番Gateway未deploy・Nativeビルド/配布なし。現行端末での再試験、QA本人判定も未実施。**正式ユーザー実機QA PASS増分0**。本番実機の症状は配布まで残る。本件はWorkerソースの修正であり、iOS/Android画面構造の変更ではない。ほかの共有作業者の未コミット変更は保全した。
