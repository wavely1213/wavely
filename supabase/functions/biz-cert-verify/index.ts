// 사업자등록증 자동 인증
// 등록증 이미지 OCR → 번호·대표자명·개업일자 추출 → 국세청 진위확인(validate) → 통과 시 자동 사업주 인증.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

function extractFields(text: string) {
  const t = (text ?? '').replace(/\s+/g, ' ');
  // 사업자등록번호 123-45-67890
  const noM = t.match(/(\d{3})[-\s.]?(\d{2})[-\s.]?(\d{5})/);
  const b_no = noM ? `${noM[1]}${noM[2]}${noM[3]}` : '';
  // 개업연월일 2020 년 03 월 15 일 / 2020-03-15 / 2020.03.15
  const dtM = t.match(/개\s*업\s*연?\s*월?\s*일[^0-9]*(\d{4})\s*[년.\-/]\s*(\d{1,2})\s*[월.\-/]\s*(\d{1,2})/)
    || t.match(/(\d{4})\s*[년.\-/]\s*(\d{1,2})\s*[월.\-/]\s*(\d{1,2})\s*일?/);
  const start_dt = dtM ? `${dtM[1]}${dtM[2].padStart(2, '0')}${dtM[3].padStart(2, '0')}` : '';
  // 대표자/성명 : 홍길동
  const nmM = t.match(/(?:성\s*명|대\s*표\s*자)\s*(?:\([^)]*\))?\s*[:：]?\s*([가-힣]{2,6})/);
  const p_nm = nmM ? nmM[1] : '';
  return { b_no, start_dt, p_nm };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return json({ ok: false, reason: '로그인이 필요해요' }, 401);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, reason: '로그인이 필요해요' }, 401);

    const { cert_path } = await req.json();
    if (!cert_path) return json({ ok: false, reason: '등록증 파일이 없어요' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // 1) 등록증 다운로드 (비공개 버킷)
    const { data: file, error: dlErr } = await admin.storage.from('biz-docs').download(cert_path);
    if (dlErr || !file) return json({ ok: false, reason: '등록증을 불러오지 못했어요' });

    // 2) OCR
    const fd = new FormData();
    fd.append('document', file, 'cert.jpg');
    fd.append('model', 'ocr');
    const ocrRes = await fetch('https://api.upstage.ai/v1/document-digitization', {
      method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('UPSTAGE_API_KEY')}` }, body: fd,
    });
    if (!ocrRes.ok) return json({ ok: false, reason: 'OCR 호출 실패', needsReview: true });
    const ocr = await ocrRes.json();
    const text: string = ocr?.text ?? (Array.isArray(ocr?.pages) ? ocr.pages.map((p: any) => p?.text ?? '').join('\n') : '');

    // 3) 필드 추출
    const { b_no, start_dt, p_nm } = extractFields(text);
    if (!b_no || !start_dt || !p_nm) {
      // 자동 추출 실패 → 등록증은 저장하고 수동 검토 대상으로
      await admin.from('profiles').update({ biz_cert_url: cert_path }).eq('id', user.id);
      return json({ ok: true, verified: false, needsReview: true, extracted: { b_no, start_dt, p_nm }, reason: '등록증에서 정보를 다 읽지 못했어요. 관리자 검토로 넘어갑니다.' });
    }

    // 4) 국세청 진위확인 (번호+대표자명+개업일자 일치 검증)
    const key = Deno.env.get('NTS_KEY') ?? '';
    const vRes = await fetch(`https://api.odcloud.kr/api/nts-businessman/v1/validate?serviceKey=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businesses: [{ b_no, start_dt, p_nm }] }),
    });
    const vData = await vRes.json();
    const item = vData?.data?.[0];
    const matched = item?.valid === '01';

    if (matched) {
      await admin.from('profiles').update({
        role: 'owner', biz_verified: true, biz_no: b_no, biz_rep_name: p_nm, biz_open_dt: start_dt, biz_cert_url: cert_path,
      }).eq('id', user.id);
      return json({ ok: true, verified: true, b_no, p_nm });
    }
    // 불일치 → 등록증 저장 + 수동 검토
    await admin.from('profiles').update({ biz_cert_url: cert_path }).eq('id', user.id);
    return json({ ok: true, verified: false, needsReview: true, extracted: { b_no, start_dt, p_nm }, reason: '국세청 진위확인에서 정보가 일치하지 않았어요. 관리자 검토로 넘어갑니다.' });
  } catch (e) {
    return json({ ok: false, reason: String(e) }, 500);
  }
});
