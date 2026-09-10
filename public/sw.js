// Minimal service worker: enables "Install App" (PWA) and handles incoming
// push notifications for the admin panel. No offline caching — this app is
// live-data-driven (bookings, wallet balances), so caching pages would show
// stale data, which is worse than no caching at all.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A push notification arrived (e.g. "New booking", "New funding request").
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "ArewaTecHub", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "ArewaTecHub", {
      body: payload.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url || "/admin" },
    })
  );
});

// Clicking the notification focuses an existing tab if one's open, or opens a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
