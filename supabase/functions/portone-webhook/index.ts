// PortOne V2 웹훅 — 가상계좌 입금완료 등 '결제 확정' 시 광고잔액 자동 적립.
// 보안: (0) 웹훅 서명(HMAC-SHA256) 검증으로 위조 delivery 자체를 차단한 뒤,
//       (1) 그래도 본문을 신뢰하지 않고 paymentId로 PortOne API를 재조회해 실제 PAID·금액을 대조(2중 방어).
//       payments 테이블로 멱등(같은 결제 중복적립 차단).
// 서명 규격: PortOne V2는 standard-webhooks(Svix 호환) — 헤더 webhook-id / webhook-timestamp / webhook-signature,
//            서명대상 = `${id}.${timestamp}.${raw본문}`, 시크릿은 'whsec_' 접두(옵션) + base64 키.
// PortOne 콘솔 → 결제연동 → 웹훅에 이 함수 URL 등록:
//   https://<project>.functions.supabase.co/portone-webhook
// 필요 env: PORTONE_WEBHOOK_SECRET (콘솔의 웹훅 시크릿). 미설정 시 서명검증 없이 재조회 폴백(하위호환, 로그 남김).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PORTONE_API_SECRET = Deno.env.get('PORTONE_API_SECRET')!;
const PORTONE_WEBHOOK_SECRET = Deno.env.get('PORTONE_WEBHOOK_SECRET') ?? '';   // 없으면 폴백(하위호환)

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
// charge-balance와 동일 검증(1만~200만, 1만원 단위)
function validAmount(a: number) { return Number.isInteger(a) && a >= 10000 && a <= 2000000 && a % 10000 === 0; }

// ── 웹훅 서명검증 유틸 (standard-webhooks / Svix 호환, Deno crypto.subtle) ──
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}
// 상수시간 비교(서명 타이밍공격 방지)
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
// raw 본문 기준 HMAC-SHA256 검증. 통과 시 true.
async function verifyWebhookSignature(secret: string, headers: Headers, rawBody: string): Promise<boolean> {
  const id = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const sigHeader = headers.get('webhook-signature');
  if (!id || !timestamp || !sigHeader) return false;

  // 리플레이 방지: 타임스탬프 허용오차 ±5분
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 5 * 60) return false;

  // 시크릿: 'whsec_' 접두 제거 후 base64 디코드(규격). base64 아니면 원문 바이트로 폴백.
  const keyRaw = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let keyBytes: Uint8Array;
  try { keyBytes = b64ToBytes(keyRaw); } catch { keyBytes = new TextEncoder().encode(keyRaw); }

  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent));
  const expected = bytesToB64(sigBuf);

  // 헤더는 공백구분 'v1,<base64sig>' 목록 → 하나라도 일치하면 통과
  for (const part of sigHeader.split(' ')) {
    if (!part) continue;
    const idx = part.indexOf(',');
    const sig = idx === -1 ? part : part.slice(idx + 1);
    if (timingSafeEqual(sig, expected)) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false }, 405);
  const raw = await req.text();

  // 0) 웹훅 서명 검증(위조 delivery 차단). 시크릿 있으면 raw 본문 기준 HMAC-SHA256 검증 후에만 진행.
  //    실패 → 401 즉시. 미설정 → 하위호환 폴백(재조회로만 방어, 로그 경고).
  if (PORTONE_WEBHOOK_SECRET) {
    let verified = false;
    try {
      verified = await verifyWebhookSignature(PORTONE_WEBHOOK_SECRET, req.headers, raw);
    } catch (e) {
      console.error('[portone-webhook] signature verify error', e);   // 검증 예외는 실패(fail-closed)
      verified = false;
    }
    if (!verified) return json({ ok: false, reason: 'invalid signature' }, 401);
  } else {
    console.warn('[portone-webhook] PORTONE_WEBHOOK_SECRET not set — falling back to re-lookup only (no signature verification)');
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return json({ ok: false, reason: 'bad json' }, 400); }

  // V2 웹훅 형태: { type: 'Transaction.Paid'|..., data: { paymentId, transactionId } }
  const paymentId = body?.data?.paymentId ?? body?.paymentId;
  if (!paymentId) return json({ ok: true, skip: 'no paymentId' });   // 관심없는 이벤트 — 200으로 조용히 무시

  // 1) PortOne API로 실제 결제 재조회 (웹훅 본문 위조 방지의 핵심). 일시장애는 5xx로 재시도 유도.
  let pay: any;
  try {
    const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` },
    });
    pay = await res.json();
    if (!res.ok) return json({ ok: false, reason: 'lookup failed' }, 502);   // 일시 → PortOne 재시도
  } catch (_e) {
    return json({ ok: false, reason: 'portone unreachable' }, 502);           // 일시 → 재시도
  }

  const status = pay?.status;
  if (status !== 'PAID') return json({ ok: true, status });   // 미입금·발급대기·취소 등 → 적립 안 함(정상 종료)

  // 2) 우리 결제인지 + 대상 유저·금액 (customData는 결제 생성 시 우리 클라가 넣은 값 → 재조회로 신뢰)
  let cd: any = {}; try { cd = JSON.parse(pay?.customData ?? '{}'); } catch { /* */ }
  const uid = cd?.uid ?? null;
  const amount = Number(pay?.amount?.total ?? pay?.amount);
  if (!uid || cd?.purpose !== 'ad_charge') return json({ ok: true, skip: 'not ad_charge' });   // 우리 소관 아님
  if (!validAmount(amount)) return json({ ok: true, skip: 'amount out of range' });            // 실입금이나 이상금액 → 수동처리(재시도 안 함)

  const admin = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // 3) 유저 실재 확인(없으면 무한 재시도 방지)
  const { data: prof } = await admin.from('profiles').select('id').eq('id', uid).maybeSingle();
  if (!prof) return json({ ok: true, skip: 'unknown user' });

  // 4) 원자 선점(claim-first) — payments.payment_id UNIQUE에 'processing' insert.
  //    동시 웹훅/재시도 중 '단 하나'만 insert 성공 → 그 delivery만 적립(중복적립 race 차단).
  const { error: claimErr } = await admin.from('payments')
    .insert({ payment_id: paymentId, user_id: uid, ad_id: null, amount, status: 'processing', order_name: '가상계좌 충전' });
  if (claimErr) {
    const { data: exist } = await admin.from('payments').select('status').eq('payment_id', paymentId).maybeSingle();
    if (exist?.status === 'paid') return json({ ok: true, already: true });   // 이미 적립 완료
    return json({ ok: false, reason: 'in progress' }, 409);                   // 다른 delivery 처리중/실패 → 재시도로 수렴
  }

  // 5) 선점한 delivery만 적립. 실패 시 선점 롤백 + 5xx(재시도 유도) → 돈 받고 미적립 방지.
  const { data: bal, error } = await admin.rpc('credit_ad_balance', { p_user: uid, p_amount: amount, p_ref: paymentId });
  if (error) {
    await admin.from('payments').delete().eq('payment_id', paymentId);
    return json({ ok: false, reason: 'credit failed' }, 500);
  }
  await admin.from('payments').update({ status: 'paid' }).eq('payment_id', paymentId);
  return json({ ok: true, balance: bal });
});
