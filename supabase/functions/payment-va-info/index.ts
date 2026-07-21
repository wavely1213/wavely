// 발급된 가상계좌 정보 조회(표시용). 본인 결제만 — customData.uid === 호출자.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
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

  const { payment_id } = await req.json().catch(() => ({} as any));
  if (!payment_id) return json({ ok: false, reason: '잘못된 요청' }, 400);

  let pay: any;
  try {
    const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(payment_id)}`, {
      headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` },
    });
    pay = await res.json();
    if (!res.ok) return json({ ok: false, reason: '조회 실패' });
  } catch (_e) {
    return json({ ok: false, reason: '결제 서버 연결 실패' });
  }

  // 본인 결제만 노출
  let owner: string | null = null;
  try { owner = JSON.parse(pay?.customData ?? '{}')?.uid ?? null; } catch { /* */ }
  if (owner !== uid) return json({ ok: false, reason: '권한이 없어요' }, 403);

  const va = pay?.paymentMethod?.virtualAccount ?? pay?.virtualAccount ?? {};
  return json({
    ok: true,
    status: pay?.status,                         // ISSUED(발급) → 입금 후 PAID
    bank: va?.bank ?? va?.bankCode ?? null,
    accountNumber: va?.accountNumber ?? null,
    amount: pay?.amount?.total ?? null,
    expiredAt: va?.accountExpiry ?? pay?.virtualAccount?.accountExpiry ?? null,
  });
});
