// PortOne 결제 검증 + 광고 활성화. 클라이언트 결제 후 호출.
// 서버에서 PortOne API로 실제 결제 상태·금액을 대조해 위변조를 막는다.
// 방어: 금액=서버권위(유효 배너요금만)·uid바인딩·claim-first(동시/중복 리플레이 차단)·PAID엄격.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const PORTONE_API_SECRET = Deno.env.get('PORTONE_API_SECRET')!;

// 유효 배너 정액 요금(원). ad.tsx BANNER_TIERS와 일치 — owner가 monthly_fee를 낮춰 과소결제하는 것 차단.
const VALID_BANNER_FEES = [60000, 100000];

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

  // expected_amount는 금액 권위가 아님(서버 ad.monthly_fee가 SSOT). 받되 무시.
  const { ad_id, payment_id } = await req.json().catch(() => ({} as any));
  if (!ad_id || !payment_id) return json({ ok: false, reason: '잘못된 요청' }, 400);

  const admin = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1) 광고 소유 확인 + 서버 권위 금액(monthly_fee).
  const { data: ad } = await admin.from('ads').select('id, owner_id, status, monthly_fee, format').eq('id', ad_id).single();
  if (!ad || ad.owner_id !== uid) return json({ ok: false, reason: '권한이 없어요' }, 403);
  if (ad.status === 'active') return json({ ok: true, already: true });

  const required = Number(ad.monthly_fee);
  if (!Number.isFinite(required) || required <= 0) return json({ ok: false, reason: '광고 금액 정보를 확인할 수 없어요' });
  // 배너는 유효 정액요금만 활성 허용(owner가 100원 등으로 낮춘 과소결제 차단).
  if (ad.format === 'banner' && !VALID_BANNER_FEES.includes(required)) return json({ ok: false, reason: '유효하지 않은 광고 요금이에요' }, 400);

  // 2) claim-first — 결제 '전에' payments.payment_id UNIQUE 선점. 동시/중복 요청은 단 하나만 통과(리플레이·1결제 다중활성 원천차단).
  const { error: claimErr } = await admin.from('payments')
    .insert({ payment_id, user_id: uid, ad_id, amount: required, status: 'processing', order_name: null });
  if (claimErr) {
    const { data: exist } = await admin.from('payments').select('ad_id, status').eq('payment_id', payment_id).maybeSingle();
    if (exist?.status === 'paid' && exist.ad_id === ad_id) return json({ ok: true, already: true });   // 같은 광고 멱등
    return json({ ok: false, reason: '이미 사용됐거나 처리 중인 결제예요' }, 409);                       // 다른광고 재사용/동시 → 거부
  }
  const rollback = async () => { await admin.from('payments').delete().eq('payment_id', payment_id).eq('status', 'processing'); };

  // 3) PortOne 결제 조회
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

  // 3.5) uid 바인딩 — customData.uid가 있으면서 호출자와 다르면 거부(도용 차단). 통화·부분취소도 확인.
  let cd: any = {}; try { cd = JSON.parse((pay?.customData ?? pay?.payment?.customData) ?? '{}'); } catch { /* */ }
  if (cd?.uid && cd.uid !== uid) { await rollback(); return json({ ok: false, reason: '결제 소유자가 아니에요' }, 403); }

  // 4) 검증: PAID + 원화 + 부분취소 없음 + 금액 = 서버권위
  if (pay?.status !== 'PAID') { await rollback(); return json({ ok: false, reason: `결제가 완료되지 않았어요 (${pay?.status ?? '알수없음'})` }); }
  if (pay?.currency && pay.currency !== 'KRW') { await rollback(); return json({ ok: false, reason: '통화가 올바르지 않아요' }); }
  const cancelled = Number(pay?.cancelledAmount ?? pay?.amount?.cancelled ?? 0);
  if (cancelled > 0) { await rollback(); return json({ ok: false, reason: '취소된 결제예요' }); }
  const paidAmount = Number(pay?.amount?.total ?? pay?.amount?.paid ?? 0);
  if (paidAmount !== required) { await rollback(); return json({ ok: false, reason: '결제 금액이 일치하지 않아요' }); }

  // 5) 활성화(검토중) + 선점행 paid 승격.
  await admin.from('ads').update({ status: 'under_review' }).eq('id', ad_id);
  await admin.from('payments').update({ status: 'paid', amount: paidAmount, order_name: pay?.orderName ?? null }).eq('payment_id', payment_id);
  return json({ ok: true });
});
