/**
 * ★ 앱 기본 정보 ★ (이름 바꾸려면 여기만 수정)
 */
export const APP_NAME = '와벨리';
export const APP_NAME_EN = 'Wavely';
export const APP_TAGLINE = '직장인·사장님이 모이는 우리 동네 커뮤니티';

/** 동(洞) 이름 정규화: 후평1동·후평2동 → 후평동, 효자3동 → 효자동 (숫자 행정동 통합) */
export const normalizeDong = (d: string | null): string => (d ?? '').replace(/\d+동$/, '동');

/** 원본 동 목록을 정규화 + 중복 제거 (순서 유지) */
export const mergeDongs = (raw: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of raw) {
    const n = normalizeDong(d);
    if (n && !seen.has(n)) { seen.add(n); out.push(n); }
  }
  return out;
};

/** 회원 등급 4종 */
export type RoleKey = 'owner' | 'staff' | 'parttime' | 'guest';

export const ROLES: { key: RoleKey; label: string; emoji: string; desc: string }[] = [
  { key: 'owner', label: '사업주', emoji: '💼', desc: '가게·회사를 운영해요 (사업자번호 인증)' },
  { key: 'staff', label: '정직원', emoji: '👔', desc: '회사에 소속된 정규직이에요' },
  { key: 'parttime', label: '아르바이트', emoji: '🧑‍🍳', desc: '시간제·단기 근무를 해요' },
  { key: 'guest', label: '손님', emoji: '🙋', desc: '그냥 둘러보고 소통할래요' },
];

/** 게시판 (내부키 ↔ 표시이름) */
export type BoardKey = 'free' | 'owner' | 'staff' | 'promo';
export const BOARDS: { key: BoardKey; label: string }[] = [
  { key: 'free', label: '자유' },
  { key: 'promo', label: '홍보' },
  { key: 'owner', label: '사장님' },
  { key: 'staff', label: '직장인' },
];
export const boardLabel = (key: string) => BOARDS.find((b) => b.key === key)?.label ?? key;

/** 공공데이터 분류코드명 → 친근한 업종 이름 */
const PRETTY_CAT: Record<string, string> = {
  '비알코올': '카페·음료', '기타 간이': '분식·간이', '주점': '술집·바',
  '이용·미용': '미용실', '세탁': '세탁소', '종합 소매': '종합소매',
  '섬유·의복·신발 소매': '의류·패션', '식료품 소매': '식료품', '의약·화장품 소매': '약국·화장품',
  '가전·통신 소매': '가전·통신', '철물·건설자재 소매': '철물·건자재', '식물 소매': '꽃·식물',
  '오락용품 소매': '오락·취미용품', '기타 상품 소매': '잡화', '기타 생활용품 소매': '생활용품',
  '일반 숙박': '숙박', '기타 숙박': '숙박', '유원지·오락': '오락·여가', '스포츠 서비스': '스포츠·체육',
  '부동산 서비스': '부동산', '자동차 수리·세차': '자동차정비·세차', '기타 교육': '학원·교육',
  '일반 교육': '교육', '교육 지원': '교육지원', '본사·경영 컨설팅': '경영컨설팅', '전문 디자인': '디자인',
  '기술 서비스': '기술서비스', '청소·방제': '청소·방역', '인쇄·제품제작': '인쇄·제작', '법무관련': '법무',
  '사진 촬영': '사진·스튜디오', '욕탕·신체관리': '목욕·관리', '고용 알선': '직업소개',
};
export function prettyCat(cat: string | null | undefined): string {
  if (!cat) return '';
  const t = cat.trim();
  for (const k in PRETTY_CAT) if (t.includes(k)) return PRETTY_CAT[k];
  return t;
}

/** 글 내용에서 #해시태그 추출 (중복 제거) */
export function parseHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = text.match(/#[^\s#]+/g) ?? [];
  return Array.from(new Set(found.map((t) => t.slice(1))));
}

/** 등급별 글쓰기 권한 */
export function canPostTo(role: RoleKey | null | undefined, board: BoardKey): boolean {
  if (!role) return false;
  if (board === 'free') return true;                                  // 자유: 누구나
  if (board === 'promo') return true;                                 // 홍보: 누구나 (이벤트·할인·동네행사)
  if (board === 'owner') return role === 'owner';                     // 사장님: 사업주만
  if (board === 'staff') return role === 'owner' || role === 'staff' || role === 'parttime'; // 직장인: 손님 제외
  return false;
}

/**
 * 사업자등록번호가 인증된 "등록 매장/회사" 풀.
 * 정직원·아르바이트는 여기서만 소속을 검색·선택할 수 있어요 (허위 등록 방지).
 * 실제 서비스에선 Supabase에 저장된, 사업자번호 인증을 마친 매장 목록이 들어갑니다.
 */
export type RegisteredStore = { id: string; name: string; category: string; address: string };

// 회사·매장 검색의 초기값 (실제로는 Supabase의 인증 매장 목록을 불러와 채웁니다)
export const REGISTERED_STORES: RegisteredStore[] = [];
