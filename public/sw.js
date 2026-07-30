/*
 * Bluey service worker — deliberately NETWORK-FIRST.
 *
 * Its only jobs are (a) make the app installable (PWA needs a registered SW with
 * a fetch handler) and (b) allow a basic offline fallback. It must NOT trap users
 * on a stale build, so it always tries the network first and only serves the
 * cache when the network fails. Cross-origin requests (Supabase, Paystack) and
 * our Netlify functions are left completely untouched.
 */
const CACHE = 'bluey-runtime-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Only handle same-origin GETs; never touch functions or cross-origin APIs.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/.netlify/')) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || Promise.reject(new Error('offline')))),
  );
});
