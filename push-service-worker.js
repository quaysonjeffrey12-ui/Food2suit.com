self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'Food2Suit order update', {
    body: data.body || 'Your Food2Suit order has been updated.',
    icon: 'https://quaysonjeffrey12-ui.github.io/Food2suit.com/favicon.ico',
    badge: 'https://quaysonjeffrey12-ui.github.io/Food2suit.com/favicon.ico',
    data: { url: data.url || 'https://quaysonjeffrey12-ui.github.io/Food2suit.com/index.html' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
