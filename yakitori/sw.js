// Keep this game's offline assets separate from the other games on this origin.
const PREFIX = "yakitori:" + new URL(self.registration.scope).pathname + ":";
const CACHE = PREFIX + "menu-1";
const ASSETS = [
  "./", "index.html", "style.css", "art.js", "fonts/menu-round.woff2", "manifest.webmanifest",
  "icon.svg", "icon-192.png", "icon-512.png", "../portal/logos/yakitori.webp",
  "../i18n/dict/yakitori.js", "../i18n/i18n.js",
];
const assetUrls = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll([...assetUrls].map(url => new Request(url, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  url.search = "";
  if (!assetUrls.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = request.mode === "navigate" ? new URL("index.html", self.registration.scope).href : url.href;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(key, response.clone());
      return response;
    } catch {
      return (await cache.match(key)) || Response.error();
    }
  })());
});
