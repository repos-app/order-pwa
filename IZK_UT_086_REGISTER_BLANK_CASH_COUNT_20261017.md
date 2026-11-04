# IZK-UT-086｜空欄の現金実数がゼロに変換され、レジ締めに進める

> **2026-10-17 正式実機QA更新：** ユーザーがRealmeにログインした後、Android QA APK910019の`register.html`で`#cnt`を空欄とし、**実際にPlaywrightで`#closeBtn`をタップ**した。画面ローカルの`rpc`をネットワーク送信直前で安全に差し替えて実際の送信予定引数を観測したところ、`closeShift`に`counted=0`を渡そうとした。元期待値`PT-INP-0284`が要求する空欄拒否に違反。クリック前・後・復元後の実機PNG3枚SHA256証明、実際のRPC引数と元期待値、`teat` D1`shifts`件数・open件数・opening float集計の前後**一致**を根拠に**`QA2-UI-register`公式FAIL受理**。**実際のcloseShift API送信とレジ締めDB確定は意図的に遮断したため未発生**。端末UIと元のシフトは復元した。実物の書き込みが発生したとの誤報は禁止。真正証拠：`test-results/qa-v2-evidence/playwright-realme/role5-register-real-blank-2026-10-17T03-19-26-406Z/formal-fail-evidence.json`。この文書の旧「PHYSICAL FORMAL QA PENDING」は当初履歴であり、**現在の対象ケース公式判定はFAIL**。ローカル修正はAPK未配布につき本件のFAILをPASSにはできない。

**発見**：2026-10-17 / **優先度**：P1 High（シフト締めの金額・過不足・監査確定）/ **状態**：LOCAL SOURCE FIXED・PHYSICAL FORMAL QA PENDING。

