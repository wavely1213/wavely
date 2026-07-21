// ───────────────────────────────────────────────────────────────
// 회사·사업자 정보 (출시 전 실제 값으로 채우기 — 여기 한 곳만 고치면
// 약관·개인정보처리방침·설정 화면에 자동 반영됩니다)
//
// ⚠️ 아래 (괄호) 안 값을 실제 정보로 바꿔주세요. 채워지지 않으면
//    각 화면에 "정식 출시 전 입력" 안내가 표시됩니다.
// ───────────────────────────────────────────────────────────────

export const COMPANY = {
  /** 서비스명 (앱 이름) */
  service: '와벨리',
  /** 상호 / 법인명 (사업자등록증의 상호) */
  legalName: '와벨리',
  /** 대표자명 */
  ceo: '박현준',
  /** 사업자등록번호 (예: 123-45-67890) */
  bizNo: '694-09-03009',
  /** 통신판매업 신고번호 (있으면) */
  mailOrderNo: '2026-강원춘천-0191',
  /** 사업장 주소 — 앱은 결제·판매를 하지 않으므로(웹에서 판매) 앱 화면엔 표시하지 않음(빈 값=숨김).
   *  전자상거래법상 통신판매 사업자정보(주소 포함)는 판매가 일어나는 웹(biz.mulgyeol.kr)에 전체 공개.
   *  앱에도 표시하려면 여기에 주소를 넣으면 자동 노출됨. */
  address: '',
  /** 고객센터·문의 이메일 (필수) */
  email: 'wavely1213@mulgyeol.kr',
  /** 고객센터 전화 (선택) */
  phone: '',
  /** 개인정보 보호책임자 이름 (기본: 대표) */
  privacyOfficer: '박현준',
  /** 개인정보 보호책임자 연락처 (이메일 또는 전화) */
  privacyOfficerContact: 'wavely1213@mulgyeol.kr',
  /** 약관·개인정보처리방침 시행일 (= 출시일 기준. 실제 스토어 승인일이 다르면 이 한 줄만 수정) */
  effectiveDate: '2026년 7월 21일',
};

/** 아직 채워지지 않은 항목인지 (괄호로 시작하면 미입력) */
export const isPlaceholder = (v: string) => !v || v.trim().startsWith('(');

/** 회사 정보가 (앱 표시에 필요한 만큼) 채워졌는지. 주소는 앱에서 선택(웹에 전체 공개)이라 제외. */
export const companyInfoReady =
  !isPlaceholder(COMPANY.legalName) &&
  !isPlaceholder(COMPANY.ceo) &&
  !isPlaceholder(COMPANY.bizNo) &&
  !isPlaceholder(COMPANY.email) &&
  !isPlaceholder(COMPANY.effectiveDate);
