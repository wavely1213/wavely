// 알림/푸시 link → 앱 실존 라우트로 안전 해석.
// 서버·DB가 넣는 link를 신뢰하지 않고, 웹전용 탭경로는 앱 등가로 매핑하고,
// 앱에 실제 있는 라우트 화이트리스트만 통과시켜 not-found·크래시를 방지.

// 웹(공유 백엔드) 탭 경로 → 앱 등가 경로
const WEB_TO_APP: Record<string, string> = {
  '/community': '/',
  '/neighborhood': '/explore',
  '/mypage': '/account',
  '/my': '/account',
};

// 앱에 존재하는 라우트. '/'로 끝나는 항목은 하위경로(/post/123 등) 허용, 아니면 정확일치.
const OK_EXACT = ['/', '/explore', '/account', '/jobs', '/market', '/hot', '/notifications', '/keywords', '/ad', '/admin-dashboard'];
const OK_PREFIX = ['/jobs/', '/post/', '/chat/', '/store/', '/place/', '/market/'];

export function resolveNotiRoute(link: unknown): string | null {
  if (typeof link !== 'string' || !link.startsWith('/')) return null;
  const path = link.split('?')[0];
  if (WEB_TO_APP[path]) return WEB_TO_APP[path];
  if (OK_EXACT.includes(path)) return link;
  if (OK_PREFIX.some((p) => path.startsWith(p) && path.length > p.length)) return link;
  return null;
}
