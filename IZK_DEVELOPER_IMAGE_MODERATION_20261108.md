# Izakanpai Developer Console：画像公開停止・再開（2026-11-08）

## 受入条件と現在の状態

**ソース実装完了・ローカル検証済み／本番反映・正式実機QA未実施。** 商品・会計・売上行は変えず、店舗別の対象メニュー画像のみ公開停止。正当な事情があれば原本を復元可能。Developer Consoleの二重専用キー／ログインパスワード・Cookie/CSRF・localhost制限を再利用。

1. 店舗選択→商品名・ID検索→画像と公開状態を一覧表示。R2の店舗・環境・画像種別の所有情報が正しい場合だけ公開停止・再開可能。
2. 停止・再開とも8〜500文字の理由と厳密な入力 `BLOCK 店舗ID 商品ID` / `RESTORE 店舗ID 商品ID` を要求。既存の `op_log` に操作前の意図と処理確定状態を店舗別・実行者区分付きで保存。ローカル `image-moderation-audit.jsonl` に最小の実行履歴を保存。
3. Control Planeのprivileged `operator.internal`→既存プライベートService Binding→実店舗にピン留めされたD1/R2のルート以外から操作不可。公開POS RPCや通常店舗ユーザーは実行できない。旧店舗/別店舗、URL変更済み、R2所有者不明、監査DB不正・未接続をfail closed。
4. 停止ではR2画像の`moderationState=blocked`を保存し、公開 `GET /images/...` は404・no-store。原本は削除せず同URLのまま保持し、再開時には `active` に戻して200を検証。
5. 停止済みの**同一バイト列**を別名で再アップロードしても、プライベートSHA-256マーカーがある限り拒否。停止画像URLを新商品へ再割当する操作も拒否。既存商品の画像を変更せず価格・表示名を編集する場合は止めない。
6. 新規メニュー画像は `Cache-Control: no-store` に変更。ライセンス問題への対応は法的判断を自動化せず、申立内容を管理者が確認する。

## 主な変更

- `src/menuImageModeration.js`：権限分離されたR2公開状態／操作履歴／検索・停止・再開。
- `src/imageStorage.js`：公開配信拒否、キャッシュ抑制、原本SHA-256拒否マーカー。
- `src/index.js`, `src/controlPlaneWorker.js`, `src/localProvisionerBridge.js`：店舗境界付きの専用Control経路。
- `src/admin.js`：停止済み画像URLの新規紐付けを拒否。
- `tool/developer-console/{bridge.mjs,server.mjs,index.html,app.js,app.css}`：ローカル専用管理UIと詳細操作・履歴。
- 既存DB `menu_items`、`op_log` とR2のメタデータを再利用。**共有DB migrationなし**、新たな公衆向けAPIなし。

## ローカルQA実績と証拠

- `node --test test/auto-ci/developer-image-moderation.test.mjs`：**11/11 PASS**。認証・ルート境界、R2停止/配信404・解除/配信200、元画像バイト一致、同内容再アップロード拒否、別店舗0件、偽URL/所有者拒否、DB書込異常時にR2不変、既存共通Control Router経由配信も拒否、CSRF、管理UI契約、実際のメニュー保存で停止画像を再紐付け拒否、停止／解除のR2部分失敗・再試行で整合復旧、R2の拒否マーカー検査不能時のproduction fail closed。
- `node --test test/auto-ci/developer-image-moderation.test.mjs test/developer_console_test.mjs test/menu_image_generation_credit_test.mjs test/auto-ci/menu-google-user-rights.test.mjs test/menu_editor_save_single_roundtrip.test.mjs test/image_fetch_regression_test.mjs test/menu_image_feature_ui_test.mjs`：**83/83 PASS**（上の11を含むため、単純加算しない）。AIポイント、画像表示、Google画像手動利用権限確認、既存Consoleとメニュー保存回帰。
- `node test/common_tenant_gateway_e2e_test.mjs`：**251チェックPASS**。既存の複数店舗共通Gateway、R2/DB分離と認証回帰。
- `node test-results/developer-image-moderation-browser-20261108.mjs`：Chrome 1280px・390pxでログイン→店舗選択→停止→再開の**2シナリオPASS**。画像：`test-results/developer-image-moderation-1280-20261108.png`、`...-390-20261108.png`。既存店舗表のモバイル横スクロール逸脱をCSSグリッド幅で解消し、後者の横幅はみ出し0で再検証。
- `node scripts/ci/critical-ui-preservation-gate.mjs`：共通UI保全PASS。
- 既存esbuildの `bundle:true / platform:browser / format:esm / write:false` で `src/index.js`（約1.25MB）、`src/controlPlaneWorker.js`（約130KB）、`src/localProvisionerBridge.js`（約3KB）の**3エントリ構築PASS**。実本番配布／Cloudflare遠隔の起動確認ではない。
- 既存`node test/local_smoke_test.mjs`：再実行で **582/582 CHECKS PASS、0 FAIL**。古いテストDBフィクスチャに不足していたコミッション列を正本migrationで補完。別JSファイルから提供される `window` 関数をテスト側が未定義と誤判定していたため、実際にHTMLが参照するローカルJSを読み取る共通検査へ修正。Hosted PROD/TEST `settings.html` の相違は改行のみ（空行1件と孤立CRLF3件）と証明し、TESTミラーを正本とバイト一致させて解決。元のFAIL履歴は消さず、最終再実行のPASSを別に記録。
- 本件修正範囲の `git diff --check` は **PASS**。別作業のコミッション関連ファイルには変更差分があるため、全repoの差分状態やCI全件PASSを主張しない。

