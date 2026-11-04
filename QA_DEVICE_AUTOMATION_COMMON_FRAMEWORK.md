# 実機・ブラウザ自動テスト 共通化設計（izakanpai 起点・他システム展開用）

> **2026-10-22 最優先改版：** RUNNINGが残った正式QAは、追加の人手承認を求めず、自動的に旧QA実行器を排他停止し、既存Runnerのrelease（INTERRUPTEDを正式履歴化）→NOT_RUN読戻し→QA-owned fixtureの未確認副作用照合→再claim・再実行へ進む。旧PID生存やclaim所有者の事前了承は必須条件にしない。同一実機への並行操作・別店舗データ変更・証拠なしPASSは禁止。詳細：[QA共通運用標準 v1.2.0](../standards/qa-collaboration/v1/README.md)。

> **2026-10-21 決定（全アプリ共通・最優先）：** QAのSHA照合はすべて任意の履歴情報とし、ソース・依存ツリー・ドライバー・Oracle・Manifest・APK・レビュー・証拠・キューのSHAが欠損／不一致でも実行・再開・正式判定をブロックしない。SHA再ピン留めを要求しない。代わりにケースの元期待条件、実機のアプリ・端末識別、排他claim、実操作／実PNG、API・DB独立読戻し、清掃、公式Runnerの validate / record によって実証する。元のSHA必須という旧記述より本決定を優先する。詳細：[QA共通運用標準](../standards/qa-collaboration/v1/README.md)。

> 起点実装：izakanpai `test/playwright-realme/`（2026-10-16）。運用引継ぎは `handoff/QA_PLAYWRIGHT_DEVICE_AUTOMATION_HANDOFF_20261016.md`。
> 目的：KuraPinas、PitaYasu など他システムでも同じ考え方・同じ部品でQAを自動化し、AIチャットは「書く・読む・判断する」、実行は「1コマンド」に分ける。

---

## 1. 基本方針（全システム共通）

1. **共通テスト1本＋項目データ**で増やす。ケースごとの専用ドライバーは作らない。
2. **完成の定義は実行結果**。AIの「完成しました」ではなく、実機/ブラウザでの実行と判定器の受理で判断する。
3. **自動で記録するのはPASSだけ**。全チェックPASS かつ 後片付け（復元・削除）を読み戻しで確認できたときのみ。FAILの疑いは証拠を残して人/AIが確定する。
4. **未検証はPASSにしない**。確認手段のない期待値は `NOT_VERIFIED` として残し、ケースを PASS にしない。
5. **失敗しても次へ進む**。1件の上限時間・リトライ回数を決め、超えたらそのケースだけ打ち切る。セッション全体は止めない。
6. **テストデータは自分で作って自分で消す**。既存データを変える場合は、変更前の値をサーバーから取ってファイルに保存し、APIで戻して読み戻し確認する。
7. **端末本体の再起動・電源操作はしない**（アプリ単体の再起動のみ）。
8. **残留RUNNINGは自動復旧する**。定期キュー自身が対象claimを公式releaseし、後続ケースへ継続。RUNNINGがあるという理由のみでユーザー確認待ち・全件停止にしない。旧実行プロセス停止とfixture副作用照合をせずに新たな物理操作を並列投入しない。

---

## 2. 構成（5層）

```
┌ 1. Runner（本体）：ケース振り分け／タイムアウト／証拠出力／台帳連携／復元保証
├ 2. Transport：対象への接続（Playwright desktop / Playwright _android WebView / Appium 等）
├ 3. Case table：ケースID → 何をどう検証するか（データ）
├ 4. Oracle：入力値セットと判定（純粋関数・単体テスト可能）
├ 5. Adapter：画面ごとの「作成・変更・読み戻し・再表示・削除」
└ 6. Ledger adapter：正式台帳への claim / record / release と受理判定（validate）
```

| 層 | izakanpai の実装 | 他システムで差し替える部分 |
|---|---|---|
| Runner | `realme-pilot.mjs` | ほぼ流用（台帳・接続だけ差し替え） |
| Transport | `playwright-core` の `_android.devices()` → `device.webView({pkg})` | Webのみなら `chromium.launch()`＋スマホ幅の viewport |
| Case table | `FIELDS`（set-pilot-core）、`INP_CASES`（inp-pilot-core） | システムのテストケース一覧から作る |
| Oracle | `nextValue` / `judgeProbe` / `legacyStatus` / `caseVerdict` | 入力値セットはほぼ流用可 |
| Adapter | `ADAPTERS`（settings/expense/supplier/employee） | 画面ごとに新規作成 |
| Ledger | `qa-v2-official-runner.mjs`（claim/record/release、`validateProofs`） | 台帳が無いシステムは §5 の最小台帳を使う |

