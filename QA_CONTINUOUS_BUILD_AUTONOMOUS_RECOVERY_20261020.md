# 継続改版時の Android 実機 QA: ビルド番号非依存と依存更新の自律復旧

## ユーザー確定方針（2026-10-20）

- すべての店舗は本番開始前のテスト店舗。QAデータ・設定・ソースの調査と修正を追加督促なしに進める。
- **アプリのビルド番号は何番でも有効**。以前の承認・テストレシピの versionCode と、新しく実機へ導入したAPKの番号が異なるだけではQAを拒否しない。
- ただし、実機APKのパッケージ名、既存QA用の信頼済み署名証明書、正確なAPK SHA、端末serial、公式RUNNING claim、ユーザーが停止したフラグ、独立D1・PNG・fixture cleanupは別条件として厳守。未知の署名を無条件に許可しない。
- 依存ファイルの改版は正常な開発行為。SHA変更の検出だけで止めず、該当グループを単体回帰検証し、裏付けのある依存pinと関連レシピをトランザクションで更新する。失敗時はロールバックし、同じ失敗の再試行ループは禁止。

## 原因

1. qa-v2-realme-user-authorized-admission.mjs の `r.build!==build` が古いレシピを拒否していた。
2. 同ファイルの `*.v<currentBuild>.approved.json` のファイルフィルタで、過去ビルドのケース定義がそもそも選ばれていなかった。
3. qa-v2-realme-unattended-pilot.mjs は最新の既知ビルドpinを選んでおり、次のビルド番号を事前登録しないと計画と実機が不一致になり得た。
4. pair-module-repin.mjs は更新時の複数ファイル依存や回帰テストの自己参照pinで止まるパターンがあり、履歴ケースの依存SHA不一致が蓄積していた。
5. formal-queue-supervisor.mjs は stdout/stderr を1つの出力に混ぜ、さらに長いJSONを38,000文字で切り詰めていた。SDKやNodeの警告で正しい計画が読めなくなる可能性があった。

## 対応（実装済み）

- user-authorized admission: 過去の承認済みファイルを含む全ビルドのケース定義を走査する。case単位で最新の定義を選び、driver/data/fixtureのpin検証が成功すれば、**その実行で検証されたAPKのbuildとmanifestSHAに動的再バインド**する。
- ケース子プロセスのapprovedCaseBuild()も同じ動的APK証明書を再検証する。これにより親の計画だけが通り、子の古い固定build-pinファイル要求で止まる問題も解消。
- APK実体: 実機 Realme の package dump と pm path、ADB pull、Android SDK apksigner（正しい署名と信頼済みポリシー）、aapt（パッケージ名・versionCode）、SHAを照合する。**有効なversionCodeに事前登録の上限・allowlistを設けない**。ビルド番号・内容の変更後も、新しいAPKを独立検証して受け付ける。
- 安全条件: 未知の署名証明書、違うpackage、照合途中で交換されたAPK、別店舗/他deviceは拒否する。旧ビルド用のapproved JSON、公式PASS、正式Runnerのstate、現在のAPK自体を自動で書き換えない。
- pair-module-repin: 実際のオフライン回帰が成功したときだけ直接レシピ参照を含めて更新。旧証跡バックアップ、現ソース再比較、失敗時の全体ロールバックを付ける。QA定期タスクでbounded実行し、失敗したグループは次の具体的調査へ。
- formal-queue-supervisor: 計画JSONのcapture上限を1MBとし、stdoutとstderrを分離。stderr警告や長い候補一覧があってもJSONが壊れない。

## 2026-10-20 11時台 実測

- Realme実機build `910026` をAPK実体から独立に取得・署名・package・SHA検証: **成功**。
- ビルド番号相違 `BUILD_MISMATCH` による正式計画候補の拒否: **0件**。
- user-authorized候補: **202ケース**、ただし全202ケースが `QA_PAIRED_RUNTIME_ADAPTER_REQUIRED` の実行プロバイダー未完成で保留。
- stale依存モジュール: 初期調査の120件から、修復作業後は **正式計画で30件拒否**。モジュール再検証した115ケース分は元の公式台帳を変更せず準備を修復。
- テスト: 動的APK・ケース入場・子プロセス証明・正式キューJSON関連43件PASS、依存グループの単体回帰13件PASS。
- 実機APKの署名を親で検証した後、子側approvedCaseBuild()でも同じビルドとAPKの再証明に成功。
- 公式台帳のPASS **380件**、Android未完了 **444件**。これは改版受け入れ・ソース準備の改善であり、正式QA結果を増やしたものではない。

## 継続して残る根本ブロッカー

共通のclaim-scoped物理runtime `paired-physical-v1` が未登録。実ADB操作、
真のスクリーンショット、署名付きbefore/after、独立D1、checkpoint/legacy oracle、
fixture cleanupを公式Runnerへ接続して、初めて正式PASS/FAILを記録できる。
ビルド番号やソースSHAを機械的に無視して、この判定gateを迂回しない。