**関連正式ケース**：\`QA2-UI-register\`。このケースの元契約は数値入力の空／負数／非数／境界・保存・再読込・API/D1整合性、ボタンbusy、実機720/1080レイアウト、日本語英語切替を含む。画面操作で「空欄レジ締めが本当に保存された」という実機証拠は**未取得**。今回の指摘はコード・実関数VMで再現した確定した**事前入力検査の欠陥**であり、元ケースの製品正式FAIL/PASSを捏造しない。

## 根本原因

- \`mobile-app/web/register.html\`、\`android/app/src/main/assets/public/register.html\`、\`docs/yuwaku/register.html\`、\`docs/yuwaku/test/register.html\` の \`doClose()\` が \`Number(document.getElementById('cnt').value)\` により空欄を \`0\` へ変換し、\`counted>=0\` を満たして \`closeShift\` RPCへ進めていた。画面は必須項目である実現金の未入力を明示的に拒否できない。ユーザーが**「0を数えた」ことと「数えていない」こと**の区別が失われる。
- 同じ場所の \`Number(cio)||0\` は非数/Infinityをゼロへマスクする経路もある。
- \`src/register.js::closeShift()\` が \`Number(counted)||0\` で空・NaN・Infinity等をゼロへ変換し、直接RPC／旧クライアントでもシフト閉店処理を行う危険があった。サーバー側も原データの入力検査が必要。

## 修正

- 4 UI入口で、現金実数 \`cnt\` の **trim済み空欄・負数・Infinity/NaN・ブラウザー制約違反**を閉店RPC送出前に拒否し、\`needCount\` の既存日英文言で欄へフォーカス。現金入出金 \`cio\` は空欄のみゼロと解釈、それ以外の非数/不正値を拒否する。明示 \`0\`／\`0.5\` は有効。
- Worker/GAS共有 \`src/register.js::closeShift\` の**DB読取より前**で同様に \`invalid_counted_cash\` / \`invalid_cash_movements\` を返す。ユーザー許可済みQA店舗以外のデータを変更しない。
- 既存の\`shift_id\`による二重送信拒否、会計確定との競合CAS、他スタッフが打刻中の締め拒否などの原子性ロジックは変更しない。

## 自己レビュー10件（独立した原因・境界から確認）

1. **S01** ブラウザ \`Number('')===0\` と原コードの\`>=0\`を突合し、未入力を許していた原因を確認。
2. **S02** 空白\`'   '\`でも \`Number\` が0になるため \`trim\` 明示検査が必要なことを確認。
3. **S03** 有効な明示的な\`'0'\`だけを通すことを実関数VMで確認。
4. **S04** \`-1\`をメッセージ＋フォーカスで停止することを実関数VMで確認。
5. **S05** 非数\`NaN\`相当をサーバーで停止することをDBゼロ呼出しで確認。
6. **S06** \`Infinity\`・\`1e400\`相当を \`Number.isFinite\` で拒否することを確認。
7. **S07** \`input.validity.valid===false\` のstep/制約違反をUIが拒否することを検査。
8. **S08** \`cio\` の空欄は仕様上0として有効であり、\`cnt\` と区別することを確認。
9. **S09** \`cio\` の非数/Infinityもメッセージを出し、閉店RPCを一度も呼ばないことを検査。
10. **S10** サーバー側エラーはDBのfirst/UPDATE以前に返り、拒否時にテナント内行を触らないことを専用試験で検証。

## 横展開レビュー10件（別入口・別業務経路）

1. **H01** Native共通ソース \`mobile-app/web/register.html\` の閉店画面VM操作検査。
2. **H02** Androidアセット \`android/app/src/main/assets/public/register.html\` の同検査（**ローカルアセット変更であり実機インストール済APKは未更新**）。
3. **H03** 公開Web \`docs/yuwaku/register.html\` の同検査（**deployなし**）。
4. **H04** Web TEST \`docs/yuwaku/test/register.html\` の同検査（**deployなし**）。
5. **H05** 4入口の\`cnt\`・\`cio\`・ボタン無効化前のガードを負例試験で一斉照合。
6. **H06** \`src/register.js\` の直接RPC server-sideガード、DBアクセス数ゼロを確認。
7. **H07** \`src/index.js::handleCloseShift\` は認証済み店舗IDのみ渡す処理に変更なし、とソース検査。
8. **H08** \`src/gasApi.js::closeShift\` は同じ共有 \`src/register.js\` を使用、とソース検査。
9. **H09** \`test/audit_atomic_takeout_register_test.mjs\` 既存28/28 PASS、領収書同時確定・retry・stale closeが保護されたままであることを確認。
10. **H10** \`test/register_close_unclocked_attendance_test.mjs\` PASS：未退勤スタッフ・別店舗のガードを維持。

**実行結果**：専用\`test/role5_register_cash_count_validation_test.mjs\` は**19/19 PASS**、既存レジ原子性28/28 PASS、未退勤ガード PASS、開店フロート検査 PASS。VMは実コードのUI関数を抽出して行い、ボタン押下を模したもので**本物の物理端末操作・DBリモート変更ではない**。

## 正式再検証までの条件

1. 修正ソースを承認済みQAビルドへ反映し、バージョン/署名/全アセットSHAを実機で再証明（自動デプロイなし）。
2. Windows保管のQA専用アカウントで端末ログインを再確立し、\`teat\`/ \`yuwaku\` のケース固有シフトで、必須カウント空欄／非数が送信されないことと日本語・英語の正しいエラーメッセージを物理端末で取得。
3. カウント\`0\`等の正常系でOpen→Close、Back/reopen、API＋独立D1の \`shifts\` \`status\` / \`actual_cash\` / \`discrepancy\` を確認し、実データをケース所有スナップショットへ復元。
4. 720/1080の物理サイズと実際のキーボード遮蔽・末尾到達の証拠を追加し、原15操作と全8期待値を正式Runnerで判定。

現在のQA実機はQAログイン画面。2026-10-17 \`QA2-KEEP-PT-INP-0064\` の正式FAIL再現後にQA専用ログイン補助が復旧できなかった。アプリ\`FAIL\`とログイン補助の失敗は分けて管理する。
