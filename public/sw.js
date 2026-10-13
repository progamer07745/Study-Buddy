const CACHE_NAME = "study-buddy-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("study-buddy-shell-")).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/tasks/") || url.pathname.startsWith("/users/") || url.pathname.startsWith("/leaderboard") || url.pathname.startsWith("/notifications/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })());
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; }
  catch { payload = { body: event.data?.text() || "لديك تحديث جديد في Study Buddy." }; }
  const title = payload.title || "Study Buddy";
  const options = {
    body: payload.body || "افتح التطبيق لمتابعة يومك.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || "study-buddy-notification",
    renotify: Boolean(payload.renotify),
    requireInteraction: Boolean(payload.requireInteraction),
    data: { url: payload.url || "/", ...(payload.data || {}) },
    actions: Array.isArray(payload.actions) ? payload.actions.slice(0, 2) : [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLOSE_NOTIFICATION" && typeof event.data.tag === "string") {
    event.waitUntil(self.registration.getNotifications({ tag: event.data.tag }).then((notifications) => {
      notifications.forEach((notification) => notification.close());
    }));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
