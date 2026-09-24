// Minimal service worker: enables PWA installability signals and a graceful
// offline fallback for page navigations. Deliberately does NOT cache JS/CSS
// bundles or API responses — Next.js already serves hashed, immutably-cached
// build assets, and caching those here would only risk serving stale chunks
// after a deploy. Only the small offline fallback page is precached.

const CACHE = "messy-shell-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
  );
});

// Web Push — admin-sent notifications to members. Purely additive to the
// offline-fallback behavior above; does not touch install/activate/fetch.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Messy";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/order" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/order";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});

// The push service can rotate or expire a subscription on its own (browser update, key
// rotation, long inactivity). Without this, the server keeps the dead endpoint and the member
// silently stops getting pushes until they happen to re-enable. Resubscribe with the same key
// and tell the server, replacing the old endpoint. Same-origin fetch carries the session cookie.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const key = event.oldSubscription?.options?.applicationServerKey;
      const sub =
        event.newSubscription ||
        (key ? await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }) : null);
      if (!sub) return;
      await fetch("/api/member/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sub.toJSON(), mode: "replace", replaces: event.oldSubscription?.endpoint }),
      });
    })(),
  );
});
