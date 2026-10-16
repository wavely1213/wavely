// 오프라인용 서비스 워커 (웹사이트 빌드만). 화면은 인터넷이 되면 새로 받고(안 되면 보관본), 악기 샘플은 보관본을 먼저 쓴다.
// 버전·보관할 파일 목록은 build.mjs가 채운다. 버전이 바뀌면 옛 보관함을 지운다.
const CACHE = 'mulgyeol-music-__VERSION__';
const SHELL = __FILES__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mulgyeol-music-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // 악기 샘플·아이콘: 보관본 먼저 (버전마다 같은 파일)
  if (/\/samples\/|\.png$|\.svg$|\.webmanifest$/.test(req.url)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); e.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy))); }
      return res;
    })));
    return;
  }
  // 화면(HTML): 인터넷 먼저, 안 되면 보관본
  // 앱 화면(HTML)만 보관한다 — sw.js 같은 다른 파일을 주소창으로 열어도 보관본이 바뀌지 않게
  if (req.mode === 'navigate') {
    const home = new URL('./', self.registration.scope).href;
    e.respondWith(fetch(req).then((res) => {
      if (res.ok && (res.headers.get('content-type') || '').includes('text/html')) {
        const copy = res.clone();
        e.waitUntil(caches.open(CACHE).then((c) => c.put(home, copy)));
      }
      return res;
    }).catch(() => caches.match(home)));
  }
});
