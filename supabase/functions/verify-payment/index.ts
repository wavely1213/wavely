// PortOne 결제 검증 + 광고 활성화. 클라이언트 결제 후 호출.
// 서버에서 PortOne API로 실제 결제 상태·금액을 대조해 위변조를 막는다.
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

  const { ad_id, payment_id, expected_amount } = await req.json().catch(() => ({} as any));
  if (!ad_id || !payment_id || !expected_amount) return json({ ok: false, reason: '잘못된 요청' }, 400);

  const admin = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1) 광고 소유 확인
  const { data: ad } = await admin.from('ads').select('id, owner_id, status').eq('id', ad_id).single();
  if (!ad || ad.owner_id !== uid) return json({ ok: false, reason: '권한이 없어요' }, 403);
  if (ad.status === 'active') return json({ ok: true, already: true });

  // 2) PortOne 결제 조회
  let pay: any;
  try {
    const pres = await fetch(`https://api.portone.io/payments/${encodeURIComponent(payment_id)}`, {
      headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` },
    });
    pay = await pres.json();
    if (!pres.ok) return json({ ok: false, reason: '결제 조회 실패' });
  } catch (_e) {
    return json({ ok: false, reason: '결제 서버 연결 실패' });
  }

  // 3) 검증: 상태 PAID + 금액 일치
  if (pay?.status !== 'PAID') return json({ ok: false, reason: `결제가 완료되지 않았어요 (${pay?.status ?? '알수없음'})` });
  const paidAmount = Number(pay?.amount?.total ?? pay?.amount?.paid ?? 0);
  if (paidAmount !== Number(expected_amount)) return json({ ok: false, reason: '결제 금액이 일치하지 않아요' });

  // 4) 결제 완료 → '검토중'으로 (관리자가 내용·사진 검토 후 노출). 노출기간은 승인 시점부터 시작.
  await admin.from('ads').update({ status: 'under_review' }).eq('id', ad_id);
  await admin.from('payments').upsert(
    { payment_id, user_id: uid, ad_id, amount: paidAmount, status: 'paid', order_name: pay?.orderName ?? null },
    { onConflict: 'payment_id' },
  );

  return json({ ok: true });
});
