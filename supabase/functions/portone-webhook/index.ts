// PortOne V2 웹훅 — 가상계좌 입금완료 등 '결제 확정' 시 광고잔액 자동 적립.
// 보안: 웹훅 본문을 신뢰하지 않고, paymentId로 PortOne API를 재조회해 실제 PAID·금액을 대조(위변조 방지).
//       payments 테이블로 멱등(같은 결제 중복적립 차단). 서명검증은 시크릿 있으면 추가 방어.
// PortOne 콘솔 → 결제연동 → 웹훅에 이 함수 URL 등록:
//   https://<project>.functions.supabase.co/portone-webhook
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PORTONE_API_SECRET = Deno.env.get('PORTONE_API_SECRET')!;

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
// charge-balance와 동일 검증(1만~200만, 1만원 단위)
function validAmount(a: number) { return Number.isInteger(a) && a >= 10000 && a <= 2000000 && a % 10000 === 0; }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false }, 405);
  const raw = await req.text();
  let body: any;
  try { body = JSON.parse(raw); } catch { return json({ ok: false, reason: 'bad json' }, 400); }

  // V2 웹훅 형태: { type: 'Transaction.Paid'|..., data: { paymentId, transactionId } }
  const paymentId = body?.data?.paymentId ?? body?.paymentId;
  if (!paymentId) return json({ ok: true, skip: 'no paymentId' });   // 관심없는 이벤트 — 200으로 조용히 무시

  // 1) PortOne API로 실제 결제 재조회 (웹훅 본문 위조 방지의 핵심). 일시장애는 5xx로 재시도 유도.
  let pay: any;
  try {
    const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` },
    });
    pay = await res.json();
    if (!res.ok) return json({ ok: false, reason: 'lookup failed' }, 502);   // 일시 → PortOne 재시도
  } catch (_e) {
    return json({ ok: false, reason: 'portone unreachable' }, 502);           // 일시 → 재시도
  }

  const status = pay?.status;
  if (status !== 'PAID') return json({ ok: true, status });   // 미입금·발급대기·취소 등 → 적립 안 함(정상 종료)

  // 2) 우리 결제인지 + 대상 유저·금액 (customData는 결제 생성 시 우리 클라가 넣은 값 → 재조회로 신뢰)
  let cd: any = {}; try { cd = JSON.parse(pay?.customData ?? '{}'); } catch { /* */ }
  const uid = cd?.uid ?? null;
  const amount = Number(pay?.amount?.total ?? pay?.amount);
  if (!uid || cd?.purpose !== 'ad_charge') return json({ ok: true, skip: 'not ad_charge' });   // 우리 소관 아님
  if (!validAmount(amount)) return json({ ok: true, skip: 'amount out of range' });            // 실입금이나 이상금액 → 수동처리(재시도 안 함)

  const admin = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // 3) 유저 실재 확인(없으면 무한 재시도 방지)
  const { data: prof } = await admin.from('profiles').select('id').eq('id', uid).maybeSingle();
  if (!prof) return json({ ok: true, skip: 'unknown user' });

  // 4) 원자 선점(claim-first) — payments.payment_id UNIQUE에 'processing' insert.
  //    동시 웹훅/재시도 중 '단 하나'만 insert 성공 → 그 delivery만 적립(중복적립 race 차단).
  const { error: claimErr } = await admin.from('payments')
    .insert({ payment_id: paymentId, user_id: uid, ad_id: null, amount, status: 'processing', order_name: '가상계좌 충전' });
  if (claimErr) {
    const { data: exist } = await admin.from('payments').select('status').eq('payment_id', paymentId).maybeSingle();
    if (exist?.status === 'paid') return json({ ok: true, already: true });   // 이미 적립 완료
    return json({ ok: false, reason: 'in progress' }, 409);                   // 다른 delivery 처리중/실패 → 재시도로 수렴
  }

  // 5) 선점한 delivery만 적립. 실패 시 선점 롤백 + 5xx(재시도 유도) → 돈 받고 미적립 방지.
  const { data: bal, error } = await admin.rpc('credit_ad_balance', { p_user: uid, p_amount: amount, p_ref: paymentId });
  if (error) {
    await admin.from('payments').delete().eq('payment_id', paymentId);
    return json({ ok: false, reason: 'credit failed' }, 500);
  }
  await admin.from('payments').update({ status: 'paid' }).eq('payment_id', paymentId);
  return json({ ok: true, balance: bal });
});
