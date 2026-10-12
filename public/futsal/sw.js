// 풋살 스튜디오 원격 — 서비스 워커 (이 페이지 파일만 네트워크 먼저 · 캐시는 끊겼을 때만)
// PC(터널)·ntfy 요청은 손대지 않는다 (respondWith 없음). 경로는 등록 범위 BASE 에서 나온다 (futsal.mulgyeol.kr 은 "/").
const CACHE = "fs-remote-v3";
const BASE = new URL(self.registration.scope).pathname;
const SHELL = ["", "app.js", "proto.js", "app.css", "manifest.webmanifest", "icon-192.png"].map(f => BASE + f);

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
  if (u.origin !== self.location.origin || !u.pathname.startsWith(BASE)) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match(BASE))));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) if (new URL(c.url).pathname.startsWith(BASE) && "focus" in c) return c.focus();
    return self.clients.openWindow(BASE);
  }));
});
