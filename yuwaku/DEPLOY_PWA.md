# 注文PWA — 公開とデプロイ手順

`docs/` = 客の注文用PWA（オフライン対応・インストール可）＋管理系画面一式。GitHub Pagesで配信し、バックエンドは**Cloudflare Workers + D1**のJSON APIです（2026年8月にGoogle Apps Script + Googleスプレッドシート構成から全面移行済み。旧GAS版は完全廃止・実運用では使われていません）。

## 構成

```
izakanpai/                    … Cloudflare Workers + D1のプロジェクトルート
  docs/
    index.html   … 注文アプリ本体（アプリシェル）
    app.js       … UI・カート・送信・オフライン再送
    api.js       … Cloudflare Workers API呼び出し + IndexedDB送信キュー
    config.js    … Cloudflare Workers APIのURL（ここだけ差し替え可）
    sw.js        … Service Worker（オフライン起動）
    manifest.webmanifest / icons/  … インストール用
    styles.css
    yuwaku/      … 誘惑店の画面一式（admin.html等、管理系40画面以上）
  src/           … Cloudflare Workers側のバックエンドソース
  wrangler.toml  … Cloudflare Workers設定
```

## ① 初回だけ: 公開リポジトリ order-pwa でPagesを有効化

`Development` は非公開のため、フロント（`docs/`）だけを**公開リポジトリ `izakanpai/order-pwa`** にミラーして配信する。`publish_pwa_mirror.bat`が`docs/`の中身を、`order-pwa`用の別クローン（`%LOCALAPPDATA%\izakanpai_pwa_mirror`）へrobocopyでミラーコピーし、commit+pushする（`git subtree`は履歴が肥大化する問題があったため2026-08-24に廃止済み）。

1. 先に一度 `deploy.bat`（内部で`publish_pwa_mirror.bat`を呼ぶ）を実行して order-pwa に push（`main` ブランチが作られる）
2. GitHub → `izakanpai/order-pwa` → **Settings → Pages**
3. Source: **Deploy from a branch** / Branch: **main** / Folder: **/(root)** → **Save**
4. 数分後、公開URL: `https://izakanpai.com/yuwaku/`

## ② デプロイ（毎回）

`izakanpai\deploy_everything.bat`（フロント＋Cloudflare Worker本体すべて）、またはフロントのみでよければ`izakanpai\deploy_frontend.bat`をダブルクリック。

`deploy_frontend.bat` ?Production? `deploy.bat` ?????????`deploy_test.bat` ?????fixture??????GitHub Pages?Cloudflare??????????????????? `deploy.log` ???

## ③ QRコードのURL

新PWAの注文URLは卓番号つき:
```
https://izakanpai.com/yuwaku/?table=1
https://izakanpai.com/yuwaku/?table=2 …
```
各卓のQRをこのURLで作り直すと、客はPWAで注文できます。

## ④ 動作確認チェックリスト

- [ ] スマホでURLを開く → メニュー表示・カテゴリ切替・数量増減・合計(税/サービス料込)
- [ ] 「注文する」→ 送信成功 → 注文管理（admin.html）に反映・キッチン印刷
- [ ] iPhone: Safari共有→「ホーム画面に追加」/ Android: Chrome「アプリをインストール」でインストール可能
- [ ] **オフライン試験**: 機内モードで開く→(SWによりアプリ起動)→注文→「保留しました(オフライン)」→通信復帰で自動送信、保留バッジが消える

## 既知の制約・次の一手

- 客の注文フロー・管理系（注文管理/在庫/勤怠/プリンタ等）ともにCloudflare Workers + D1へ移行済み。
- 二重送信の完全防止(clientIdサーバ側デデュープ)は実装済み。
- CORS: Cloudflare WorkersはWorker側でCORSヘッダを付与する設計。うまく通らない場合は連絡を。
