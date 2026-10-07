// 풋살 스튜디오 원격 — 서비스 워커 (/futsal 화면 파일만 네트워크 먼저 · 캐시는 끊겼을 때만)
// PC(터널)·ntfy·와벨리 요청은 손대지 않는다 (respondWith 없음).
const CACHE = "fs-remote-v1";
const SHELL = ["/futsal", "/futsal/app.js", "/futsal/proto.js", "/futsal/app.css", "/futsal/manifest.webmanifest", "/futsal/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("fs-remote-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin || !(u.pathname === "/futsal" || u.pathname.startsWith("/futsal/"))) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match("/futsal"))));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) if (new URL(c.url).pathname.startsWith("/futsal") && "focus" in c) return c.focus();
    return self.clients.openWindow("/futsal");
  }));
});
