// =============================================================
// sw.js — Service Worker optimizado
// Estrategia:
//   · HTML / JS / CSS / JSON → network-first SIN caché HTTP
//   · Imágenes               → cache-first con relleno
//   · Resto                  → stale-while-revalidate
// Versionado automático: solo cambia VERSION al publicar cambios
// =============================================================

const VERSION       = 'v4';                       // ← súbelo en cada release
const CACHE_SHELL   = `pasaje-shell-${VERSION}`;
const CACHE_PAGES   = `pasaje-pages-${VERSION}`;
const CACHE_IMAGES  = `pasaje-images-${VERSION}`;
const CACHE_STATIC  = `pasaje-static-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './login.html',
  './tienda.html',
  './favoritos.html',
  './manifest.json',
  './js/supabase.js',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/placeholder.png'
];

// -------------------------------------------------------------
// Helpers de clasificación
// -------------------------------------------------------------
function isNetworkFirst(url) {
  const p = url.pathname;
  return (
    p.endsWith('.html') || p.endsWith('/') ||
    p.endsWith('.js')   || p.endsWith('.mjs') ||
    p.endsWith('.css')  || p.endsWith('.json') ||
    p.includes('/js/')  || p.includes('/admin/') || p.includes('/dashboard/')
  );
}
function isImage(url) {
  return /\.(png|jpe?g|webp|gif|svg|avif|ico)$/i.test(url.pathname);
}

// -------------------------------------------------------------
// Estrategias
// -------------------------------------------------------------
async function networkFirst(req, cacheName) {
  try {
    // cache: 'no-store' → ignora por completo la caché HTTP del navegador
    const res = await fetch(req, { cache: 'no-store' });
    if (res && res.status === 200 && res.type !== 'opaque') {
      const copy = res.clone();
      caches.open(cacheName).then(c => c.put(req, copy)).catch(() => {});
    }
    return res;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    // Fallback de navegación offline
    if (req.mode === 'navigate') {
      const shell = await caches.match('./index.html');
      if (shell) return shell;
    }
    throw err;
  }
}

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.status === 200 && res.type !== 'opaque') {
      const copy = res.clone();
      caches.open(cacheName).then(c => c.put(req, copy)).catch(() => {});
    }
    return res;
  } catch (err) {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cached = await caches.match(req);
  const fetchPromise = fetch(req)
    .then(res => {
      if (res && res.status === 200 && res.type !== 'opaque') {
        const copy = res.clone();
        caches.open(cacheName).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    })
    .catch(() => null);
  return cached || (await fetchPromise) || Response.error();
}

// -------------------------------------------------------------
// INSTALL — precachear shell + activar de inmediato
// -------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then(cache => Promise.all(SHELL.map(u => cache.add(u).catch(() => null))))
      .then(() => self.skipWaiting())   // ← clave: no esperar pestañas cerradas
  );
});

// -------------------------------------------------------------
// ACTIVATE — limpiar TODAS las cachés antiguas y tomar control
// -------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !k.endsWith(VERSION))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())  // ← control inmediato de pestañas abiertas
  );
});

// -------------------------------------------------------------
// FETCH
// -------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignorar cualquier recurso externo (Supabase, fuentes CDN, etc.)
  if (url.origin !== self.location.origin) return;

  // HTML, JS, CSS, JSON → network-first SIN caché HTTP
  if (isNetworkFirst(url)) {
    event.respondWith(networkFirst(req, CACHE_PAGES));
    return;
  }

  // Imágenes → cache-first
  if (isImage(url)) {
    event.respondWith(cacheFirst(req, CACHE_IMAGES));
    return;
  }

  // Resto → stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req, CACHE_STATIC));
});

// -------------------------------------------------------------
// Mensaje desde la página: forzar activación inmediata
// -------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
  }
});