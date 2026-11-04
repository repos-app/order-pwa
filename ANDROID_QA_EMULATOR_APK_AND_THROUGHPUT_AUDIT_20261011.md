# Android Emulator QA — APK / 残件 / 消化速度の読み取り専用監査（2026-10-11）

## 結論と出自

- 対象は正式2,080件を引き継ぐ `.android-emulator-run/state.json`（`runId=android-emulator-20261010103308`、`lane=emulator`、`serial=emulator-5554`、`packageName=com.izakanpai.commissionpos.uitest`）。確認した `updatedAt=2026-10-11T02:31:50.466Z` は取得時点のスナップショットであり、進捗は後続実行で変動する。先行監査のEmulator確定値はPASS 3、FAIL 56、NOT_RUN 2,021、計2,080。既存59件は独立した正式結果として保持する。
- `node scripts/android-qa-apk-readiness.mjs` を読み取り専用で実行。`mobile-app/web` 100ファイル、`android/app/src/main/assets/public` 102ファイルを検査し、ソースに対応する100ファイルのSHA-256差分は **0**。ただし `android/app/build/outputs/apk/debug/app-debug-ui-smoke.apk` の最終更新は **2026-10-08T11:48:44.185Z**、ソース・同梱資産の最新更新は **2026-10-11T02:59:15.987Z**。よって `locallyFreshCandidate=false`。102個のうち余分な2ファイルはこの検査でソースとの差異を意味しない。
- この監査は **実際にEmulatorへ導入されたパッケージのversionCode、署名、APK SHA-256、内部資産ハッシュを取得していない**。インストール版の一致は未証明。別の場所にあるAPKが新しい可能性も除外できない（既存readinessツールの探索対象は上記debugフォルダ）。APKの日付やソース一致だけで修正後PASSを計上できない。
- 実機用 `.android-real-device-run/state.json` とEmulator用runnerは別。`node scripts/android-qa-recipe-queue.mjs next-approved 5` の **approved=212 / approvedPreviouslyCompleted=212 / eligibleNotRun=0** は実機側正式runnerに対する値であり、Emulatorで212件実行済みと解釈してはいけない。recipe queueの出自は `sourceRunId` とmanifest fingerprintで固定されるため、Emulatorの別runIdへそのまま流用できない。

## 未消化ケースの候補と優先順位

| 優先 | 正式ケースID / 領域 | 可能な観測と実行前提 | PASSのゲート |
|---|---|---|---|
| A | `PT-CTL-0051` (`clock.html`, `mMemo`)、`PT-CTL-0140/0142/0143` (`inventory.html`, `mvQty/mvCost/mvReason`) | 画面内の正規モーダル表示後、対象フィールドの可視性・サイズ・IME・スクロール位置を観測。打刻、入出庫、廃棄の確定操作は不可 | manifestと現行NOT_RUN、画面経路、フィールドの実際の可視性と縦横・狭幅・キーボードを独立証明。条件付き欄をCSSで強制表示しない |
| A | `PT-CTL-0392` (`purchasing.html`, `poPickSel`) | 既存のピッカーモーダルを安全に開き、項目・レイアウトを読み取り、キャンセルする | `confirmPoPick` による行追加を禁止。選択UIが暗黙に値を確定しないことを独立確認 |
| B | `PT-CTL-0204/0208` (`menu_editor.html`, `mCatNew/mCatEnNew`) | 「新規」カテゴリの条件で初めて欄が可視。保存・既存商品のカテゴリ変更なしで露出できる条件を先に監査 | 初期 `display:none` からの移行、未保存値の巻き戻し、完全レイアウト証拠が必要 |
| 保留 | `PT-CTL-0083` (`data_admin.html`, `delPhrase`)、`PT-CTL-0261/0267/0268/0269` (`printers.html`) | 全件削除、設定自動保存、Bluetooth切断・端末検出などの危険な副作用がある | 現状は自動実行対象外。安全な合成fixture・観測専用方式の独立審査が必要 |
| B | `profit_sim.html`、`settings.html` の未判定INPUT/CONTROL | PH人件費、料金条件、機能・権限に依存する非表示欄を `android-qa-input-eligibility.mjs` の区分で診断 | 実CSS、国・機能・権限・モーダル・経路の一致を確認。非表示だけでFAIL/PASSにしない |
| C | 正式INPUT全般 | `android-qa-emulator-input-coverage.mjs` は7段階（boundary、invalid、save、reload、backReopen、persistence、failureAtomicity）の証拠を要求 | 単純なDOM属性、静的HTML、1枚のスクリーンショットだけでは合格不可。保存試験は専用店舗・隔離データが前提 |

上記の各IDは **実行候補** であり、最新のEmulator runner上で各IDが現在もNOT_RUNかは実行直前に再照合する。実機側未承認の詳細は `docs/ANDROID_QA_PENDING_RECIPE_REVIEW_20261011.md` に13件（うち当時NOT_RUN12件、既存FAIL1件）として整理済み。承認フラグを一括変更しない。画面別未消化母数や新規候補の厳密件数は、独立runnerの最新stateを解析してから記載すべきであり、この監査では未確認の値を推定しない。

## Fixtureと実行ゲート

1. 端末所有権をEmulator担当に限定し、`emulator-5554` の前面専用QAパッケージ、認証済みWebView、CDPターゲット一意性を確認。旧driver/旧APKで得た証跡は更新版の再検証証拠に流用しない。
2. 現在のrunnerの `runId`、case ID、family、screen、target、scenario、expected、statusを実行時に固定して照合。別runnerや変更済みcase定義への結果反映を拒否。
3. `QA_TEST_STORE_*` 形式の専用テナントと自店舗データだけを使用。必要なメニュー、在庫、購入、会員、予約、売上、国別料金・言語・権限などをケースの前提表に分離。外部店舗参照・本番データ書込を禁止。fixtureは準備済みであることと、端末から認証済みで読めることを区別。
4. 読み取り専用検査は、UIに到達できる画面に限り、可視性・要素寸法・画面内hit test・狭幅・回転・IME前後の証拠を確保する。副作用のある `onchange/oninput`、通信、保存ボタン、全削除、機器接続を自動操作しない。
5. APK切替時はパッケージ名、署名、versionCode、APKと同梱資産のSHA-256、ビルド出自、およびインストール済みパッケージの同一性を所有者が証明する。更新前後の正式結果を混同しない。

## 期待速度の現実的な扱い

現在の **正式59件** を高速化コードの成果とは呼べない。処理速度は `PASS+FAIL+BLOCKED` の固有ID増分 / 実測経過時間で測り、SKIP・再巡回・NOT_PROVEN・コード追加・静的テストを分子から除外する。インストール版未確認・認証待ち・fixture不足の間は **0件/時** も現実的であり、2,021件を単純に除算して完了予測してはならない。

能力が確認できた後の計画上の目安は、同じ画面で安全な短時間読取ケースを連続検査できる場合 **5〜20正式判定/時**、複合INPUT、fixture、回転、再ログイン等の複数証跡を要する場合 **0〜5件/時**。これは測定結果ではなく試運転後に更新する仮置きのレンジであり、保証値ではない。次の最小評価単位は安全な同一画面5ケースとし、開始/終了の正式runner固有ID差分、端末稼働時間、SKIPと未証明件数、1件ごとのビルド出自を並記して改善効果を測る。

## この監査の操作範囲

既存資料・ソース・runner JSONの読み取り、既存readinessと承認キューのread-only CLIのみ。端末、ドライバー、プロセス、runner、レシピ、APK、DB、Git履歴、デプロイには変更を加えていない。
