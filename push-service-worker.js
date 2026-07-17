const CACHE_NAME = 'food2suit-app-v1';
const APP_SHELL = [
  './',
  './index.html',
  './menu.html',
  './offers.html',
  './contact.html',
  './storefront.css',
  './storefront.js',
  './pwa.js',
  './app-icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    if (new URL(event.request.url).origin === self.location.origin) {
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'Food2Suit order update', {
    body: data.body || 'Your Food2Suit order has been updated.',
    icon: 'https://quaysonjeffrey12-ui.github.io/Food2suit.com/app-icon.svg',
    badge: 'https://quaysonjeffrey12-ui.github.io/Food2suit.com/app-icon.svg',
    data: { url: data.url || 'https://quaysonjeffrey12-ui.github.io/Food2suit.com/index.html' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
