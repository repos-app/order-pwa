const CACHE = 'izakanpai-public-order-production-v11';
const SHELL = [
  './',
  './index.html',
  './config.js',
  '../public/order-styles.css',
  '../public/public-api.js',
  '../public/i18n.js',
  '../public/confirm.js',
  '../public/order-app.js',
  '../public/help.js'
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k.startsWith('izakanpai-public-order-production-') && k !== CACHE).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(req).then((res) => {
    if (res && res.ok) caches.open(CACHE).then((cache) => cache.put(req, res.clone())).catch(() => {});
    return res;
  }).catch(async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    return (await cache.match(req, { ignoreSearch:true })) || Response.error();
  }));
});
