# IZK-UT-076 — 配布済みAndroidの割引金額最小値が現行仕様と不一致

- 受付: 2026-10-15 PHT、Realme RMX3938、Android QA APK `910017`、テスト専用店舗 `teat`
- 重複点検: 現存文書の `IZK-UT-001`〜`075`、既存割引値の技術報告 `test/plans/QA_V2_REALME_DISCOUNT_FULL_DRIVER_20261014.md` を調査。旧技術報告は**同じ修正前不一致**を指摘済みであり、本票はその配布版未反映と現行実機根拠を追記する案件。既存 `IZK-UT-073/074`（レイアウト・揺れ）とは別の入力値・金額整合性。
- 暫定区分: **アプリ配布版／UI入力検証の不一致、P1、OPEN**。サーバーが実際に値を永続保存したとは判断していない。
- 正式QA: `QA2-KEEP-PT-INP-0344` は引き続き `NOT_RUN`。今回の正式ドライバー結果は `INCOMPLETE` であり **FAIL / PASSいずれも追加せず**。

## 技術的に確定したこと

1. Immutable配布APK `qa-build-registry/apks/android-qa-v910017-680211cfad5a.apk` SHA-256 `680211cfad5ab06874809de1a097222790911fdb59996bd7bd638f52e2f70b3d` 内の `assets/public/settings.html` SHA-256 `fb3e84d9fc3d0c59ae8f8ec911d698009b517a7d1f487e175414ea33020e1850`。このファイルを ZIP から読み出し、その **`window.saveDiscountRule()` は `!rawValue || !Number.isFinite(value) || value<=0`** をチェックするが `0.01` の最小値を検査していない。HTMLフィールドは `type=number min=0.01 step=any`。保存関数は `checkValidity()` を呼んでいない。
2. 作業木 `mobile-app/web/settings.html` SHA-256 `e6fdf6d6154143042af19d45ad3b36d80bebc1d2132327cd574ead44fd135e95` では `value<0.01` を明示拒否する。`src/discountRules.js` 側も `0.01` 未満を拒否する修正が存在する。ただしこの修正は**ソースのみ**で、現在のAPKやデプロイ済みWorkerへ反映済みとする証拠はない。
3. 実機の `0344` 最新試行 `realme-0344-f56a28bb0884e572` は空欄、`0`、`-1` のネイティブ入力と `checkValidity=false` を記録して通過。その次の無効値検証で `QA_DISCOUNT_INVALID_SAVE_REACHED_NETWORK`。ドライバーは `window.API.post` を一時遮断して**実通信前のsave RPC呼出し試行**を検出した。`0.001` の再入力値が送信直前にも維持されていた個別証拠と**サーバーの応答**はまだ欠けるため、保存成功・DB破損の証拠ではない。
4. 公式元仕様は `min=0.01` かつ「**送信前またはサーバーで拒否**」。ドライバーが *すべての不正入力はRPC呼出し0件* と要求するのは必要条件より厳しい。サーバーの拒否とDB不変まで証明しない限り、ドライバーの `INCOMPLETE` はアプリの正式 `FAIL` へ自動変換できない。

## 完了条件（未達）

- QA APK/Workerそれぞれの承認済みバージョン、埋込みsettings.html SHA、配信対象ソースSHA、実際の認証済み `teat` RPC拒否挙動を**個別**に確証する。QA 910017は古いUIなので正式0344をPASSにしない。
- `0.001` / `0` / 負数 / 空欄 / `100.01` / 非数を、ネイティブ入力の保存直前の値・UIエラー・API応答（必要な場合）・変更前後の署名付き全件照合で再検証する。試験用であっても、未承認の永久保存・注文会計確定はしない。
- 固定額割引の**仕様上の最大値**が未確定。現行画面・APIの `%` 最大100は固定額の最大値を意味しない。プロダクト仕様確認が必要。
- アプリ修正の本番ビルド・デプロイ・リリースは**今回未実施**。承認済み新ビルドで正式0344を再テストする。

## 品質・横展開確認範囲

- 実施済み自己10観点: 原QA仕様照合、配布APK SHA、APK内ソース抽出、worktree SHA比較、フロント条件、数値input属性、ローカルAPI条件、実機trace、証拠SHA/原状復元、公式台帳不変。**これは10回の実機再試験ではない**。
- 関連10観点: `%`割引値、固定額割引値、0/負数、0.001、100.01、文字列/NaN、入力表示とBackend、会計派生計算、過去の割引行/他テナント、Android/iOS/Web配布面。**各プラットフォームの実機横展開はPENDING**。
- 証拠: `scripts/qa-v2-realme-0344-apk-contract-audit.mjs`、`scripts/qa-v2-realme-incomplete-evidence-audit.mjs`、`test-results/qa-v2-evidence/realme-0344-f56a28bb0884e572/`。4 PNG（720×1600）のSHAと復元SHAを検証しエラー0。

## 既知と未確定を混ぜない

`APK_UI_GUARD_GAP=CONFIRMED`、`DEPLOYED_BACKEND_0_001_PERSISTENCE=NOT_PROVEN`、`FORMAL_0344_VERDICT=INCOMPLETE_NOT_RUN`、`QA_DRIVER_STRICTER_THAN_SPEC=CONFIRMED`、`LOCAL_APP_PATCH_PRESENT_NOT_SHIPPED=CONFIRMED`。
