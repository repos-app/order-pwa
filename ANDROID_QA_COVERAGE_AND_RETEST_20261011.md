# izakanpai Android QA — 2,080件カバレッジ・SKIP原因・再検証手順

## 運用境界

この資料は既存runnerと稼働中のAndroid実機/Emulatorを**変更しない**調査・実装結果。今回の作業から、runnerリセット、実機/Emulator操作、ログイン、ビルド、APKインストール、commit、push、deployを行っていない。数値は確認時点のスナップショットであり、常に動く正式runnerの最新値に置き換えること。

## 正式2080件の能力区分（2026-10-11 10:13 PHT付近）

`node scripts/android-qa-coverage-audit.mjs` は、正式runnerのユニークな全2,080 IDを読み取り専用で分類する。実測結果は以下。

| 自動化区分 | 件数 | 意味 |
|---|---:|---|
| 既存の承認済み実行ハンドラーでカバー | 205 | 承認されたレシピと実装がある。**PASS保証ではない**。内訳: PASS51 / FAIL98 / SKIP50 / NOT_RUN6 |
| 自動化処理の追加が必要 | 562 | 到達可能画面に未実装の複合テストがある。静的・単一DOM観測だけでは正式PASS不可 |
| 実機・複数ステップ操作などが必要 | 814 | OPERATION/CANCELなど、完全なエンドツーエンド証跡や手動操作が必要 |
| 認証・通信・権限・時間・複数端末等の環境依存 | 499 | QA専用のテスト環境や前提の準備が必要 |

レシピの件数は並行QAで変動する。**10:18 PHT**には登録済み218件、承認済み205件、未承認13件になり、承認済み205件は `PASS51 / FAIL98 / SKIP56 / NOT_RUN0` に移行した。10:13時点の承認済み未実行6件は、10:18にはすべてSKIPとなっていた。どちらも実機PASSの追加とは限らないため、これらを別の正式結果へ加算しない。以後の優先順位選定では現在のrunnerと認定レシピを必ず再読込する。

正式runnerの `SKIP` は判定不能・延期扱いで、PASSや修正完了ではない。数値報告はPASS/FAIL/BLOCKED/SKIP/NOT_RUNを別々に示す。完了率は `PASS+FAIL+BLOCKED` を分子にする。`SKIP`を分子に足さない。

## SKIPとNOT_PROVENの原因

`node scripts/android-qa-skip-diagnostics.mjs` は両レーンの監査イベントと正式SKIPをケースID・端末種別・画面・理由で統合し、重複試行を排除する。分析で優先度が高いもの:

1. **profit_sim.html**：国設定のPH労務計算領域、入場料などの条件付き入力欄。物理端末で23 ID / 58試行、Emulatorで20 ID / 35試行に `input_not_visible` / 完全な入力欄証跡不足が集中。非表示は仕様条件の可能性があるため、表示を強制せず、国/機能設定をQA前提に明示する。`inputEligibilityPhase` を追加して条件付き非表示・DOM未存在・無効・読取専用を区別する。
2. **settings.html**：物理8 ID / 26試行、Emulator8 ID / 14試行。複数のカード/設定項目が条件付きで表示されるため、サブ機能・店舗権限の前提を確認する。
3. **takeout.html**：物理4 ID / 16試行。注文形式/設定依存の入力項目について、対象画面の実際の可視化手順と完全な操作証拠が必要。
4. **画面レイアウト系SKIP**：指定済みの画面サイズ、縦横、フォーカス/IMEやコンテンツ量の全証跡が必要。単発スクリーンショット/DOM観測だけでPASSに変えない。

SKIP理由は**証跡の不足分類**であり、UIバグだと確定した意味ではない。複数の同原因ケースは根本原因を修正してから個別に再検証する。

## 実装した安全な改善