---

## 3. インターフェース（共通化の約束事）

### 3.1 Adapter（1画面＝1アダプター）
```js
{
  page: 'expenses.html',              // 画面
  msg: '#msg',                        // 成功/失敗メッセージの要素
  hidden: false,                      // 値を読み戻せない秘密情報なら true
  async setup(page, tag, h, cfg)  { /* QA専用レコードを作る or 前提確認。不可なら {skip:'理由'} */ },
  async apply(page, data, value, cfg) { /* 値を入れて保存ボタンを押す */ },
  async readback(page, data, cfg) { /* API で保存値を読む */ },
  async reloadUi(page, data, h, cfg) { /* 画面を開き直して表示値を読む（取れなければ undefined） */ },
  async cleanup(page, data) { /* 削除/復元し、読み戻しで確認して true/false */ },
}
```

### 3.2 Probe（入力値1つ）
```js
{ input: 'not-an-email', expect: 'accept' | 'reject' | 'either', normalized: '保存されるべき値', label: 'format-invalid' }
```
種別ごとの標準セット：`requiredText` / `email` / `secret` / `amount` / `select` / `password`（`inp-pilot-core.mjs`）。

### 3.3 判定の結果
- probe：`PASS` / `FAIL`（理由コード付き：`INVALID_INPUT_ACCEPTED`、`READBACK_MISMATCH`、`UI_DB_MISMATCH`、`XSS_EXECUTED`、`OLD_VALUE_NOT_KEPT_ON_REJECT` 等）/ `NOT_VERIFIED`
- ケース：`PASS` / `FAIL_CANDIDATE` / `INCOMPLETE` / `INCOMPLETE_RESTORE_FAILED` / `SKIPPED_PRECONDITION` / `ERROR`

### 3.4 証拠（1ケース1フォルダ）
`<runId>/<CASE>/` に、画面PNG（`sNN-<段階>.png`）、`evidence.json`（台帳の形式）、`before-settings.json`（変更前の状態）。全体に `summary.json`。

---

## 4. 他システムへ展開する手順

1. **対象の種類を決める**
   - Webアプリ（KuraPinas、PitaYasu 等）：Playwright のデスクトップChromium＋スマホ幅。端末不要で並列実行でき、最も速い。
   - Android の WebView アプリ：`_android`（izakanpai と同じ）。WebView デバッグ有効のQAビルドが必要。
   - ネイティブ画面・iOS：Playwright 不可。Appium/Maestro（iOS は Mac 必須）を Transport に差し替える。
2. **テスト用の環境を決める**：QA専用店舗/アカウント、書き込み可の範囲、消せないデータ（レシート等）の扱い。
3. **台帳を決める**：既存の正式台帳があればその claim/record/validate を Ledger adapter に。無ければ §5。
4. **Case table を作る**：テストケースを「画面×項目×種別」に分解し、Adapter と Probe セットに割り当てる。
5. **最小パイロット**：3〜10件でリハーサル（記録なし）→ 受理判定 → 記録。ここで1件あたりの時間と成功率を測る。
6. **展開**：同じ型のケースをデータ行で追加。新しい型だけ Adapter/Oracle を足す。

推奨フォルダ（将来の共通パッケージ化）：
```
qa-kit/                      ← 共通（システム非依存）
  runner.mjs                 Runner（振り分け・タイムアウト・証拠・復元保証）
  transports/android-webview.mjs, desktop-web.mjs
  oracles/input-probes.mjs   入力値セットと judgeProbe
  ledger/izakanpai-v2.mjs, ledger/minimal-json.mjs
<system>/qa/                 ← システム固有
  cases.mjs                  Case table
  adapters/*.mjs             画面ごとのアダプター
```
izakanpai の現コードは `test/playwright-realme/` に同居しているため、2システム目に着手する時点で上記に切り出す（先回りで切り出さない）。

---

## 5. 正式台帳が無いシステム向けの最小台帳

