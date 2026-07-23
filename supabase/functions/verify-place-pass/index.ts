// PortOne 결제 검증 + 플레이스 분석 이용권 지급. 클라이언트 결제 후 호출.
// 방어: 서버 고정가·uid바인딩·claim-first(동시/중복 이용권 지급 차단)·PAID/통화/취소 엄격.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const PORTONE_API_SECRET = Deno.env.get('PORTONE_API_SECRET')!;

// 등급별 가격(서버 고정 — 클라 금액 불신) + 기간(일)
const PLANS: Record<string, { amount: number; days: number }> = {
  basic: { amount: 20000, days: 30 },
  premium: { amount: 50000, days: 30 },
};

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

  const { plan, payment_id } = await req.json().catch(() => ({} as any));
  const spec = PLANS[plan];
  if (!spec || !payment_id) return json({ ok: false, reason: '잘못된 요청' }, 400);

  const admin = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1) claim-first — 결제 '전에' payments.payment_id UNIQUE 선점. 동시/중복 요청은 하나만 통과(이중 이용권 지급 차단).
  const { error: claimErr } = await admin.from('payments')
    .insert({ payment_id, user_id: uid, amount: spec.amount, status: 'processing', order_name: `place_${plan}` });
  if (claimErr) {
    const { data: exist } = await admin.from('payments').select('status').eq('payment_id', payment_id).maybeSingle();
    if (exist?.status === 'paid') return json({ ok: true, already: true });
    return json({ ok: false, reason: '이미 사용됐거나 처리 중인 결제예요' }, 409);
  }
  const rollback = async () => { await admin.from('payments').delete().eq('payment_id', payment_id).eq('status', 'processing'); };

  // 2) PortOne 결제 조회
  let pay: any;
  try {
    const pres = await fetch(`https://api.portone.io/payments/${encodeURIComponent(payment_id)}`, {
      headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` },
    });
    pay = await pres.json();
    if (!pres.ok) { await rollback(); return json({ ok: false, reason: '결제 조회 실패' }); }
  } catch (_e) {
    await rollback(); return json({ ok: false, reason: '결제 서버 연결 실패' });
  }

  // 3) 검증: PAID + uid바인딩 + 통화 + 부분취소 + 금액=서버고정가
  if (pay?.status !== 'PAID') { await rollback(); return json({ ok: false, reason: `결제가 완료되지 않았어요 (${pay?.status ?? '알수없음'})` }); }
  let cd: any = {}; try { cd = JSON.parse((pay?.customData ?? pay?.payment?.customData) ?? '{}'); } catch { /* */ }
  if (cd?.uid && cd.uid !== uid) { await rollback(); return json({ ok: false, reason: '결제 소유자가 아니에요' }, 403); }
  if (pay?.currency && pay.currency !== 'KRW') { await rollback(); return json({ ok: false, reason: '통화가 올바르지 않아요' }); }
  const cancelled = Number(pay?.cancelledAmount ?? pay?.amount?.cancelled ?? 0);
  if (cancelled > 0) { await rollback(); return json({ ok: false, reason: '취소된 결제예요' }); }
  const paidAmount = Number(pay?.amount?.total ?? pay?.amount?.paid ?? 0);
  if (paidAmount !== spec.amount) { await rollback(); return json({ ok: false, reason: '결제 금액이 일치하지 않아요' }); }

  // 4) 이용권 지급. 실패 시 선점 롤백(재시도 허용).
  const { data: until, error: gerr } = await admin.rpc('grant_place_pass', { p_user: uid, p_plan: plan, p_days: spec.days });
  if (gerr) { await rollback(); return json({ ok: false, reason: '이용권 지급 실패: ' + gerr.message }); }

  // 5) 선점행 paid 승격(감사).
  await admin.from('payments').update({ status: 'paid', amount: paidAmount, order_name: pay?.orderName ?? `place_${plan}` }).eq('payment_id', payment_id);

  return json({ ok: true, plan, place_pass_until: until });
});
