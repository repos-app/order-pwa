# AMU Labs — Google Play掲載・データセーフティの3アプリ共通事前準備（2026-10-17）

## 許可・範囲

ユーザーはGoogle Play本人確認を後日実施予定。「ほかにできること」を先行する依頼の下、**オフライン文書・コード監査のみ**。Google Play/Apple/RevenueCat/Cloudflare本番の変更、ストア登録/公開/課金設定、コミット/プッシュ、GitHub Actionsビルド、実機正式QA結果への書込みは行っていない。Google個人開発者AMU Labsは登録済み（氏名確認済・本人確認はGoogle未完了）。

## 今回の新規成果

- `standards/google-play/v1/listings.json`：公開資料、512x512 PNGストアアイコン、1024x500 RGBのfeature graphic、2枚以上の実画面画像、公開Privacy/削除申請URL、データ安全性・アカウント削除・SDK・対象年齢・課金文言の申告状況を**3アプリ独立**で管理。存在しないファイルや未審査申告はnull/false。
- `standards/google-play/v1/listing-preflight.mjs`：実ファイルの存在、ポートフォリオキー重複、PNG形式・寸法・透過/色形式・CRC/IDAT/IEND・サイズ、2枚以上の電話スクリーンショット、HTTPS URL、各種審査承認を検査。データ収集なし等の虚偽申告をしない。`--require-submission-ready` は未準備をexit 1とする。
- `standards/google-play/v1/listing-preflight.test.mjs`：専用12件の正常/負例テスト。**12/12 PASS**。既存のPlayポートフォリオ/AAB回帰17/17 PASS（別系統）。
- izakanpai:`docs/GOOGLE_PLAY_STORE_COPY_DRAFT_20261017.md`、できたCalendar:`docs/GOOGLE_PLAY_STORE_COPY_DRAFT_20261017.md` を新規作成。JA/ENの内容を**アプリのREADME/既存機能**に限定し、金額・無料試用など外部サービス未確定内容は保証しない。Hataraku NihonGO!は既存`app/docs/STORE_COPY_FOR_REVIEW_2026-10-11.md`を再利用。
- `standards/google-play/v1/DATA_SAFETY_WORKSHEET.md`：POSのGPS・顔写真/注文、学習アプリのAI入力/進捗、カレンダーの子どもの名前/目標/家族招待等を別アプリとして調査。SDK、WebView、削除リンク、住所・法定ポリシー、Google Families要件を誤転用しない。

## 調査結果（現物の証拠に限定）

| アプリ | 掲載文案 | Feature graphic | Playアイコン / 実スクリーンショット | データ申告 |
|---|---|---|---|---|
| izakanpai POS | 新規JA/EN草案あり | 未確認 | 未確認 | 既存`docs/store-privacy-data-map.md`にソースベース案あり、外部SDK最終照合待ち |
| Hataraku NihonGO! | 既存JA/EN草案あり | `resources/store/google-play-feature-graphic-1024x500.png`：RGB PNG 1024x500 CRC正常 **形式PASS** | 512px完成アイコンと実写真は未確認（既存タルタルの1024pxアイコンはPlay指定寸法ではない） | draft Privacy有、公開URL/AI・課金/SDK実態との照合待ち |
| できた！カレンダー | 新規JA/EN草案あり | 未確認 | 未確認 | Privacyソース未確認、家族同期と子どもの情報/対象年齢審査待ち |

共通preflightは**提出READY 0/3**。スクリーンショットのQA証拠から勝手にPlay掲載画像を流用せず、実顧客・子ども・店員情報をマスクした最終実機画面を使う。iOS App Store Connectの登録済事実はGoogle Play掲載審査の代替ではない。

## ソース自己レビュー10の独立観点（実施）

| No | 検証入口／証拠 | 結果 |
|---|---|---|
| S01 | canonical Play Portfolio appsと新listings app keysの照合（実3アプリ） | 3キー一致 PASS |
| S02 | 同一key重複/欠落の負例（`listing-preflight.test.mjs`） | 実行PASS |
| S03 | path.resolve+relativeによる相対パス逸脱の負例 | arbitrary ../secret読込み拒否 PASS |
| S04 | 不正拡張子/PNG署名/ヘッダを独立負例 | 偽PNG拒否 PASS |
| S05 | 1024x500の仕様とRGBA偽feature graphic | RGB限定、rgbaを拒否 PASS |
| S06 | 512x512アイコン、既存1024x1024アイコン反例 | wrong dimensions拒否 PASS |
| S07 | PNG IHDRのCRCを破壊した改変画像で再検証 | CRC不一致拒否 PASS |
| S08 | PNG chunk IDAT/IENDが欠ける中途ファイルの判定 | CRC/IDAT/IEND必須、短い偽PNG拒否 PASS |
| S09 | URLがlocalhost、example.com、http等の反例 | 無効URL reject PASS |
| S10 | 成果物が存在しても未承認データ安全性がtrue扱いされない負例 | falseを維持、ready false PASS |

## 横展開レビュー10の独立観点（実施）

| No | 対象別逆引き | 証拠と結果 |
|---|---|---|
| H01 | POSの既存Data Safety源と実Native業務画面を照合 | 収集データあり、「収集なし」は設定しない：PASS SOURCE |
| H02 | POSの初期公開Privacy/削除ソースとPlay用公開URLとの違い | 単なるローカルHTMLをpublic URLにしない：PASS |
| H03 | 働く日本語の既存Store Copy（JA/EN）を再利用 | 下書きを認識、公開済みと偽らない：PASS SOURCE |
| H04 | HNGの本物のfeature graphicバイナリを直接PNG検査 | 1024x500/24bit/CRC正常：PASS SOURCE |
| H05 | HNG既存1024pxアプリアイコンをPlay 512px要件と照合 | 未準備扱い、偽の合格は無し：PASS SOURCE |
| H06 | できたCalendarのREADME/子ども向け実装を確認 | JA/EN草案を子ども/目標/報酬機能に限定：PASS SOURCE |
| H07 | できたCalendarの家族同期/招待データ/プライバシーソース不足を確認 | Privacy/dataSafety false維持：PASS SOURCE |
| H08 | RevenueCatサブスクの購入と各ストアに未登録の商品を分離 | 未確定価格/無料トライアル/課金開始を記載しない：PASS SOURCE |
| H09 | Google公式のWebView・SDK・アカウント削除要件と各アプリの用途を突合 | 3アプリ独立の調査シート化：PASS |
| H10 | CI/AABの実ビルド証拠とPlay掲載画像を別扱い | AAB static readyでも掲載提出READY 0/3、Google本人確認/実写真PENDINGを保持：PASS |

これらの結果は**資料・ファイル形式のローカル検証であり、法律上の申告適合・Google審査完了・ユーザーの個人情報保護を保証しない**。公開URLのネットワーク確認・最終署名ビルド・実画面撮影/マスク・SDKの実通信・Google Consoleへの実入力はまだPENDING。

Google参考： https://support.google.com/googleplay/android-developer/answer/9866151
／ https://support.google.com/googleplay/android-developer/answer/10787469
／ https://support.google.com/googleplay/android-developer/answer/13327111
