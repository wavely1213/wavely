// 빌링키(자동결제 카드) 등록. 클라이언트가 PortOne로 발급받은 billingKey를 서버에서 검증 후 저장.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const PORTONE_API_SECRET = Deno.env.get('PORTONE_API_SECRET')!;

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  const userClient = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser(jwt);
  const uid = u?.user?.id;
  if (!uid) return json({ ok: false, reason: '로그인이 필요해요' }, 401);

  const { billing_key } = await req.json().catch(() => ({} as any));
  if (!billing_key) return json({ ok: false, reason: '잘못된 요청' }, 400);

  // 1) PortOne로 빌링키 조회·검증
  let bk: any;
  try {
    const res = await fetch(`https://api.portone.io/billing-keys/${encodeURIComponent(billing_key)}`, {
      headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` },
    });
    bk = await res.json();
    if (!res.ok) return json({ ok: false, reason: bk?.message ?? '카드 조회 실패' });
  } catch (_e) {
    return json({ ok: false, reason: '결제 서버 연결 실패' });
  }
  if (bk?.status && bk.status !== 'ISSUED') return json({ ok: false, reason: `카드 상태 오류 (${bk.status})` });

  // 카드 정보 추출 (PortOne V2 응답 구조가 채널별로 달라 방어적으로 파싱)
  const method = bk?.methods?.[0] ?? bk?.method ?? {};
  const card = method?.card ?? bk?.card ?? {};
  const cardName = card?.name ?? card?.publisher ?? card?.issuer ?? '등록 카드';
  const masked = card?.number ?? card?.maskedNumber ?? null;

  const admin = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // 기존 활성 카드는 교체 (한 사람당 카드 1장)
  await admin.from('billing_keys').update({ status: 'deleted' }).eq('user_id', uid).eq('status', 'active');
  const { error } = await admin.from('billing_keys').insert({
    user_id: uid,
    billing_key,
    card_name: cardName,
    card_number_masked: masked,
    status: 'active',
  });
  if (error) return json({ ok: false, reason: '저장 실패' });

  return json({ ok: true, card_name: cardName, masked });
});
