const CACHE_NAME = 'mercadochaco-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

function bypass(req) {
  const url = new URL(req.url);
  // No cachear nada que no sea GET
  if (req.method !== 'GET') return true;
  // No tocar WebSocket / HMR / Vite
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return true;
  if (url.pathname.startsWith('/@vite') || url.pathname.includes('vite')) return true;
  // No cachear llamadas a Supabase (auth/storage/rest)
  if (url.hostname.includes('supabase.co')) return true;
  return false;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (bypass(req)) {
    e.respondWith(fetch(req));
    return;
  }

  // HTML: network-first con fallback offline
  if (req.headers.get('accept')?.includes('text/html')) {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }

  // Otros GET: cache-first con revalidación
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) {
      fetch(req).then(resp => {
        if (resp && resp.ok) caches.open(CACHE_NAME).then(c => c.put(req, resp.clone()));
      }).catch(()=>{});
      return cached;
    }
    const resp = await fetch(req);
    if (resp && resp.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, resp.clone());
    }
    return resp;
  })());
});
