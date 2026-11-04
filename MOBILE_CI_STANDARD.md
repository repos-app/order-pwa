# izakanpaiを基準にした全アプリ共通標準

**正規規格：** [Mobile CI Standard v1.0.0](../standards/mobile-ci/v1/README.md)

**3アプリへの適用状況：** [CURRENT_APP_ADOPTION_20261012.md](../standards/mobile-ci/v1/CURRENT_APP_ADOPTION_20261012.md)

本規格はizakanpai専用の「自動QA runner」やテナント隔離処理を他アプリへ移植するものではない。izakanpaiが実践しているビルド追跡・固定署名鍵・配布検証・証拠管理・許可境界を、3アプリと将来のアプリに横展開する。

本作業は`ci:standard`等の**独立したCI監査コマンド**の追加のみ。izakanpaiの既存Android/iOSワークフロー、Firebase/TestFlight配布、QA公式結果、稼働runnerは変更していない。共通規格の導入を理由に現行QAを止めたり、PASS/FAILを変更したりしない。

通常の静的監査：

```powershell
npm run ci:standard
node --test standards/mobile-ci/v1/mobile-standard-gate.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File standards/mobile-ci/v1/sync-vendors.ps1
```
