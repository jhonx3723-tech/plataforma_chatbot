// Service Worker — BotBuilder Push Notifications
const CACHE_NAME = 'botbuilder-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// ── Push recibido ─────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { return; }

  const { title = 'BotBuilder', body = 'Tienes una notificación', url = '/inbox', type } = data;

  const options = {
    body,
    icon:   '/favicon.ico',
    badge:  '/favicon.ico',
    tag:    type || 'botbuilder',
    data:   { url },
    actions: type === 'assignment'
      ? [{ action: 'open', title: 'Ver conversación' }]
      : [{ action: 'open', title: 'Abrir bandeja' }],
    requireInteraction: type === 'assignment',
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Click en notificación ─────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/inbox';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Enfocar pestaña ya abierta si existe
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: 'PUSH_NAVIGATE', url });
          return;
        }
      }
      // Abrir nueva pestaña
      return self.clients.openWindow(self.location.origin + url);
    })
  );
});
