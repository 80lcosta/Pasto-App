/* Service worker del medidor: cachea el shell de la app para funcionar sin señal.
   Los datos viven en IndexedDB; acá solo se cachean los archivos de la app. */
const CACHE = 'pasto-shell-v1';

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/'])));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // La sincronización (api) nunca se cachea.
  if (new URL(req.url).pathname.startsWith('/api/')) return;

  evento.respondWith(
    caches.match(req).then((enCache) => {
      const red = fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return resp;
        })
        .catch(() => {
          // Sin señal: navegación cae al shell cacheado.
          if (req.mode === 'navigate') return caches.match('/');
          return enCache;
        });
      return enCache ?? red;
    }),
  );
});
