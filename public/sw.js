/**
 * Laboratorio sin conexión. Guarda en el navegador la aplicación (página, código, estilos, imágenes,
 * el modelo de ZOE y el Repositorio CIP-DF) para que, después de la primera visita, se abra sin
 * internet. Los datos del trabajo ya viven en el navegador (Contenedor de resultados), así que se
 * puede seguir consultando, encadenando, descargando y viendo métricas.
 *
 * Nunca guarda la IA, la base de datos ni otras API (`/api/`, `/includes/`): siempre van en vivo.
 * Lo registra `src/lib/registerOffline.ts`, solo en la versión publicada (no en `npm run dev`).
 */
const CACHE = 'lab-offline-v1';
const SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('lab-offline-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

const isLive = (url) => /\/(api|includes|config)\//.test(url.pathname) || url.pathname.endsWith('.php');
const isFont = (url) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (isLive(url)) return;
  if (url.origin !== self.location.origin && !isFont(url)) return;
  // El modelo de voz de ZOE (decenas de MB) ya queda guardado por la propia voz (OPFS); duplicarlo aquí la retrasa.
  if (url.pathname.endsWith('.onnx')) return;
  // Videos y audios llegan por partes: el navegador los maneja mejor solo.
  if (request.destination === 'video' || request.destination === 'audio') return;

  if (request.mode === 'navigate') {
    // La página, red primero: con conexión siempre la versión nueva; sin ella, la última guardada.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html').then((cached) => cached || caches.match('./'))),
    );
    return;
  }

  // Código, estilos e imágenes: lo guardado al instante, y se actualiza en segundo plano.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.status === 200 || response.type === 'opaque') void cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached || Response.error());
      if (cached) {
        event.waitUntil(network.then(() => undefined, () => undefined));
        return cached;
      }
      return network;
    }),
  );
});
