# Realme QA 0344/0363 — 修正ビルド・一時QR準備の実行結果（2026-10-15）

## 実施済み（実物確認）

1. **0344 修正済みQA APKを実際に生成。** `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-qa-android-latest-local.ps1 -VersionCode 910018 -OutputName izakanpai-qa-v910018-0344.apk` で隔離Gradle `BUILD SUCCESSFUL in 1m 8s`。既存QA APK 910017は無改変。
2. 出力: `.android-qa-autopilot/izakanpai-qa-v910018-0344.apk`、サイズ9,121,746バイト、SHA-256 `4217c335258b4ea807767379720d864a4786fd72a4114f76c255e5a308aa1e8a`。
3. `node scripts/qa-v2-realme-910018-candidate-attestation.mjs` は**11/11チェック真、verified=true**。アプリID `com.izakanpai.commissionpos.uitest`、versionCode `910018`、署名証明書 SHA-256 `8951f0c50757cff72c36a1026faa3948da5bb81c38766bfbeffcdefca9cef8be`（既存910017と一致）。埋込み `assets/public/settings.html` のSHA `e6fdf6d6154143042af19d45ad3b36d80bebc1d2132327cd574ead44fd135e95` は修正済み正本と一致し、割引値 `value<0.01` を拒否する。修正前 `value<=0` は含まれていない。
4. `scripts/qa-v2-realme-0344-freeze-source.mjs` でAndroidネイティブ入力と `mobile-app/web` 等**249ファイル**をビルド前に凍結し、ビルド後も完全一致。凍結SHA `63cbc252f65a041ab733c605fb93457fa9c0d07726caf67de57507d6694657d7`。ソースの並行編集混入なし。
5. **0363 一時QR画像の共通フィクスチャはソース準備完了。** `scripts/qa-v2-realme-qr-fixture.mjs` はスキャン不能な「TEST ONLY NO PAYMENT」PNGを生成し、`teat` の元画像が空であるときに限り署名済み設定と独立R2バイト/metadata検証を要求する。削除後もR2から消え、元の設定・所有権に一致するまで完了としない。オフライン否定系**8/8 PASS**。
6. **R2本番QAテナントの実物を読み取り専用で確認。** `node scripts/qa-v2-realme-qr-r2-teat-rest.mjs --health`: `izakanpai-images-teat` 内 `teat/gcash-qr/` 対象は現時点0件、リモートmetadata読取は成功。認証トークンは証拠に残さない。`teat`署名付き `getSettings` でQR画像未登録/QR決済OFF/現金ONを確認。
7. **Realmeを読み取り専用で照合。** 現在のQAアプリは旧 `910017` のまま。Android正式台帳 `PASS 297 / FAIL 47 / BLOCKED 2 / NOT_RUN 485 / RUNNING 0`、実行ロック残留0件。QR画像のR2リモート登録・削除や0344の正式判定追加はまだ実行していない。

## 実行に至っていない明示ブロッカー

- `scripts/qa-v2-realme-qr-checkbox-formal-case.mjs` への署名付きR2一時画像ライフサイクル結合の変更呼出しが安全性チェックで拒否された。**ファイルは未改変、リモートR2へのアップロード/削除0件**。同じ操作を別ツール・別形式に置き換えて迂回しない。テストQRが本当に削除される証明なしに0363正式テストへ戻るのは安全でない。
- 0344は原公式QAの実行基盤（親承認・source attestation・公式claim・全共有ドライバー）で `910017` に固定されている。新 `910018` を単にインストールすると他ケースの実行条件を破壊する。**今回はインストールを実施していない**。署名一致≠公式ランナーが新build対応済み。
- Backend Workerに存在する割引保存 `src/discountRules.js` が最新版と一致するかは配布バージョン未確定。**Workerを一括デプロイすると別案件の多数の未コミット変更が混入する恐れ**があり、今回デプロイしていない。
- 0344の元仕様にある「固定額の最大値＝仕様値」は未定義。どんな上限でも勝手に補完せずPENDINGとする。新APKで入力値0.01の動作を確認しても全ケース正式PASSとは呼ばない。

## 次回再開する際のゲート

1. 共有ランナーに **910018専用のビルド固定レーン**を追加し、旧910017での残り485件を壊さないことを独立検証してから端末切替または別QA端末へのインストール。
2. `0344` 規定上限の承認、API Workerの対象バージョンの確認、会計プレビューの署名付き独立計算を揃え、全て元のテストデータへ戻ることを保証した正式再試験。
3. `0363` の隔離した元QR設定保存・画像の一時追加・R2メタデータ/バイト証明・会計QR表示・完全な署名付きQR設定＋R2削除照合を**1つの正式claimのライフサイクル**へ安全に統合すること。
4. 現在の公式台帳や既存PASSを事前に書き換えず、`--plan` を経て正式テスト。`INCOMPLETE` は安全な復元証拠があるときのみclaim解放し、PASS/FAILへの偽装は禁止。

ビルド・QR準備関連の成果はワークスペース内。Gitのcommit/push・本番デプロイ・ストア配信は未実施。
