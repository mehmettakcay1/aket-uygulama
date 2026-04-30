const CACHE_NAME = "aket-v25";

const CDN_URLS = [
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-database-compat.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './AK-ET%20KURUMSAL%20LOGO.png',
  './icon-512.png',
  './icon-192.png',
  './icon-180.png',
  './icon-167.png',
  './icon-152.png'
];

const offlineResponse = () => new Response(
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AK ET</title><style>body{background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;text-align:center}h2{margin-bottom:8px}p{color:#aaa;font-size:14px}.retry{margin-top:16px;padding:10px 20px;background:#7b2c24;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px}</style></head><body><div><h2>AK ET — Bağlantı Yok</h2><p>İnternet bağlantınızı kontrol edin.</p><button class="retry" onclick="location.reload()">Tekrar Dene</button></div></body></html>',
  { status: 200, headers: { 'Content-Type': 'text/html;charset=utf-8' } }
);

const safeResponse = () => new Response('', { status: 503 });

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Önce yerel dosyaları cache'le
      await cache.addAll(LOCAL_ASSETS).catch(() => {});

      // CDN scriptlerini tek tek cache'le — biri hata verse diğerleri etkilenmesin
      for (const url of CDN_URLS) {
        try {
          const res = await fetch(url);
          if (res && res.ok) await cache.put(url, res);
        } catch(e) {}
      }
    }).catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ).catch(() => {}),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  let url;
  try { url = new URL(event.request.url); } catch(e) { return; }

  if (!url.protocol.startsWith('http')) return;
  if (event.request.method !== 'GET') return;

  // SW dosyası → her zaman ağdan al
  if (url.pathname.endsWith('sw.js')) {
    event.respondWith(
      fetch(event.request).catch(() => safeResponse())
    );
    return;
  }

  // Firebase Realtime Database API istekleri — SW'den geçirme
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('cloudflareinsights.com')
  ) {
    return;
  }

  // CDN scriptleri (Firebase SDK, Chart.js) — cache-first, arka planda güncelle
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('jsdelivr.net')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(res => {
          if (res && res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone())).catch(() => {});
          }
          return res;
        }).catch(() => null);

        return cached || networkFetch.then(res => res || safeResponse());
      }).catch(() => safeResponse())
    );
    return;
  }

  // HTML dosyaları — ağdan al, başarısız olursa cache, o da yoksa offline sayfası
  if (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname === '') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (!res || !res.ok) return caches.match(event.request).then(c => c || offlineResponse());
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached || offlineResponse())
            .catch(() => offlineResponse())
        )
    );
    return;
  }

  // Diğer kaynaklar — cache-first, yoksa ağdan al
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(res => {
            if (res && res.ok) {
              caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone())).catch(() => {});
            }
            return res || safeResponse();
          })
          .catch(() => safeResponse());
      })
      .catch(() => safeResponse())
  );
});
