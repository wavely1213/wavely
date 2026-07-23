// 회원 탈퇴 (소프트 탈퇴)
// 호출자의 JWT로 본인을 식별 → 프로필 익명화 + 계정 정지(재로그인 차단).
// 작성한 글·리뷰는 '탈퇴회원'으로 남아 커뮤니티가 깨지지 않음.
// + 결제수단(빌링키) 정리 · 활성 광고 일시중지 · 잔액 소멸(감사기록) 추가.
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

    // 2) 프로필 익명화 + 탈퇴 표시 + PII(전화·프로필사진) 제거
    await admin.from('profiles').update({
      nickname: '탈퇴회원', deleted_at: new Date().toISOString(),
      is_admin: false, biz_verified: false, company_id: null, biz_no: null,
      phone: null, avatar_url: null,
    }).eq('id', uid);

    // 3) 본인 소유 매장은 광고/노출 정리 (선택)
    await admin.from('stores').update({ is_ad: false, ad_weight: 0 }).eq('owner_id', uid);

    // 3-a) 결제수단(빌링키) 정리: PortOne에 저장된 자동결제 카드 토큰을 원격 폐기 후 로컬 상태를 'deleted'로.
    //      PortOne 삭제가 실패(네트워크·이미 폐기·키미설정 등)해도 로컬 status는 반드시 갱신 → 유령 카드 방지.
    try {
      const secret = Deno.env.get('PORTONE_API_SECRET');
      const { data: keys } = await admin
        .from('billing_keys')
        .select('billing_key')
        .eq('user_id', uid)
        .eq('status', 'active');
      for (const k of keys ?? []) {
        const bkey = (k as { billing_key?: string })?.billing_key;
        if (!secret || !bkey) continue;
        try {
          await fetch(`https://api.portone.io/billing-keys/${encodeURIComponent(bkey)}`, {
            method: 'DELETE',
            headers: { Authorization: `PortOne ${secret}` },
          });
        } catch (_) {
          // PortOne 원격 폐기 실패 — 로컬 무효화는 아래에서 계속 진행
        }
      }
    } catch (_) {
      // 카드 조회 실패해도 아래 로컬 무효화는 시도
    }
    // 로컬 빌링키 무효화(원격 성공/실패 무관): 이후 charge-balance가 active 카드를 못 찾게 됨.
    await admin.from('billing_keys').update({ status: 'deleted' }).eq('user_id', uid).eq('status', 'active');

    // 3-b) 활성 광고 일시중지: 노출/과금 중이거나 결제·심사 대기인 광고를 모두 멈춤.
    await admin.from('ads').update({ status: 'paused' })
      .eq('owner_id', uid)
      .in('status', ['active', 'under_review', 'pending_payment']);

    // 3-c) 잔액 소멸 + 감사기록: 현 정책은 탈퇴 시 광고잔액 forfeit(소멸).
    //      ad_balance/ad_free를 0으로 만들기 전에 ad_ledger에 forfeit 원장을 남겨 소멸 이력을 보존.
    try {
      const { data: prof } = await admin
        .from('profiles')
        .select('ad_balance, ad_free')
        .eq('id', uid)
        .maybeSingle();
      const bal = Number((prof as { ad_balance?: number } | null)?.ad_balance ?? 0);
      if (bal > 0) {
        await admin.from('ad_ledger').insert({
          user_id: uid,
          type: 'forfeit',
          amount: -bal,
          balance_after: 0,
          ref: 'delete-account',
          memo: '탈퇴 잔액 소멸',
        });
      }
      await admin.from('profiles').update({ ad_balance: 0, ad_free: 0 }).eq('id', uid);
    } catch (_) {
      // 감사기록/잔액정리 실패해도 탈퇴(정지) 자체는 계속 진행
    }

    // 4) 재사용 가능한 PII(이메일) 제거 + 계정 정지(재로그인 차단). 행은 남겨 작성 콘텐츠 FK를 익명 보존.
    //    Apple 5.1.1(v)/개인정보: '비활성화'가 아니라 실제 개인식별정보를 삭제. 이메일을 비식별 값으로 치환.
    try {
      await admin.auth.admin.updateUserById(uid, {
        email: `deleted+${uid}@deleted.invalid`, email_confirm: true,
        ban_duration: '876000h', user_metadata: {}, app_metadata: {},
      });
    } catch (_) {
      // 이메일 치환 실패(예: 폰 가입) 시에도 최소 정지는 보장
      await admin.auth.admin.updateUserById(uid, { ban_duration: '876000h' });
    }

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, reason: String(e) }, 500);
  }
});
