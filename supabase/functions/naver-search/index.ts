const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    // 함수의 출구 IP가 어느 나라인지 확인
    let ipInfo: any = {};
    try {
      const ipRes = await fetch('http://ip-api.com/json/?fields=country,countryCode,query,as');
      ipInfo = await ipRes.json();
    } catch (e) {
      ipInfo = { error: String(e) };
    }
    return new Response(JSON.stringify({ egress: ipInfo }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
