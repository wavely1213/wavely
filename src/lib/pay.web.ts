// 웹 PortOne 결제 요청 (@portone/browser-sdk). 네이티브는 pay.ts(스텁)가 사용됨.
import * as PortOne from '@portone/browser-sdk/v2';

// 웹은 결제 가능(스토어 정책 무관). 네이티브(pay.ts)는 false.
export const PAY_AVAILABLE = true;

const STORE_ID = process.env.EXPO_PUBLIC_PORTONE_STORE_ID || '';
const CHANNEL_KEY = process.env.EXPO_PUBLIC_PORTONE_CHANNEL_KEY || '';
// 빌링(정기결제) 채널이 따로 있으면 사용, 없으면 일반 채널키로 시도
const BILLING_CHANNEL_KEY = process.env.EXPO_PUBLIC_PORTONE_BILLING_CHANNEL_KEY || CHANNEL_KEY;

export type PayResult = { ok: true; paymentId: string } | { ok: false; reason: string };
export type BillingResult = { ok: true; billingKey: string } | { ok: false; reason: string };

export async function requestAdPayment(opts: {
  paymentId: string;
  orderName: string;
  amount: number;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  uid?: string;        // 결제 소유자 — 서버(verify-*)가 customData.uid로 호출자와 대조(도용 차단)
  purpose?: string;    // 'ad' | 'place_pass' 등
}): Promise<PayResult> {
  if (!STORE_ID || !CHANNEL_KEY) return { ok: false, reason: '결제 설정이 없어요(.env)' };
  try {
    const res = await PortOne.requestPayment({
      storeId: STORE_ID,
      channelKey: CHANNEL_KEY,
      paymentId: opts.paymentId,
      orderName: opts.orderName,
      totalAmount: opts.amount,
      currency: 'CURRENCY_KRW' as any,
      payMethod: 'CARD' as any,
      customData: JSON.stringify({ uid: opts.uid ?? null, purpose: opts.purpose ?? null }),   // 서버 uid 바인딩용
      customer: {
        ...(opts.fullName ? { fullName: opts.fullName } : {}),
        ...(opts.phoneNumber ? { phoneNumber: opts.phoneNumber } : {}),
        ...(opts.email ? { email: opts.email } : {}),
      },
    });
    // 실패·취소 시 res.code가 채워짐
    if (res?.code != null) return { ok: false, reason: res.message ?? '결제가 취소됐어요' };
    return { ok: true, paymentId: res?.paymentId ?? opts.paymentId };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? '결제 중 오류가 났어요' };
  }
}

// 자동결제용 카드(빌링키) 발급 — 광고비 자동충전/클릭과금에 사용
export async function requestBillingKey(opts: {
  issueId: string;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
}): Promise<BillingResult> {
  if (!STORE_ID || !BILLING_CHANNEL_KEY) return { ok: false, reason: '결제 설정이 없어요(.env)' };
  try {
    const res = await PortOne.requestIssueBillingKey({
      storeId: STORE_ID,
      channelKey: BILLING_CHANNEL_KEY,
      billingKeyMethod: 'CARD' as any,
      issueId: opts.issueId,
      issueName: '와벨리 광고비 자동결제 카드',
      customer: {
        ...(opts.fullName ? { fullName: opts.fullName } : {}),
        ...(opts.phoneNumber ? { phoneNumber: opts.phoneNumber } : {}),
        ...(opts.email ? { email: opts.email } : {}),
      },
    });
    if (res?.code != null) return { ok: false, reason: res.message ?? '카드 등록이 취소됐어요' };
    if (!res?.billingKey) return { ok: false, reason: '카드 등록에 실패했어요' };
    return { ok: true, billingKey: res.billingKey };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? '카드 등록 중 오류가 났어요' };
  }
}
