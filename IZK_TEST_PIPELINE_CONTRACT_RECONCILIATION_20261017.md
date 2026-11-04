# izakanpai 統合回帰テスト契約の整合化（2026-10-17）

## 方針

既存の正しい実装を古い静的アサーションに合わせて巻き戻さない。正式PASS判定とソーステストPASSを区別する。全体テストの各停止は終了コードと実際の旧契約・現ソースを照合する。

| 起点 | 確認した旧期待との不一致 | 実施・結果 |
|---|---|---|
| 共通ヘッダー2テストで4 FAIL | 正本IZK-UT-078は2段なのに1段DOM/折返しを期待 | 2段配置・44px操作領域・360/800 CSS px実Chromium・アクセシビリティ検査を保持した厳格アサーションへ整合。関連38テストPASS、exit0 |
| IZK-UT-089のSW版固定 | 修正時の最低バージョンv285の後に、91がTEST v286へ更新 | 旧版へのロールバックを拒否する最低版下限とheader URL・SHELLキャッシュ・旧cache削除を保持。専用回帰PASS |
| local_smokeのSW版v282完全一致 | 現行本番v285、TEST v286は意図された後続更新 | v282以上を要求し、別途環境別接頭辞と認証・url-versionクエリ・環境不一致fail closedを継続検証。581内部チェックPASS、exit0 |
| GAS互換のRevenueCat共通SDKキー | IZK-UT-085でOS別SDKキーとplatform引数必須、旧共通キーは禁止 | iOS/Android別の公開テストキーを与えiOS指定で検証。OS未指定がconfigured:falseになる負例を追加。562内部チェックPASS、exit0 |
| printer_settings_persistence | 画面にフォーマッタが間違って適用され、時刻を二重変換していた | テスト側は変更せず実画面3配布面を修正（IZK-UT-092）。既存12チェック、新規VM4/4 PASS |

手書きの長大なnpm testコマンドは作らず既存の test/project-test-commands.json に89〜92用6テストを追記。node test/izk_project_test_pipeline_contract_test.mjsは184ステップのmanifestを受理、exit0。正式実機QAやデプロイは未実施。

## 残るゲート

プロジェクトのnpm testは、追加の未監査SQLまたは旧テスト契約があれば失敗し得る。個別のexit0を統合PASSと宣言しない。Cloudflare Worker/DB、Native署名ビルド、Web CDNの変更をこのテスト調整だけで本番へ反映したとは扱わない。
