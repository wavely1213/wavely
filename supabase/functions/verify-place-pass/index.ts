// PortOne 결제 검증 + 플레이스 분석 이용권 지급. 클라이언트 결제 후 호출.
// 서버에서 PortOne API로 실제 결제 상태·금액을 대조해 위변조를 막고, grant_place_pass로 등급/만료 설정.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const PORTONE_API_SECRET = Deno.env.get('PORTONE_API_SECRET')!;

// 등급별 가격(서버 고정 — 클라이언트 금액을 신뢰하지 않음) + 기간(일)
const PLANS: Record<string, { amount: number; days: number }> = {
  basic: { amount: 20000, days: 30 },    // 월 구독: 본인 매장 무제한
  premium: { amount: 50000, days: 30 },  // 프리미엄: 본인 무제한 + 경쟁사 + 1:1 상담
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

  // 중복 처리 방지 — 이미 기록된 결제면 그대로 통과
  const { data: existing } = await admin.from('payments').select('payment_id, status').eq('payment_id', payment_id).maybeSingle();
  if (existing?.status === 'paid') return json({ ok: true, already: true });

  // 1) PortOne 결제 조회
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

  // 2) 검증: 상태 PAID + 결제 소유자(uid) + 금액 = 서버 고정가
  if (pay?.status !== 'PAID') return json({ ok: false, reason: `결제가 완료되지 않았어요 (${pay?.status ?? '알수없음'})` });

  // 2-1) uid 바인딩 — 결제 생성 시 넣은 customData.uid가 호출자와 다르면 '남의 결제로 이용권 타기'(차단).
  //      fail-open: customData.uid가 '있으면서' 호출자와 다르면만 차단(도용 방지). uid 누락(레거시 클라)은 통과.
  //      ※ 클라(place-rank onPay)가 결제 생성 시 customData:{ uid } 를 넣으면 그때부터 완전 강제됨. verify-payment와 동일 정책.
  let cd: any = {}; try { cd = JSON.parse((pay?.customData ?? pay?.payment?.customData) ?? '{}'); } catch { /* */ }
  if (cd?.uid && cd.uid !== uid) return json({ ok: false, reason: '결제 소유자가 아니에요' }, 403);

  const paidAmount = Number(pay?.amount?.total ?? pay?.amount?.paid ?? 0);
  if (paidAmount !== spec.amount) return json({ ok: false, reason: '결제 금액이 일치하지 않아요' });

  // 3) 이용권 지급(service_role → grant_place_pass)
  const { data: until, error: gerr } = await admin.rpc('grant_place_pass', { p_user: uid, p_plan: plan, p_days: spec.days });
  if (gerr) return json({ ok: false, reason: '이용권 지급 실패: ' + gerr.message });

  // 4) 결제 기록(감사용, 실패해도 지급은 유효)
  try {
    await admin.from('payments').upsert(
      { payment_id, user_id: uid, amount: paidAmount, status: 'paid', order_name: pay?.orderName ?? `place_${plan}` },
      { onConflict: 'payment_id' },
    );
  } catch (_e) { /* ignore */ }

  return json({ ok: true, plan, place_pass_until: until });
});
