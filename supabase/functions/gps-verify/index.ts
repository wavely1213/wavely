// GPS 방문 인증 (서버 최종 판정)
// 입력: { review_id, lat, lng } → 사용자 좌표와 매장 좌표 거리를 서버에서 재계산.
// 300m 이내면 service role이 직접 verified=true 처리 → 클라이언트 위조 불가.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { ...cors, 'Content-Type': 'application/json' } });
const RADIUS = 300; // m

function distM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { review_id, lat, lng } = await req.json();
    if (!review_id || typeof lat !== 'number' || typeof lng !== 'number') return json({ ok: false, reason: '입력값 누락' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: rv } = await admin.from('reviews').select('id, store_id, place_id').eq('id', review_id).single();
    if (!rv) return json({ ok: false, reason: '리뷰를 찾을 수 없어요' });

    // 매장 좌표
    let slat: number | null = null, slng: number | null = null;
    if (rv.store_id) {
      const { data: st } = await admin.from('stores').select('lat,lng').eq('id', rv.store_id).single();
      slat = st?.lat ?? null; slng = st?.lng ?? null;
    } else if (rv.place_id) {
      const { data: pl } = await admin.from('places').select('lat,lng').eq('id', rv.place_id).single();
      slat = pl?.lat ?? null; slng = pl?.lng ?? null;
    }
    if (slat == null || slng == null) return json({ ok: false, reason: '매장 위치 정보가 없어요' });

    const d = distM(lat, lng, slat, slng);
    const ok = d <= RADIUS;
    if (ok) await admin.from('reviews').update({ verified: true, verify_method: 'gps' }).eq('id', review_id);

    return json({ ok: true, matched: ok, verified: ok, distance: Math.round(d) });
  } catch (e) {
    return json({ ok: false, reason: String(e) });
  }
});
