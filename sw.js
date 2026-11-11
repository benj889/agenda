const CACHE = "agenda-v2";
const SHELL = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  const sameOrigin = u.origin === location.origin;
  const staticCdn = /(^|\.)gstatic\.com$/.test(u.hostname) || u.hostname === "fonts.googleapis.com";
  if (!sameOrigin && !staticCdn) return; // Firebase (données, connexion) : jamais mis en cache ici
  // Page et configuration : toujours la dernière version en ligne, la copie locale seulement hors ligne
  const fresh = sameOrigin && (e.request.mode === "navigate" || /\/(index\.html|config\.js|sw\.js)?$/.test(u.pathname));
  if (fresh) {
    e.respondWith(fetch(e.request, { cache: "no-store" }).then(r => {
      if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request).then(h => h || caches.match("./index.html"))));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
