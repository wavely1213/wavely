// 풋살 스튜디오 원격 — 서비스 워커 (이 페이지 파일만 네트워크 먼저 · 캐시는 끊겼을 때만)
// PC(터널 · 밖에서 작업 스튜디오 포함)·ntfy 요청은 손대지 않는다 (respondWith 없음 · 다른 출처는 아예 보지 않음).
// 경로는 등록 범위(scope)에서 나온다 (futsal.mulgyeol.kr 은 "/") — 다른 앞머리(예: /alt/fs)에 놓아도 같은 파일 (D-233).
const CACHE = "fs-remote-v7";
const ROOT = new URL(self.registration.scope).pathname.replace(/\/$/, "");  // 앞머리 (뿌리면 "")
const HOME = ROOT || "/";                                                    // 페이지 주소
const SHELL = [HOME, ...["app.js", "proto.js", "app.css", "manifest.webmanifest", "icon-192.png"].map(f => ROOT + "/" + f)];

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
  if (u.origin !== self.location.origin || !(u.pathname === HOME || u.pathname === ROOT || u.pathname.startsWith(ROOT + "/"))) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok && res.type === "basic" && !res.redirected) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || offline(r, u))));
});
// 끊겼고 캐시에도 없을 때: 페이지 주소가 아니면 vercel.json 처럼 HOME 으로 넘김(깊은 주소에서 상대 경로가 어긋나지 않게) · 파일은 HTML 대신 오류
function offline(r, u) {
  if (r.mode !== "navigate") return Response.error();
  if (u.pathname !== HOME) return Response.redirect(new URL(HOME + u.search, self.location).href, 302);
  return caches.match(HOME).then(m => m || Response.error());
}
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) if (new URL(c.url).pathname.startsWith(HOME) && "focus" in c) return c.focus();
    return self.clients.openWindow(HOME);
  }));
});
