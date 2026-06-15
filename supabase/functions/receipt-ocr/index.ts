// 영수증 OCR 자동 인증 (Upstage Document OCR)
// 입력: { review_id }  → 영수증 사진에서 글자를 읽어 리뷰 매장명과 대조.
// 일치하면 서버(service role)가 직접 verified=true 처리 → 클라이언트 조작 불가.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { ...cors, 'Content-Type': 'application/json' } });

// 공백·특수문자 제거 + 소문자 (한글/영문/숫자만 남김)
const norm = (s: string) => (s ?? '').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { review_id } = await req.json();
    if (!review_id) return json({ ok: false, reason: 'review_id 누락' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // 1) 리뷰 로드
    const { data: rv } = await admin.from('reviews').select('id, store_id, place_id, receipt_url').eq('id', review_id).single();
    if (!rv) return json({ ok: false, reason: '리뷰를 찾을 수 없어요' });
    if (!rv.receipt_url) return json({ ok: false, reason: '영수증 사진이 없어요' });

    // 2) 매장명 확보 (+ 별칭 후보)
    let names: string[] = [];
    if (rv.store_id) {
      const { data: st } = await admin.from('stores').select('name').eq('id', rv.store_id).single();
      if (st?.name) names.push(st.name);
    } else if (rv.place_id) {
      const { data: pl } = await admin.from('places').select('name').eq('id', rv.place_id).single();
      if (pl?.name) names.push(pl.name);
    }
    if (!names.length) return json({ ok: false, reason: '매장 정보를 찾을 수 없어요' });

    // 3) 영수증 이미지 → Upstage OCR
    const imgRes = await fetch(rv.receipt_url);
    if (!imgRes.ok) return json({ ok: false, reason: '영수증 이미지를 불러오지 못했어요' });
    const blob = await imgRes.blob();
    const fd = new FormData();
    fd.append('document', blob, 'receipt.jpg');
    fd.append('model', 'ocr');
    const ocrRes = await fetch('https://api.upstage.ai/v1/document-digitization', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('UPSTAGE_API_KEY')}` },
      body: fd,
    });
    if (!ocrRes.ok) {
      const errTxt = await ocrRes.text();
      return json({ ok: false, reason: 'OCR 호출 실패', detail: errTxt.slice(0, 200) });
    }
    const ocr = await ocrRes.json();
    const text: string = ocr?.text ?? (Array.isArray(ocr?.pages) ? ocr.pages.map((p: any) => p?.text ?? '').join('\n') : '');
    const nText = norm(text);

    // 4) 매장명 대조 — 전체명 또는 2글자 이상 토큰 일치
    let matched = false;
    let hit = '';
    for (const nm of names) {
      const full = norm(nm);
      if (full.length >= 2 && nText.includes(full)) { matched = true; hit = nm; break; }
      // 지점명 등 분리: 공백 기준 토큰 중 가장 긴 핵심어
      const tokens = nm.split(/\s+/).map(norm).filter((t) => t.length >= 2).sort((a, b) => b.length - a.length);
      for (const t of tokens) { if (nText.includes(t)) { matched = true; hit = nm; break; } }
      if (matched) break;
    }

    // 5) 결과 반영 (서버에서만 verified 변경)
    if (matched) {
      await admin.from('reviews').update({ verified: true, verify_method: 'receipt_ocr' }).eq('id', review_id);
    }
    // 실패 시: verify_method 'receipt' 유지 → 관리자 수동 검토 큐로 남음

    return json({ ok: true, matched, verified: matched, hit, names, text_excerpt: text.slice(0, 300) });
  } catch (e) {
    return json({ ok: false, reason: String(e) });
  }
});
