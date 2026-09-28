/* オフライン対応（アプリ本体をキャッシュ。ランキング通信はキャッシュしない） */
const CACHE = 'sap-v3';
const ASSETS = ['./', 'index.html', 'app.js', 'hunt.js', 'endless.js', 'tutorial.js', 'ui.js', 'board.js', 'amida-core.js', 'stages.js', 'ranking.js', 'config.js', 'manifest.webmanifest', 'icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // ネット優先・失敗時キャッシュ（更新がすぐ反映されるように）
  e.respondWith(
    fetch(e.request)
      .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request))
  );
});
