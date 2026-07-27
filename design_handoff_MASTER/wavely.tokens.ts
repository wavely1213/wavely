// 와벨리 디자인 토큰 — 스카이 전환 완료(2026-07-27). 그레이프(#7A2BC4) 폐기.
// 예외: 알바 업종색 `사무·기타 #7A2BC4`는 브랜드색이 아니므로 유지 (ALBA_JOB_TAB.md §1).
// wavely.tokens.ts — 와벨리 디자인 단일 진실 소스 (Single Source of Truth)
// 4개 surface(앱·소비자웹·관리자웹·마케팅) 모두 이 값을 그대로 사용. 임의 변경 금지.
// 현재 repo의 src/constants/theme.ts 와 100% 일치 — 새 값 발명 금지, 이 파일을 import 해서 쓸 것.

export const Colors = {
  light: {
    text: '#18181B', textSecondary: '#82828C',
    background: '#F5F5F6', card: '#FFFFFF',
    backgroundElement: '#EAF7FB', backgroundSelected: '#E0E1E6',
    border: '#EAEAEC',
    primary: '#0EA5E9', primarySoft: '#EAF7FB', primaryDeep: '#0E7490', primarySoft2: '#C6E9F7',
    verify: '#11B981', onPrimary: '#FFFFFF',
    danger: '#E5484D', warn: '#D9730D',
  },
  dark: {
    text: '#F3F3F5', textSecondary: '#9B9BA5',
    background: '#000000', card: '#0C0C0E',
    backgroundElement: '#0C2A3F', backgroundSelected: '#1A1A1F',
    border: '#232328',
    primary: '#38BDF8', primarySoft: '#0C2A3F', primaryDeep: '#7DD3FC', primarySoft2: '#123A52',
    verify: '#11B981', onPrimary: '#FFFFFF',
    danger: '#E5484D', warn: '#F0A35A',
  },
} as const;
// 다크모드 = OLED 완전검정(page #000 · card #0C0C0E · 스카이 한 톤 밝게). root에 data-theme='dark' 시 colors.dark 적용.
// 토글 위치: 앱=Tweaks, 웹·관리자=헤더 해/달, 랜딩=내비. (localStorage 지속)

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
  free:   { label: '자유',    fg: '#0E7490', bg: '#EAF7FB' },
  promo:  { label: '홍보', fg: '#D9730D', bg: '#FFE7CC' },
  owner:  { label: '사장님',  fg: '#0EA5E9', bg: '#EAF7FB' },
  staff:  { label: '직장인',  fg: '#0E8C6A', bg: '#DDF3EC' },
  verify: { label: '✓ 인증', fg: '#FFFFFF', bg: '#11B981' },
  ad:     { label: '광고',    fg: '#FFFFFF', bg: '#0EA5E9' },
} as const;

// 광고 3종 — 4개 surface 공통 모델
export const AdProducts = {
  banner: { label: '배너 광고',        model: 'CPM(노출형)',     placement: '피드/상세 상단 전용 슬롯' },
  infeed: { label: '인피드 광고',      model: 'CPC(클릭형)',     placement: '게시글 사이 1/10 네이티브' },
  place:  { label: '플레이스 상위노출', model: 'CPC+가중(성과형)', placement: '우리동네 목록·지도·검색 상위' },
} as const;

// 폰트: Pretendard (한글). web: --font-display 선두에 추가.
export const Font = "'Pretendard Variable', Pretendard, system-ui, sans-serif";