- `qa/state.json`：`{cases:[{id,status:'NOT_RUN|RUNNING|PASS|FAIL|BLOCKED',claim,result,history}]}`
- 書き込みは**排他ロック＋一時ファイル→rename**。ロックはプロセス終了時に必ず削除（削除できない環境から書かない）。
- `claim`（実行前に確保）→ `record`（PASS/FAIL＋証拠）→ 未完了は `release`。
- **RUNNING回復（2026-10-22改版）:** 再開時には過去の同じ実機のQA実行器を停止・排他後、公式Runnerの`release`で中断履歴を保存。残留RUNNINGに対する人手の所有者確認・承認待ちは不要。本人のQA-owned fixture副作用をreadbackし、再試行可能なケースは再claim、検証が必要なケースは別ケースへスキップして後で再投入する。

### BLOCKED を最終判定にする前の共通手順（2026-10-16）

すべてのレーンで **原因調査 → 安全な復旧 → 再送（最大2試行）→ 証拠確認 → 判定** を共通化する。
一時的な画面/ADB/API/fixtureの問題は対象ケースのみ停止・再処理し、セッションと他ケースを止めない。
`BLOCKED` は証拠付きで復旧不能が確定した場合のみ受理し、アプリ欠陥が検出された場合は `FAIL`。
`scripts/qa-v2-blocked-recovery-policy.mjs` の **`resolveCauseRepairAndRerun`** を既存ドライバーに接続し、
根本原因の機構・調査証拠→既存共通ドライバー等での**実際の修復**→修復前後の読み戻し照合→**同じ正式ケースの再実行**
を行う。原因の分類のみ、再起動のみ、効果未確認の修復は再実行許可にならない。
最終証拠 `blockedRecovery` は **`qa.blocked-recovery.v2`** として原因と修復・再試行証拠を保存する。
ユーザー停止、権限境界、他テナント侵害、未所有データ、端末電源操作などは強行せず、
証拠付きハードゲートまたは `release`。公式runnerの `record BLOCKED` は
試行2回または証拠付きハードゲートがなければ拒否する。既存BLOCKED台帳は勝手に書き換えない。
- `validate`（記録前の受理判定）：全期待チェックに PASS と証拠参照があるか、画像が実在するか。

---

## 6. 運用ルール（AIチャットと実行環境）

| 役割 | 担当 |
|---|---|
| テスト・アダプター・判定の作成、単体テスト | AIチャット |
| 実行（1コマンド）、正式台帳への書き込み | 実機/ブラウザに接続できる環境（Windows 等） |
| 証拠の読解・原因分類（アプリ不具合／テスト不具合／環境） | AIチャット |
| 仕様判断（期待値が実装と違う等） | ユーザー |

- 毎回の報告は「runner受理可否つきの結果表＋原因分類＋次の1コマンド」。
- 停滞判定は判定数KPI（例：1レーン1日30判定）。2時間0件なら原因一覧を報告し、実行可能な別ケースへ。

---

## 7. izakanpai で得た教訓（他システムでも必ず適用）

| 教訓 | 具体例 | ルール |
|---|---|---|
| 画面は非同期で埋まる | 設定画面が読み込み中は入力欄が空欄。即座に読むと誤判定 | 値の確認は「期待値が出るまで最大N秒待つ」。影響先の確認も同様 |
| 復元は画面ボタンでなくAPIで | 保存ボタンが別処理（席数保存）も同時に送り、そのエラーで復元失敗 | 変更前をサーバーから取得→ファイル保存→差分キーだけAPIで書き戻し→読み戻し確認 |
| 元の値をフォームから取らない | 空欄の席数で復元すると全テーブル削除の恐れ | 元の値はサーバーの値。取れなければ中止 |
| 丸めは仕様の範囲 | 金額 1234.567→1234.57 | 「画面とDBが一致するか」で判定し、厳密一致は求めない |
| 編集フォームは一覧の読み込み後 | `edit(id)` が一覧未読込で無反応 | 「フォームのIDが対象になるまで再試行」で開く |
| 表示されない機能は前提不足 | メール設定カードが権限で非表示 | `SKIPPED_PRECONDITION` として記録しPASS/FAILにしない |
| 書けない環境から台帳を書かない | 削除不可のVMでロックが残留し全担当が停止 | 台帳への書き込みは実行環境のみ |
| 判定器は本番と同じものを使う | 自前判定がPASSでも台帳が拒否する可能性 | 記録前に台帳の validate を呼び、受理可否を表示 |
