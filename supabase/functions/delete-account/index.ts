// 회원 탈퇴 (소프트 탈퇴)
// 호출자의 JWT로 본인을 식별 → 프로필 익명화 + 계정 정지(재로그인 차단).
// 작성한 글·리뷰는 '탈퇴회원'으로 남아 커뮤니티가 깨지지 않음.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return json({ ok: false, reason: '인증 정보가 없어요' }, 401);

    // 1) 호출자 본인 확인 (JWT 기반 — body 값 신뢰 X)
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, reason: '로그인이 필요해요' }, 401);
    const uid = user.id;

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // 2) 프로필 익명화 + 탈퇴 표시
    await admin.from('profiles').update({
      nickname: '탈퇴회원', deleted_at: new Date().toISOString(),
      is_admin: false, biz_verified: false, company_id: null, biz_no: null,
    }).eq('id', uid);

    // 3) 본인 소유 매장은 광고/노출 정리 (선택)
    await admin.from('stores').update({ is_ad: false, ad_weight: 0 }).eq('owner_id', uid);

    // 4) 계정 정지 → 재로그인 차단 (행은 남겨 작성 컨텐츠 FK 유지)
    await admin.auth.admin.updateUserById(uid, { ban_duration: '876000h' });

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, reason: String(e) }, 500);
  }
});
