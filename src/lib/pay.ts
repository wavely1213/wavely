// 네이티브 결제 스텁 — 앱(iOS/Android)은 추후 @portone/react-native-sdk 또는 IAP로 연동 예정.
// v1 스토어 심사: 네이티브에선 결제/충전/구독 UI를 노출하지 않음(외부결제 스티어링=Apple 3.1.1 반려).
// 결제는 웹(전문가센터/광고센터)에서. 이 플래그가 false면 각 화면이 결제 진입점을 숨김.
export const PAY_AVAILABLE = false;
export type PayResult = { ok: true; paymentId: string } | { ok: false; reason: string };
export type BillingResult = { ok: true; billingKey: string } | { ok: false; reason: string };

export async function requestAdPayment(_opts: {
  paymentId: string;
  orderName: string;
  amount: number;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
}): Promise<PayResult> {
  return { ok: false, reason: '앱 결제는 준비 중이에요 — 웹(브라우저)에서 결제해주세요.' };
}

export async function requestBillingKey(_opts: {
  issueId: string;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
}): Promise<BillingResult> {
  return { ok: false, reason: '앱 카드등록은 준비 중이에요 — 웹(브라우저)에서 등록해주세요.' };
}
