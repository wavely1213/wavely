// 광고 활성화 (서버에서만 매장 노출 가중치 반영)
// 입력: { ad_id }  → 결제 완료된 광고를 active로 바꾸고 매장 is_ad/ad_weight 설정.
// ad_weight는 상한이 있어 별점 낮은 매장을 무한정 위로 올리지 못함(상대평가 + 한계).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { ...cors, 'Content-Type': 'application/json' } });

// 입찰가/정액 → 가중치(0~18 상한). 입찰가 높을수록 상위지만 한계가 있음.
function adWeight(plan: string, bid: number, fee: number): number {
  if (plan === 'bid') return Math.min(Math.round(bid / 500), 18);
  // 정액: 요금제 티어별 차등 가산점
  if (fee >= 90000) return 12;
  if (fee >= 50000) return 8;
  return 5;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const SB_URL = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(SB_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // ── 관리자만 수동 활성화 가능 ──
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SB_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
    const uid = u?.user?.id;
    if (!uid) return json({ ok: false, reason: '로그인이 필요해요' });
    const { data: prof } = await admin.from('profiles').select('is_admin').eq('id', uid).single();
    if (!prof?.is_admin) return json({ ok: false, reason: '관리자만 활성화할 수 있어요' });

    const { ad_id, days = 30 } = await req.json();
    if (!ad_id) return json({ ok: false, reason: 'ad_id 누락' });

    const { data: ad } = await admin.from('ads').select('id, store_id, plan, bid_amount, monthly_fee, status, format').eq('id', ad_id).single();
    if (!ad) return json({ ok: false, reason: '광고를 찾을 수 없어요' });

    const now = new Date();
    const ends = new Date(now.getTime() + Number(days) * 86400000);
    await admin.from('ads').update({ status: 'active', starts_at: now.toISOString(), ends_at: ends.toISOString() }).eq('id', ad_id);

    // 배너형은 별도 노출 슬롯이라 순위 가중치를 건드리지 않음. 가산점형만 매장 is_ad/ad_weight 반영.
    let w = 0;
    if (ad.format !== 'banner') {
      w = adWeight(ad.plan, ad.bid_amount ?? 0, ad.monthly_fee ?? 0);
      await admin.from('stores').update({ is_ad: true, ad_weight: w }).eq('id', ad.store_id);
    }

    return json({ ok: true, status: 'active', format: ad.format, ad_weight: w, ends_at: ends.toISOString() });
  } catch (e) {
    return json({ ok: false, reason: String(e) });
  }
});
