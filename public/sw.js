// Service Worker for Stage Academy Tracker
// Handles push notifications for recording reminders

const CACHE_NAME = "stage-academy-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener("push", (event) => {
  let data = { title: "Stage Academy", body: "Time to practice!" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: [200, 100, 200],
    tag: "stage-academy-reminder",
    renotify: true,
    data: {
      url: data.url || "/record",
    },
    actions: [
      { action: "record", title: "Start Recording" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/record";

  if (event.action === "record" || !event.action) {
    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          // Focus existing window if open
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && "focus" in client) {
              client.navigate(url);
              return client.focus();
            }
          }
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Periodic sync for reminder checks (if supported)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-reminders") {
    event.waitUntil(
      fetch("/api/cron/reminders")
        .then((res) => res.json())
        .catch(() => {})
    );
  }
});
