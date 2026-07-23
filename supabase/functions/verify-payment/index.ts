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

  // expected_amount는 더 이상 금액 권위가 아님(서버의 ad.monthly_fee가 SSOT). 받되 무시/교차확인용.
  const { ad_id, payment_id, expected_amount } = await req.json().catch(() => ({} as any));
  if (!ad_id || !payment_id) return json({ ok: false, reason: '잘못된 요청' }, 400);

  const admin = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1) 광고 소유 확인 (+ 서버가 정한 금액 monthly_fee를 함께 조회 — 금액 권위는 서버)
  const { data: ad } = await admin.from('ads').select('id, owner_id, status, monthly_fee, format').eq('id', ad_id).single();
  if (!ad || ad.owner_id !== uid) return json({ ok: false, reason: '권한이 없어요' }, 403);
  if (ad.status === 'active') return json({ ok: true, already: true });

  // 1.1) 서버 권위 금액. 클라가 보낸 expected_amount가 아니라 이 값으로 대조한다.
  const required = Number(ad.monthly_fee);
  if (!Number.isFinite(required) || required <= 0) return json({ ok: false, reason: '광고 금액 정보를 확인할 수 없어요' });

  // 1.5) 결제 리플레이 방지 — 이 payment_id가 이미 사용됐는지 검사(verify-place-pass와 동일 가드).
  // 같은 광고면 멱등 성공, 다른 광고에 재사용하려는 시도면 거부(1건 결제로 다수 광고 활성화 차단).
  const { data: usedPay } = await admin.from('payments').select('payment_id, ad_id, status').eq('payment_id', payment_id).maybeSingle();
  if (usedPay && usedPay.status === 'paid') {
    if (usedPay.ad_id === ad_id) return json({ ok: true, already: true });
    return json({ ok: false, reason: '이미 사용된 결제예요' }, 409);
  }

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

  // 2.5) uid 바인딩 — 결제 생성 시 우리 클라가 넣은 customData.uid가 호출자와 다르면 거부(남의 결제 도용 차단).
  //      portone-webhook과 동일 필드경로(customData JSON 파싱). 필드 경로는 pay.customData 또는 pay.payment.customData.
  let cd: any = {}; try { cd = JSON.parse((pay?.customData ?? pay?.payment?.customData) ?? '{}'); } catch { /* */ }
  if (cd?.uid && cd.uid !== uid) return json({ ok: false, reason: '결제 소유자가 아니에요' }, 403);

  // 3) 검증: 상태 PAID + 금액 일치(서버 권위 required와 대조)
  if (pay?.status !== 'PAID') return json({ ok: false, reason: `결제가 완료되지 않았어요 (${pay?.status ?? '알수없음'})` });
  const paidAmount = Number(pay?.amount?.total ?? pay?.amount?.paid ?? 0);
  if (paidAmount !== required) return json({ ok: false, reason: '결제 금액이 일치하지 않아요' });

  // 4) 결제 완료 → '검토중'으로 (관리자가 내용·사진 검토 후 노출). 노출기간은 승인 시점부터 시작.
  await admin.from('ads').update({ status: 'under_review' }).eq('id', ad_id);
  await admin.from('payments').upsert(
    { payment_id, user_id: uid, ad_id, amount: paidAmount, status: 'paid', order_name: pay?.orderName ?? null },
    { onConflict: 'payment_id' },
  );

  return json({ ok: true });
});
