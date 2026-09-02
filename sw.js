const CACHE_NAME = "aket-v32";

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
  './icon-512-maskable.png',
  './icon-192.png',
  './icon-180.png',
  './icon-167.png',
  './icon-152.png',
  './favicon.ico'
];

const offlineResponse = () => new Response(
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AK ET</title><style>body{background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;text-align:center}h2{margin-bottom:8px}p{color:#aaa;font-size:14px}.retry{margin-top:16px;padding:10px 20px;background:#7b2c24;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px}</style></head><body><div><h2>AK ET</h2><p>İçerik yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.</p><button class="retry" onclick="location.reload()">Tekrar Dene</button></div></body></html>',
  { status: 200, headers: { 'Content-Type': 'text/html;charset=utf-8' } }
);

const safeResponse = () => new Response('', { status: 503 });

// Promise'i süre sınırıyla yarıştır — yavaş mobil ağda sayfa donmasın
function sureli(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('sw-timeout')), ms))
  ]);
}

self.addEventListener('install', event => {
  // Yeni sürüm hemen devreye girsin ama SAYFA OTOMATİK YENİLENMEZ (page tarafında
  // controllerchange→reload kaldırıldı) — SW sadece dosya sunar, bu güvenli.
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Tek tek ekle: bir dosya hata verirse diğerleri yine cache'lenir (addAll atomiktir, kötü)
    await Promise.allSettled(LOCAL_ASSETS.map(u => cache.add(u)));
    // CDN scriptleri: en iyi çaba, kurulumu bloklamaz
    Promise.allSettled(CDN_URLS.map(async u => {
      try { const r = await fetch(u); if (r && r.ok) await cache.put(u, r); } catch (e) {}
    }));
  })().catch(() => {}));
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ).catch(() => {}),
      self.clients.claim()
    ]).catch(() => {})
  );
});

self.addEventListener('fetch', event => {
  let url;
  try { url = new URL(event.request.url); } catch (e) { return; }

  if (!url.protocol.startsWith('http')) return;
  if (event.request.method !== 'GET') return;

  // SW dosyası → her zaman ağdan
  if (url.pathname.endsWith('sw.js')) {
    event.respondWith(fetch(event.request).catch(() => safeResponse()));
    return;
  }

  // Firebase Realtime DB / analytics → SW'den geçirme (dokunma)
  if (url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('cloudflareinsights.com') ||
      url.hostname.includes('identitytoolkit') ||
      url.hostname.includes('securetoken') ||
      url.hostname.includes('recaptcha') ||
      url.hostname.includes('firebaseappcheck')) {
    return;
  }

  // CDN scriptleri (Firebase SDK, Chart.js) — cache-first, arka planda tazele
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('jsdelivr.net')) {
    event.respondWith((async () => {
      const cached = await caches.match(event.request);
      const agdan = fetch(event.request).then(res => {
        if (res && res.ok) caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone())).catch(() => {});
        return res;
      }).catch(() => null);
      return cached || (await agdan) || safeResponse();
    })());
    return;
  }

  // HTML (uygulama kabuğu) — 3.5 sn ağ dene, olmazsa ANINDA cache'ten ver.
  // Böylece yavaş/kesintili mobil bağlantıda sayfa "açılmıyor" sorunu biter.
  if (url.pathname === '/' || url.pathname === '' || url.pathname.endsWith('.html')) {
    event.respondWith((async () => {
      const cached = await caches.match(event.request) || await caches.match('./index.html') || await caches.match('./');
      try {
        const res = await sureli(fetch(event.request), 3500);
        if (res && res.ok) {
          caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone())).catch(() => {});
          return res;
        }
        return cached || res || offlineResponse();
      } catch (e) {
        return cached || offlineResponse();
      }
    })());
    return;
  }

  // Diğer statik kaynaklar — cache-first
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const res = await fetch(event.request);
      if (res && res.ok) caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone())).catch(() => {});
      return res || safeResponse();
    } catch (e) {
      return safeResponse();
    }
  })());
});
