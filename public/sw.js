/**
 * Baby Tracker - Service Worker
 * Handles PWA offline shell caching and Android Notification Tray live timer updates.
 */

const CACHE_NAME = 'babytracker-v2';
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
      tag = 'babytracker-active-timer',
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
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((n) => {
        if (n.tag && n.tag.startsWith('babytracker-active-timer')) {
          n.close();
        }
      });
    });
  } else if (type === 'SHOW_REMINDER_NOTIFICATION') {
    const { title, body, tag, actions = [], data = {} } = payload;
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: tag || `babytracker-reminder-${Date.now()}`,
      ongoing: false,
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200, 100, 250],
      timestamp: data.dueTime || Date.now(),
      actions,
      data: {
        ...data,
        url: '/'
      }
    });
  }
});

// Server Web Push Handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'Baby Tracker';
    const options = {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/badge-72.png',
      tag: data.tag || `babytracker-reminder-${Date.now()}`,
      ongoing: false,
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: data.vibrate || [200, 100, 200, 100, 250],
      timestamp: data.timestamp || Date.now(),
      actions: data.actions || [],
      data: data.data || { url: '/' },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.warn('[SW] Push message parse error:', err);
  }
});

// Notification Click Handler (Body & Action Buttons)
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notificationData = event.notification.data || {};
  const timerType = notificationData.timerType;
  const caregiver = notificationData.caregiver || 'Parent';
  const reminderId = notificationData.reminderId;

  // 1. If an active timer action button was tapped in the notification tray
  if (action === 'switch_side' || action === 'finish_timer') {
    event.waitUntil(
      (async () => {
        // Broadcast to any open app windows
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({
            type: 'NOTIFICATION_ACTION',
            action,
            timerType,
            timestamp: Date.now()
          });
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

  // 2. If a reminder action button was tapped (Complete / Snooze)
  if (action === 'complete_reminder' || action === 'snooze_reminder') {
    event.notification.close();
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({
            type: 'NOTIFICATION_ACTION',
            action,
            reminderId,
            timestamp: Date.now()
          });
        }

        // Also call server API so reminder action persists even if tab was suspended
        if (reminderId) {
          try {
            await fetch(`/api/reminders/${encodeURIComponent(reminderId)}/action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action, minutes: 30 })
            });
          } catch (err) {
            console.warn('[SW] Failed to call /api/reminders/:id/action:', err);
          }
        }
      })()
    );
    return;
  }

  // 3. If user tapped the notification body: bring app to front or open it
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (reminderId) {
            client.postMessage({
              type: 'NOTIFICATION_ACTION',
              action: 'open_reminder',
              reminderId,
              timestamp: Date.now()
            });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
