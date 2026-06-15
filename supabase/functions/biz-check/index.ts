// 사업자등록번호 진위확인 (국세청 상태조회) 중계 서버
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { b_no } = await req.json();
    const num = String(b_no ?? '').replace(/[^0-9]/g, '');
    if (num.length !== 10) {
      return new Response(JSON.stringify({ valid: false, reason: '10자리 숫자가 아니에요' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    const key = Deno.env.get('NTS_KEY') ?? '';
    const url = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(key)}`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ b_no: [num] }) });
    const data = await res.json();
    const item = data?.data?.[0];
    const bStt = item?.b_stt ?? '';
    const valid = item?.b_stt_cd === '01'; // 01 = 계속사업자
    return new Response(JSON.stringify({ valid, b_stt: bStt, tax_type: item?.tax_type ?? '' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false, error: String(e) }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