- `scripts/android-qa-route-priority.mjs`：既存の承認済みレシピ・読取りのみで証明できるFAIL候補・正式画面レイアウトの残件数で巡回順を優先する。すべての候補画面を残す（検証省略や偽PASSなし）。`scripts/android-qa-windows-driver.mjs` の広域スイープで使用。
- `scripts/android-qa-input-eligibility.mjs`：入力開始できない理由を `input_hidden_ph_labor_conditional`、`input_hidden_entry_fee_conditional`、`input_hidden_extension_fee_conditional`、`input_readonly_calculated` 等に分離。`NOT_PROVEN`以外の正式判定はしない。
- 条件付き非表示判定は、対象の祖先に条件クラスがあるだけでは成立しない。**その条件付き祖先自身の実際のCSS displayがnoneである場合のみ**条件非表示の理由とし、他の祖先/不明CSSによる不可視は `input_css_or_ancestor_hidden` に分類。`retrySignature` は新しい判定処理・再試行ポリシーの変更を認識する。国・機能設定を勝手に変えない。
- `scripts/android-qa-coverage-audit.mjs`：全2,080件の自動化能力を監査。`cases[]` には各IDの根拠があり、未対応ケースを優先度順に並べる。
- `scripts/android-qa-skip-diagnostics.mjs`：公式SKIPと端末ログの原因・履歴を統合。
- `scripts/android-qa-apk-readiness.mjs`：Android取り込み済みWeb資産とソースのSHA-256整合、ローカルAPK更新日時を監査。
- `docs/ANDROID_QA_PENDING_RECIPE_REVIEW_20261011.md`：未承認13件を個別に静的レビュー。`PT-CTL-0083` の全件削除UI、`PT-CTL-0261`/`0267` の設定自動保存、`PT-CTL-0268` のBluetooth切断等、禁止すべき副作用を特定し、自動承認していない。

## APK再検証の前提（**未実行**）

`node scripts/android-qa-apk-readiness.mjs` では、`mobile-app/web` 100ファイルと、Androidに取り込まれた102ファイルとの**ソース同期差分は0件**（ソース由来ファイルに限る）だった。一方、最後の `app-debug-ui-smoke.apk` は**2026-10-08**作成で、取り込み済み画面資産は**2026-10-11**更新。したがって現在のローカルAPKは最新の画面修正を含むと証明できない。端末に現在インストールされているAPKの同一性も未検証。

今後APK反映を行う際の安全条件：

1. QA専用のBuild Variant / Bundle ID、署名・versionCode・アプリ内資産ハッシュを検証。既存のQA専用テストデータ・ログイン状態の扱いを決める。
2. 端末とEmulatorのQA所有者が共有runnerを凍結・確保し、安全な実行停止点を確認する。並行する既存runnerの結果を消去・巻き戻ししない。
3. 承認後にのみ最新ソースのQA版APKを生成し、本人の許可を得て専用端末に導入。新旧APKハッシュとソースハッシュを追跡可能な形で残す。
4. 修正済み候補FAILについて、改修バージョンで*元の正式シナリオ全体*を再実行。独立した証跡でPASS確認できた場合だけ「修正後実機PASS」に計上する。

## 次に自動化するべき領域

- 承認済みでまだNOT_RUNが残っていれば、まず複合CONTROL焦点系の実行条件を整える。**10:18時点では0件**のため、未承認13件の安全なレビューと新しい実行ハンドラー追加が先決。
- 未承認13件（うちNOT_RUN12件、既存FAIL1件）は各画面の `onfocus/onchange`、保存副作用、権限、入力欄の非表示条件を審査してから実行。runtime JSONを無断変更しない。
- 自動化未対応562件のうち、目視で完結する単純DOM検査と、状態変更・データ保存を要するシナリオを分割。部分的な静的PASSを正式ケース全体のPASSとして扱わない。
- 実機依存814件・環境依存499件について、QA専用店舗、明示的なテストデータ、ネットワーク切替、カメラ/GPS、権限、複数端末などの実行条件を整える。Store ID分離と本番非接触は絶対条件。

## 検証手順（ローカル、runner非変更）

```powershell
node test/android_qa_coverage_audit_test.mjs
node test/android_qa_skip_diagnostics_test.mjs
node test/android_qa_route_priority_test.mjs
node test/android_qa_input_eligibility_test.mjs
node test/android_qa_input_probe_expression_test.mjs
node test/android_qa_apk_readiness_test.mjs
node --check scripts/android-qa-windows-driver.mjs
```

**実機・Emulatorでこの改善コードが稼働したこと、正式2,080件の消化が加速したことはまだ確認していない。** ソースは未コミット・未push・未deployであり、既存プロセスを自動的に更新するものではない。

実行したローカル関連QAチェックは12スイートすべてPASS（新規5種の監査/優先順位/入力判定、既存のレシピ・CDP・再試行・Emulator結果同期・runnerガード等）。これは実機の正式PASS件数ではない。
