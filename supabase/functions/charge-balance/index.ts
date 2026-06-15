// 광고비 충전. 등록된 빌링키로 결제하고 성공 시 잔액 적립 + 원장 기록.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const PORTONE_API_SECRET = Deno.env.get('PORTONE_API_SECRET')!;
const STORE_ID = Deno.env.get('PORTONE_STORE_ID')!;

const ALLOWED = [10000, 30000, 50000, 100000];

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

  const { amount } = await req.json().catch(() => ({} as any));
  if (!ALLOWED.includes(Number(amount))) return json({ ok: false, reason: '충전 금액이 올바르지 않아요' }, 400);

  const admin = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1) 등록된 카드 확인
  const { data: bk } = await admin
    .from('billing_keys')
    .select('billing_key')
    .eq('user_id', uid)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!bk?.billing_key) return json({ ok: false, reason: '등록된 카드가 없어요. 먼저 카드를 등록해 주세요.' });

  // 2) 빌링키로 결제
  const paymentId = `chg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  let pay: any;
  try {
    const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`, {
      method: 'POST',
      headers: { Authorization: `PortOne ${PORTONE_API_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billingKey: bk.billing_key,
        storeId: STORE_ID,
        orderName: '와벨리 광고비 충전',
        amount: { total: Number(amount) },
        currency: 'KRW',
      }),
    });
    pay = await res.json();
    if (!res.ok) return json({ ok: false, reason: pay?.message ?? '결제 실패' });
  } catch (_e) {
    return json({ ok: false, reason: '결제 서버 연결 실패' });
  }

  const status = pay?.payment?.status ?? pay?.status;
  if (status && status !== 'PAID') return json({ ok: false, reason: `결제가 완료되지 않았어요 (${status})` });

  // 3) 잔액 적립 + 원장 기록 (원자적 처리)
  const { data: bal, error: rpcErr } = await admin.rpc('credit_ad_balance', {
    p_user: uid,
    p_amount: Number(amount),
    p_ref: paymentId,
  });
  if (rpcErr) return json({ ok: false, reason: '적립 처리 실패' });

  await admin.from('payments').upsert(
    { payment_id: paymentId, user_id: uid, ad_id: null, amount: Number(amount), status: 'paid', order_name: '광고비 충전' },
    { onConflict: 'payment_id' },
  );

  return json({ ok: true, balance: bal });
});
