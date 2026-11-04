# IZK-UT-087｜物理店舗分割後のAndroid管理ログインをCORSが遮断

## 再現と事実

- 発見2026-10-17、Realme RMX3938 Android、QA APK910019、QA店舗`teat`。
- Windows DPAPIに保存済みのQAログインは本番APIへ認証成功する。RealmeのNativeログインは`[Failed_to_fetch]`でHubに入れなかった。
- Android`logcat`は公開API応答が`Access-Control-Allow-Origin`を欠くためWebView CORS拒否と記録。Wi-Fi・DNS・Cloudflareへの独立通信は正常。
- 公開Hybrid Router→Control Plane→店舗Workerへ送った結果のうち、Controlのエラー応答はpublic CORSを持つとは限らず、Native WebViewが本来の業務エラー・稼働状態を読めない。公開Routerの最外側のResponseでCORSを保証するのが根本対応。

## 本番反映／検証

- **2026-10-17明示承認済みCORS限定デプロイ**。Cloudflare公開Worker`izakanpai-api`、旧version`85d31263-22fc-4b70-b8c0-0eaa7dc80606`を直接ダウンロードし、元配布ソースにCORS最外側修正のみ差分を与えた。現行共有作業ツリーを直接デプロイしていない。
- 新公開version：`8259a993-cc7b-4495-8c3d-fe800e589d13`、Cloudflare100%稼働再確認。
- 本番Worker由来の元／修正バンドル比較＋10/10回帰PASS、元業務処理・元HTTP statusは不変。別店舗Worker/CONTROL/PROVISIONER/D1/APKは変更していない。
- 公開APIの非実在ログインのCORSヘッダーとエラー`auth`を実HTTP確認。Realme WebViewから公開APIの正常なJSON読取も確認。
- **残件**：Realmeの管理ログイン成功とログイン後の14件正式QAの再実機確認。デプロイ後の実機自動ログインを試みる操作は安全性チェックに拒否され、実機ログイン成功の証明はない。新15件は正式FAIL1（IZK-UT-081）／NOT_RUN14。今回の修正をQA正式PASSと取り違えない。

10回自己・10回横展開のコードレビュー内容、ビルド・真正性・コマンド記録は`handoff/qa-collaboration/QA_R15_AUTH_CORS_ROOTCAUSE_AND_DEPLOY_REVIEW_20261017.md`。追加テスト`test/live_cors_published_bundle_test.mjs`。