## セキュリティ・運用上の限界と残件

- **本番Worker/実R2・D1の書き込み・配信停止の観測は未実施**。Developer Consoleのコード追加は本番への反映ではない。Control/Common Gateway/ローカルConsoleへ同梱して正式なリリース承認後に配布・検証する必要がある。コミット/プッシュ/デプロイ/モバイル・配布ビルド/実機QAは未実施で正式PASS増分0。
- **ビルドの区別**：上記のローカルJavaScriptバンドル構築のみ実施。Windows Console配布パッケージ生成・iOS/Androidアプリビルドと本番リリースは未実施。並行編集で多くの未コミット差分があるため、別機能まで混ぜて本番Workerへ投入しない。
- **過去のブラウザキャッシュ**：公開済みの画像は旧`max-age=31536000, immutable`でクライアントに残存し得る。新しいno-storeで将来のキャッシュを抑制するが、すでに端末に保存された写真の遠隔削除はできない。
- **外部画像URL**：第三者ホストへ直接リンクされている画像は、IzakanpaiのR2を止めるこの画面では制御できない。店舗側で差し替え・削除し、必要に応じて外部提供元へ連絡する運用が必要。
- **画像改変**：同一バイトの再アップロードは拒否できるが、再圧縮・切抜きした別バイトの再登録を自動検知する仕組みではない。申立は人が調査する。
- **部分失敗からの復旧**：画像状態とプライベートSHA-256拒否マーカーを必ず同時検証し、停止／再開処理がR2途中失敗した場合は再実行時に未完了側を補完する。表示が既に希望の状態でも、拒否マーカーが食い違えば成功と即断しない。成功済みの冪等再実行にも監査記録を残し、記録が失敗した場合は `auditComplete=false` で通知。
- **削除申立受付**：既存の `admin@izakanpai.com` を利用。申立の真正性・対象画像・店舗・停止理由と対応履歴を確認し、停止・再開を実施する。法的な免責を保証する機能ではない。

## 自己レビュー10観点・横展開10観点

| 区分 | 実証・結果 |
|---|---|
| S01 操作認証 | Consoleセッション、CSRF、Control専用二重鍵が必要。PASS |
| S02 店舗単位 | プライベートGatewayのピン留めとR2 owner metadata照合。PASS |
| S03 操作条件 | reasonと厳密確認文句の否定ケース。PASS |
| S04 対象一貫性 | 商品ID+画像URLが変更済みなら409拒否。PASS |
| S05 停止配信 | GETで404、別店舗への影響なし。PASS |
| S06 復元配信 | 原画像のバイト同一性、再開時200。PASS |
| S07 再登録防止 | 同一バイトの別キー再アップロード拒否。PASS |
| S08 監査 | 停止前のop_log必須、理由記録、監査障害時R2書込0。PASS |
| S09 データ保全 | メニュー表・注文/会計行を更新せず、別店舗D1ログ0。PASS |
| S10 UI/XSS | DOM textContentのみ、CSP維持、入力制限。PASS |
| H01 Control Router | 公開GETとprivileged POSTが別ルート。PASS |
| H02 Shared Gateway | 既存common gatewayの251チェック。PASS |
| H03 POS API | 公衆向けAPIではmoderation命令を受けない。PASS |
| H04 R2 | 既存画像配信・private資料拒否を維持。PASS |
| H05 メニュー編集 | 停止済みURLを新規関連付け不可、商品本文編集は継続。SOURCE+対象回帰PASS |
| H06 画像生成 | AIポイント・画像生成12ケース回帰PASS。PASS |
| H07 Desktop Console | Chrome 1280px操作経路PASS |
| H08 Mobile Console | Chrome 390px操作・非横溢れPASS（iPhone実機未確認） |
| H09 削除系既存機能 | Developer Console既存削除テストPASS |
| H10 Google画像連携 | 前段の手動権限確認API/UI14件回帰PASS |
