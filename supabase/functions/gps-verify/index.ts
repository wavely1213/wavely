// GPS 방문 인증 (서버 최종 판정)
// 입력: { review_id, lat, lng } → 사용자 좌표와 매장 좌표 거리를 서버에서 재계산.
// 300m 이내면 service role이 직접 verified=true 처리 → 클라이언트 위조 불가.
//
// 보안: 반드시 로그인(JWT) 필요 + 본인 리뷰만 인증 가능.
//   - Authorization 헤더의 JWT로 uid 강제(없으면 401).
//   - 리뷰의 author_id !== uid 면 403 (남의 review_id 로 verified 위조 차단).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
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
    // 1) 인증 강제 — Authorization 헤더의 JWT로 로그인 사용자 확인
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: u } = await userClient.auth.getUser(jwt);
    const uid = u?.user?.id;
    if (!uid) return json({ ok: false, reason: '로그인이 필요해요' }, 401);

    const { review_id, lat, lng } = await req.json();
    if (!review_id || typeof lat !== 'number' || typeof lng !== 'number') return json({ ok: false, reason: '입력값 누락' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // 2) 리뷰 로드 — author_id 포함해서 소유권 검증
    const { data: rv } = await admin.from('reviews').select('id, author_id, store_id, place_id').eq('id', review_id).single();
    if (!rv) return json({ ok: false, reason: '리뷰를 찾을 수 없어요' }, 404);

    // 3) 소유권 검증 — 본인 리뷰만 인증 가능(남의 리뷰 조작 차단)
    if (rv.author_id !== uid) return json({ ok: false, reason: '본인 리뷰만 인증할 수 있어요' }, 403);

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
    return json({ ok: false, reason: String(e) }, 500);
  }
});
