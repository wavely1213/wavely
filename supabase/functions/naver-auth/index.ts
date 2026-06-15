// 네이버 로그인 OAuth 콜백 처리 Edge Function
// 흐름: 앱 → 네이버 authorize → (여기) 콜백 → 코드교환 → 프로필 → Supabase 유저 보장 → 매직링크로 세션 발급 → 앱으로 리다이렉트
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const NAVER_ID = Deno.env.get('NAVER_CLIENT_ID')!;
const NAVER_SECRET = Deno.env.get('NAVER_CLIENT_SECRET')!;
const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// state(base64 JSON)에서 앱 복귀 URL을 꺼냄. 실패 시 null → site_url 기본값 사용.
function returnFromState(state: string): string | null {
  try {
    const json = JSON.parse(atob(state.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof json?.r === 'string' && /^(https?:\/\/|wavely:\/\/)/.test(json.r)) return json.r;
  } catch { /* ignore */ }
  return null;
}

function errRedirect(base: string | null, reason: string): Response {
  const b = base ?? `${SB_URL}`;
  const sep = b.includes('?') ? '&' : '?';
  // 앱 로그인 화면으로 에러 전달
  const target = base ? `${base}${base.endsWith('/') ? '' : '/'}login${sep}naver_error=${reason}` : `${SB_URL}`;
  return Response.redirect(target, 302);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') ?? '';
  const returnUrl = returnFromState(state); // null이면 generateLink가 site_url로 보냄

  if (!code) return errRedirect(returnUrl, 'no_code');

  // 1) 인가코드 → 네이버 액세스 토큰
  const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${NAVER_ID}&client_secret=${NAVER_SECRET}&code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
  const tokenRes = await fetch(tokenUrl);
  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenJson?.access_token) return errRedirect(returnUrl, 'token_failed');

  // 2) 네이버 프로필 조회
  const meRes = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const meJson = await meRes.json().catch(() => ({}));
  const p = meJson?.response;
  if (!p?.email) return errRedirect(returnUrl, 'no_email');

  const email: string = p.email;
  const nickname: string = p.nickname || p.name || '네이버사용자';

  // 3) Supabase 유저 보장 (없으면 생성 — 프로필 트리거가 메타데이터로 profiles 생성)
  const admin = createClient(SB_URL, SB_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
  await admin.auth.admin
    .createUser({
      email,
      email_confirm: true,
      user_metadata: { nickname, role: 'staff', provider: 'naver', naver_id: p.id ?? null },
    })
    .catch(() => { /* 이미 있으면 무시 */ });

  // 4) 매직링크 생성 → 브라우저를 그 링크로 보내면 Supabase가 세션을 만들고 앱으로 리다이렉트
  const { data: link, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: returnUrl ? { redirectTo: returnUrl } : undefined,
  });
  if (error || !link?.properties?.action_link) return errRedirect(returnUrl, 'link_failed');

  return Response.redirect(link.properties.action_link, 302);
});
