// wavely.tokens.ts — 와벨리 디자인 단일 진실 소스 (Single Source of Truth)
// 4개 surface(앱·소비자웹·관리자웹·마케팅) 모두 이 값을 그대로 사용. 임의 변경 금지.
// src/constants/theme.ts 가 이 파일을 import/재수출한다. 하드코딩 hex 금지 — 항상 토큰 사용.

export const Colors = {
  light: {
    text: '#181527', textSecondary: '#86829A',
    background: '#F6F5FB', card: '#FFFFFF',
    backgroundElement: '#EDE8FE', backgroundSelected: '#E0E1E6',
    border: '#ECEAF3',
    primary: '#7C5CFC', primarySoft: '#EDE8FE', primaryDeep: '#5E3FE0',
    verify: '#11B981', onPrimary: '#FFFFFF',
    danger: '#E5484D', warn: '#D9730D',
  },
  dark: {
    text: '#F2F0FA', textSecondary: '#9A95B5',
    background: '#13111F', card: '#1C1930',
    backgroundElement: '#211B3A', backgroundSelected: '#2A2640',
    border: '#2A2640',
    primary: '#8B5CF6', primarySoft: '#211B3A', primaryDeep: '#A78BFA',
    verify: '#11B981', onPrimary: '#FFFFFF',
    danger: '#E5484D', warn: '#F0A35A',
  },
} as const;

// 표면별 톤(블렌드): 리스트=클린(구분선/그림자X), 카드=소프트(라운드/그림자O)
export const Radius = { list: 12, card: 16, image: 12, button: 12, chip: 999, pill: 999, tabbar: 30 } as const;
export const Shadow = {
  card: '0 1px 2px rgba(20,18,40,0.04), 0 6px 20px rgba(20,18,40,0.05)',
  cardDark: '0 1px 3px rgba(0,0,0,0.40)',
  float: '0 6px 18px rgba(0,0,0,0.22)',
  fab: '0 4px 12px rgba(124,92,252,0.40)',
  pop: '0 14px 44px rgba(20,18,40,0.18)',
} as const;
export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;

// 게시판/매장 배지 — 흩어진 인라인 색 통일
export const TagColors = {
  free: { label: '자유', fg: '#5E3FE0', bg: '#EDE8FE' },
  promo: { label: '📢 홍보', fg: '#D9730D', bg: '#FFE7CC' },
  owner: { label: '사장님', fg: '#7C5CFC', bg: '#EDE8FE' },
  staff: { label: '직장인', fg: '#0E8C6A', bg: '#DDF3EC' },
  verify: { label: '✓ 인증', fg: '#FFFFFF', bg: '#11B981' },
  ad: { label: '광고', fg: '#FFFFFF', bg: '#7C5CFC' },
} as const;

// 광고 3종 — 4개 surface 공통 모델
export const AdProducts = {
  banner: { label: '배너 광고', model: 'CPM(노출형)', placement: '피드/상세 상단 전용 슬롯' },
  infeed: { label: '인피드 광고', model: 'CPC(클릭형)', placement: '게시글 사이 1/10 네이티브' },
  place: { label: '플레이스 상위노출', model: 'CPC+가중(성과형)', placement: '우리동네 목록·지도·검색 상위' },
} as const;

// 폰트: Pretendard (한글). web: --font-display 선두에 추가.
export const Font = "'Pretendard Variable', Pretendard, system-ui, sans-serif";
