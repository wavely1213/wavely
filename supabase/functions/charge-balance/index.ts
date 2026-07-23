// 광고비 충전. 등록된 빌링키로 결제하고 성공 시 잔액 적립 + 원장 기록.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const PORTONE_API_SECRET = Deno.env.get('PORTONE_API_SECRET')!;
const STORE_ID = Deno.env.get('PORTONE_STORE_ID')!;

// 충전 금액: 1만~200만, 1만원 단위 (관리자웹 CHARGE_AMOUNTS 100k~1M 포함)
function validAmount(a: number) { return Number.isInteger(a) && a >= 10000 && a <= 2000000 && a % 10000 === 0; }

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// 멱등키 → 결정론적 paymentId 시드. (uid+키)를 SHA-256 → paymentId가 재시도마다 동일해져
// ①우리 payments.payment_id UNIQUE 선점으로 이중 카드결제 차단 ②credit_ad_balance p_ref 멱등
// ③PortOne 측도 동일 paymentId 재사용을 중복으로 거부 → 3중 방어. (uid 결합으로 유저 간 키 충돌 방지)
async function derivePaymentId(uid: string, key: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${uid}:${key}`));
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `chg-idem-${hex.slice(0, 30)}`;   // 'chg-idem-'(9) + 30 = 39자 ≤ PortOne paymentId 40자 한도
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  const userClient = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser(jwt);
  const uid = u?.user?.id;
  if (!uid) return json({ ok: false, reason: '로그인이 필요해요' }, 401);

  const body = await req.json().catch(() => ({} as any));
  const amount = body?.amount;
  // 하위호환: 멱등키 없으면 기존(랜덤 paymentId) 동작 그대로. 있으면 claim-first 멱등 경로.
  const idempotencyKey = (typeof body?.idempotencyKey === 'string' && body.idempotencyKey.trim())
    ? body.idempotencyKey.trim() : null;
  if (!validAmount(Number(amount))) return json({ ok: false, reason: '충전 금액이 올바르지 않아요' }, 400);

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

  // paymentId: 멱등키 있으면 결정론적 시드, 없으면 기존 랜덤(하위호환)
  const paymentId = idempotencyKey
    ? await derivePaymentId(uid, idempotencyKey)
    : `chg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  // 2) 멱등키 경로: 결제 '전에' payments UNIQUE(payment_id)에 'processing' 선점(claim-first, portone-webhook 58-64 패턴).
  //    동시/중복 요청 중 단 하나만 insert 성공 → 나머지는 카드결제 스킵하고 기존 결과 반환(이중결제 차단).
  if (idempotencyKey) {
    const { error: claimErr } = await admin.from('payments')
      .insert({ payment_id: paymentId, user_id: uid, ad_id: null, amount: Number(amount), status: 'processing', order_name: '광고비 충전' });
    if (claimErr) {
      const { data: exist } = await admin.from('payments').select('status').eq('payment_id', paymentId).maybeSingle();
      if (exist?.status === 'paid') return json({ ok: true, already: true });               // 이미 충전 완료 → 재결제 안 함
      return json({ ok: false, reason: '이미 처리 중인 충전이에요. 잠시 후 잔액을 확인해 주세요.' }, 409);  // 진행중/이전실패 → 재시도로 수렴
    }
  }

  // 3) 빌링키로 결제
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
    if (!res.ok) {
      // 결제 자체 실패 → 선점 롤백(재시도 허용). 결정론적 paymentId라 PortOne이 중복결제는 자체 차단.
      if (idempotencyKey) await admin.from('payments').delete().eq('payment_id', paymentId);
      return json({ ok: false, reason: pay?.message ?? '결제 실패' });
    }
  } catch (_e) {
    if (idempotencyKey) await admin.from('payments').delete().eq('payment_id', paymentId);
    return json({ ok: false, reason: '결제 서버 연결 실패' });
  }

  // status 미확인 시에도 실패 처리(엄격화) — falsy-skip 금지: 확실히 'PAID'가 아니면 적립 안 함.
  const status = pay?.payment?.status ?? pay?.status;
  if (status !== 'PAID') {
    if (idempotencyKey) await admin.from('payments').delete().eq('payment_id', paymentId);   // 결제 미완료 → 선점 롤백(재시도 허용)
    return json({ ok: false, reason: `결제가 완료되지 않았어요 (${status ?? '상태미확인'})` });
  }

  // 4) 잔액 적립 + 원장 기록 (원자적 처리). credit_ad_balance는 p_ref(=paymentId)로 멱등 — 시그니처 유지.
  const { data: bal, error: rpcErr } = await admin.rpc('credit_ad_balance', {
    p_user: uid,
    p_amount: Number(amount),
    p_ref: paymentId,
  });
  if (rpcErr) {
    // 카드는 PAID인데 적립만 실패 → '돈 받고 미적립' 상태. 선점행을 'processing'으로 남겨 정산 추적(삭제/자동재결제 안 함).
    return json({ ok: false, reason: '결제는 됐지만 적립 처리에 실패했어요. 잠시 후 잔액을 확인하거나 고객센터에 문의해 주세요.' });
  }

  // 5) 최종 기록. 멱등키 경로는 선점행을 'paid'로 승격, 아니면 기존처럼 upsert.
  if (idempotencyKey) {
    await admin.from('payments').update({ status: 'paid' }).eq('payment_id', paymentId);
  } else {
    await admin.from('payments').upsert(
      { payment_id: paymentId, user_id: uid, ad_id: null, amount: Number(amount), status: 'paid', order_name: '광고비 충전' },
      { onConflict: 'payment_id' },
    );
  }

  return json({ ok: true, balance: bal });
});
