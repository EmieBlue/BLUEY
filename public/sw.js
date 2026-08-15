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

// --- Web push: show a notification, then open the app on tap. Pushes are sent
// without a payload; the SW fetches the latest message to display. ---
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let title = 'Elyra';
      let body = 'Something new to read on Elyra.';
      let url = '/';
      try {
        const res = await fetch('/api/push-latest', { cache: 'no-store' });
        if (res.ok) {
          const d = await res.json();
          if (d.title) title = d.title;
          if (d.body) body = d.body;
          if (d.url) url = d.url;
        }
      } catch {
        /* use defaults */
      }
      await self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of clientList) {
        if ('focus' in c) {
          try {
            c.navigate(url);
          } catch {
            /* ignore */
          }
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })(),
  );
});
