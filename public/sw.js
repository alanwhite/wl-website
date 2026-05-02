// Service Worker for Web Push Notifications

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    data: { url: data.url || "/" },
    tag: data.tag || "default",
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options).then(() => {
      // Set app badge count (supported on Android/desktop, iOS via PWA)
      if (self.navigator && self.navigator.setAppBadge) {
        self.navigator.setAppBadge(data.badgeCount || 1);
      }
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if one is open on the same origin
      for (const client of windowClients) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url);
    }).then(() => {
      // Clear badge when notification is tapped
      if (self.navigator && self.navigator.setAppBadge) {
        self.navigator.clearAppBadge();
      }
    }),
  );
});
