const CACHE_NAME = "aket-v23";

const offlineResponse = () => new Response(
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AK ET</title><style>body{background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;text-align:center}h2{margin-bottom:8px}p{color:#aaa;font-size:14px}</style></head><body><div><h2>Bağlantı Yok</h2><p>İnternet bağlantınızı kontrol edip sayfayı yenileyin.</p></div></body></html>',
  { status: 503, headers: { 'Content-Type': 'text/html;charset=utf-8' } }
);

const safeResponse = () => new Response('', { status: 503 });

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([
        './manifest.json',
        './AK-ET%20KURUMSAL%20LOGO.png',
        './icons/icon-192.png',
        './icons/icon-512.png',
        './icons/icon-180.png',
        './icons/icon-167.png',
        './icons/icon-152.png'
      ])
    ).catch(() => {})
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

  // Sadece http/https isteklerini yakala
  if (!url.protocol.startsWith('http')) return;

  // POST ve diğer mutating istekleri geç
  if (event.request.method !== 'GET') return;

  // SW dosyası → her zaman ağdan al
  if (url.pathname.endsWith('sw.js')) {
    event.respondWith(
      fetch(event.request).catch(() => safeResponse())
    );
    return;
  }

  // Firebase ve harici API isteklerini SW'den geçirme — ağa bırak
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('cloudflareinsights.com')
  ) {
    return;
  }

  // HTML dosyaları → ağdan al, başarısız olursa cache, o da yoksa offline sayfası
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (!res) return offlineResponse();
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

  // Diğer kaynaklar → önce cache, yoksa ağdan al
  event.respondWith(
    Promise.resolve()
      .then(() => caches.match(event.request))
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(res => res || safeResponse())
          .catch(() => safeResponse());
      })
      .catch(() => safeResponse())
  );
});
