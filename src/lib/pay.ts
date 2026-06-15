// 네이티브 결제 스텁 — 앱(iOS/Android)은 추후 @portone/react-native-sdk로 연동 예정.
// 지금은 웹(브라우저)에서 결제하도록 안내.
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
