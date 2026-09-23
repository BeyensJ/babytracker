/**
 * Nara Baby - Service Worker
 * Handles PWA offline shell caching and Android Notification Tray live timer updates.
 */

const CACHE_NAME = 'nara-baby-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
  '/icons/badge-72.png'
];

// Install: precache shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Non-critical precache error:', err);
      });
    })
  );
});

// Activate: clean old caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    ])
  );
});

// Fetch: Network-first for navigations and API, Cache-first for immutable static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Pass API requests, websockets, and non-GET requests directly to network
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws') || event.request.method !== 'GET') {
    return;
  }

  // HTML navigation requests: network first with offline fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Static assets: cache-first with network refresh
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for image requests if offline
        if (event.request.destination === 'image') {
          return caches.match('/icons/icon-192.png');
        }
      });
    })
  );
});

// Active Timer Notification Manager
self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { type, payload } = event.data;

  if (type === 'UPDATE_TIMER_NOTIFICATION') {
    if (payload.deliveredByClient) {
      // Notification was already dispatched directly by client window thread
      return;
    }

    const {
      title,
      body,
      actions = [],
      timerType,
      tag = 'nara-active-timer',
      ongoing = true,
      timestamp = Date.now(),
      caregiver = 'Parent',
      silent = true,
      renotify = false,
    } = payload;

    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag,
      ongoing: true, // Keeps pinned in Android notification shade
      renotify: Boolean(renotify),
      silent: Boolean(silent),
      vibrate: silent ? [] : [80],
      timestamp,
      actions,
      data: {
        timerType,
        caregiver,
        url: '/'
      }
    });
  } else if (type === 'CLEAR_TIMER_NOTIFICATION') {
    self.registration.getNotifications({ tag: 'nara-active-timer' }).then((notifications) => {
      notifications.forEach((n) => n.close());
    });
  }
});

// Notification Click Handler (Body & Android Action Buttons)
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notificationData = event.notification.data || {};
  const timerType = notificationData.timerType;
  const caregiver = notificationData.caregiver || 'Parent';

  // 1. If an action button was tapped in the notification tray
  if (action === 'switch_side' || action === 'finish_timer') {
    event.waitUntil(
      (async () => {
        // Broadcast to any open app windows
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        let deliveredToClient = false;

        for (const client of clients) {
          client.postMessage({
            type: 'NOTIFICATION_ACTION',
            action,
            timerType,
            timestamp: Date.now()
          });
          deliveredToClient = true;
        }

        // Also hit server API directly so timer stops even if phone was locked / tab suspended
        try {
          await fetch('/api/timers/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action,
              timerType,
              caregiver
            })
          });
        } catch (err) {
          console.warn('[SW] Failed to call /api/timers/action:', err);
        }

        if (action === 'finish_timer') {
          event.notification.close();
        }
      })()
    );
    return;
  }

  // 2. If user tapped the notification body: bring app to front or open it
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
