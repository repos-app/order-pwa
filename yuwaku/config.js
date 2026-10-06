// PWA 設定。Cloudflare Workers（本移行後の本番API）のURLを指す。
// デプロイURLを差し替える場合はここだけ変更する。
//
// ★注意（あつしさんへ）: 下記URLは、これまでの作業中に一貫して使ってきた想定の本番URL
// （Workerサービス名 izakanpai-api ＋ Cloudflareアカウントのサブドメイン izakanpai）です。
// 実際に `npx wrangler deploy` を実行すると、コンソールに実際のデプロイ先URLが表示されます。
// もしそのURLがここと違っていたら、下のAPI_URLを実際のURLに書き換えてから
// deploy.bat/deploy_frontend.batを実行してください（2026-08-25: deploy_all.batから改名）。
//
// ★2026-08-23: テスト環境は ./test/config.js （URLで言うと /yuwaku/test/ 配下）で別管理。
// このファイル（本番用）には、以前あったURLトグル切り替え機能は撤去した（複雑だったため、
// 昔ながらのURL分離方式＝/yuwaku/test/ に一本化）。
window.APP_CONFIG = {
  AUTH_SCHEMA_VERSION: 2,
  API_URL: 'https://izakanpai-api.izakanpai.workers.dev',
  PUBLIC_ORDER_URL: 'https://izakanpai.com/order/',
  PUBLIC_RESERVATION_URL: 'https://izakanpai.com/reserve.html',
  PUBLIC_TAKEOUT_URL: 'https://izakanpai.com/takeout/',
  STORE_ID: 'yuwaku',
  VERSION: 'v1.0.0',
  AUTH_STORAGE_PREFIX: 'izakanpai:production:',
  STORAGE_PREFIX: 'izakanpai:production:',
  OFFLINE_DB_NAME: 'izakanpai-pos-production'
};

// 全画面共通ヘッダーを一元読込する。各HTMLへ同じマークアップを複製しない。
(function () {
  if (typeof document === 'undefined' || document.querySelector('script[data-iz-common-header]')) return;
  var script = document.createElement('script');
  script.src = './header.js?v=auth13';
  script.async = false;
  script.setAttribute('data-iz-common-header', '');
  document.head.appendChild(script);
})();

(function () {
  if (typeof document === 'undefined' || document.querySelector('script[data-iz-date-display]')) return;
  var script = document.createElement('script');
  script.src = './date-display.js?v=auth4';
  script.async = false;
  script.setAttribute('data-iz-date-display', '');
  document.head.appendChild(script);
})();
