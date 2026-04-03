const CACHE_NAME = "aket-v19";

self.addEventListener('install', event => {
  // skipWaiting: yeni SW hemen aktif olsun (güncelleme otomatik uygulanır)
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['./manifest.json', './AK-ET%20KURUMSAL%20LOGO.png'])
    )
  );
});

self.addEventListener('activate', event => {
  // Eski cache'leri sil
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  // clients.claim() YOK — ana uygulama JS'i reload yönetir (döngü önleme)
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // HTML dosyaları → her zaman ağdan al (otomatik güncelleme)
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // SW dosyası → ağdan al (güncelleme tespiti için)
  if (url.pathname.endsWith('sw.js')) {
    event.respondWith(fetch(req));
    return;
  }

  // Diğer kaynaklar → önce cache, yoksa ağdan al
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
