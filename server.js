const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 3000;

// JSON body parser
app.use(express.json());

// Statik dosyalar — index.html, manifest.json, sw.js, logo vb.
app.use(express.static(__dirname, {
    setHeaders(res, filePath) {
        // Service Worker cache'lenmemeli
        if (filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Service-Worker-Allowed', '/');
        }
        // HTML dosyaları hiç cache'lenmesin
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        // Güvenlik başlıkları (_headers dosyasındakilerle uyumlu)
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }
}));

// SPA fallback — bilinmeyen rotalar index.html'e yönlendirilir
app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  AK ET Kurumsal Yönetim Sistemi');
    console.log(`  http://localhost:${PORT}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
