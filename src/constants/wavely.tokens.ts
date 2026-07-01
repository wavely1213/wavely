// wavely.tokens.ts — 와벨리 디자인 단일 진실 소스 (Single Source of Truth)
// 4개 surface(앱·소비자웹·관리자웹·마케팅) 모두 이 값을 그대로 사용. 임의 변경 금지.
// src/constants/theme.ts 가 이 파일을 import/재수출한다. 하드코딩 hex 금지 — 항상 토큰 사용.

export const Colors = {
  light: {
    text: '#18181B', textSecondary: '#82828C',
    background: '#F5F5F6', card: '#FFFFFF',
    backgroundElement: '#F3EAFB', backgroundSelected: '#E0E1E6',
    border: '#EAEAEC',
    primary: '#7A2BC4', primarySoft: '#F3EAFB', primaryDeep: '#641FA6', primarySoft2: '#E6D3F6',
    verify: '#11B981', onPrimary: '#FFFFFF',
    danger: '#E5484D', warn: '#D9730D',
  },
  dark: {
    text: '#F3F3F5', textSecondary: '#9B9BA5',
    background: '#000000', card: '#0C0C0E',
    backgroundElement: '#1E1335', backgroundSelected: '#1A1A1F',
    border: '#232328',
    primary: '#9D5FE6', primarySoft: '#1E1335', primaryDeep: '#C2A2F2', primarySoft2: '#2C1E46',
    verify: '#11B981', onPrimary: '#FFFFFF',
    danger: '#E5484D', warn: '#F0A35A',
  },
} as const;
// 다크모드 = OLED 완전검정(page #000 · card #0C0C0E · 그레이프 한 톤 밝게). root에 data-theme='dark' 시 colors.dark 적용.

// 표면 톤: 플랫 — 그림자 대신 얇은 구분선/테두리로 면 구분 (라운드 16~18px 유지)
export const Radius = { list: 12, card: 16, image: 12, button: 12, chip: 999, pill: 999, tabbar: 30 } as const;
export const Shadow = {
  card:  'none',
  cardDark: '0 1px 3px rgba(0,0,0,0.40)',
  float: '0 6px 18px rgba(0,0,0,0.22)',
  fab:   '0 4px 12px rgba(0,0,0,0.16)',
  pop:   '0 16px 48px rgba(0,0,0,0.18)',
} as const;
export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;

// 게시판/매장 배지 — 흩어진 인라인 색 통일
export const TagColors = {
  free:   { label: '자유',    fg: '#641FA6', bg: '#F3EAFB' },
  promo:  { label: '홍보', fg: '#D9730D', bg: '#FFE7CC' },
  owner:  { label: '사장님',  fg: '#7A2BC4', bg: '#F3EAFB' },
  staff:  { label: '직장인',  fg: '#0E8C6A', bg: '#DDF3EC' },
  verify: { label: '✓ 인증', fg: '#FFFFFF', bg: '#11B981' },
  ad:     { label: '광고',    fg: '#FFFFFF', bg: '#7A2BC4' },
} as const;

// 광고 3종 — 4개 surface 공통 모델
export const AdProducts = {
  banner: { label: '배너 광고',        model: 'CPM(노출형)',     placement: '피드/상세 상단 전용 슬롯' },
  infeed: { label: '인피드 광고',      model: 'CPC(클릭형)',     placement: '게시글 사이 1/10 네이티브' },
  place:  { label: '플레이스 상위노출', model: 'CPC+가중(성과형)', placement: '우리동네 목록·지도·검색 상위' },
} as const;

// 폰트: Pretendard (한글). web: --font-display 선두에 추가.
export const Font = "'Pretendard Variable', Pretendard, system-ui, sans-serif";
