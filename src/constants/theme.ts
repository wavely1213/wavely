/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

import liveConfig from '@/constants/ui-config.json';
import draftConfig from '@/constants/ui-config.draft.json';

// 검수 모드 판별: 웹에서 ?ui=test 로 켜고 ?ui=live 로 끔 (localStorage에 기억).
// 검수 모드에선 draft(검수용) 값을, 평소엔 live(실서비스) 값을 사용한다. 네이티브는 항상 live.
function isUiPreview(): boolean {
  try {
    const w: any = globalThis as any;
    if (!w?.location || !w?.localStorage) return false;
    const q = new URLSearchParams(w.location.search).get('ui');
    if (q === 'test') w.localStorage.setItem('wavely-ui-preview', '1');
    if (q === 'live') w.localStorage.setItem('wavely-ui-preview', '0');
    return w.localStorage.getItem('wavely-ui-preview') === '1';
  } catch {
    return false;
  }
}

export const IS_UI_PREVIEW = isUiPreview();
const uiConfig: any = IS_UI_PREVIEW ? draftConfig : liveConfig;

/**
 * ★ 우리 앱 브랜드 컬러 ★
 *  - 기본값은 아래에 두고, UI 에디터(tools/ui-editor)가 ui-config.json을 덮어써서 색을 바꿉니다.
 *  - 라이트: 밝은 바이올렛 / 다크: 딥 퍼플
 */
const DEFAULT_COLORS = {
  light: {
    text: '#181527',
    textSecondary: '#86829A',
    background: '#F6F5FB',      // 앱 배경
    card: '#FFFFFF',            // 카드/게시글 배경
    backgroundElement: '#EDE8FE',
    backgroundSelected: '#E0E1E6',
    border: '#ECEAF3',
    primary: '#7C5CFC',         // 메인 컬러 (밝은 바이올렛)
    primarySoft: '#EDE8FE',     // 연한 보라 (뱃지/칩 배경)
    primaryDeep: '#5E3FE0',     // 진한 보라 (강조)
    verify: '#11B981',          // 인증매장 뱃지 (초록)
    onPrimary: '#FFFFFF',
  },
  dark: {
    text: '#F2F0FA',
    textSecondary: '#9A95B5',
    background: '#13111F',
    card: '#1C1930',
    backgroundElement: '#211B3A',
    backgroundSelected: '#2A2640',
    border: '#2A2640',
    primary: '#8B5CF6',
    primarySoft: '#211B3A',
    primaryDeep: '#A78BFA',
    verify: '#11B981',
    onPrimary: '#FFFFFF',
  },
};

const cfgColors = (uiConfig as any)?.colors ?? {};
// ui-config.json 값으로 기본 팔레트를 덮어씀 (없으면 기본값 유지)
export const Colors = {
  light: { ...DEFAULT_COLORS.light, ...(cfgColors.light ?? {}) },
  dark: { ...DEFAULT_COLORS.dark, ...(cfgColors.dark ?? {}) },
};

// 에디터로 조절하는 UI 수치 (모서리/배너높이/게시글밀도/폰트배율 등)
const DEFAULT_UI = { radius: 14, fontScale: 1, bannerHeight: 88, postPaddingV: 11, postThumb: 64 };
export const UI = { ...DEFAULT_UI, ...((uiConfig as any)?.ui ?? {}) };

// 에디터로 교체하는 이미지 자산 (로고 등) — data URL 또는 경로
export const Assets = ((uiConfig as any)?.assets ?? { logo: null }) as { logo: string | null };

export type ThemeColor = keyof typeof DEFAULT_COLORS.light & keyof typeof DEFAULT_COLORS.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// ── 디자인 핸드오프(Claude Design) — 화면별 블렌드를 코드로 강제하는 표면 토큰 ──
// 규칙: 클린(리스트) 화면 = borderBottomWidth:1 + 그림자 없음
//       소프트(카드) 화면 = borderRadius:Radius.card + boxShadow:Shadow.card
export const Radius = {
  list: 12,    // 게시판/리스트 행, 작은 칩
  card: 16,    // 매장·장소 카드 (소프트)
  image: 12,   // 썸네일
  button: 12,
  pill: 999,   // 칩/뱃지/FAB
  tabbar: 30,  // 플로팅 탭바
} as const;

// RN 'boxShadow' 문자열(웹). 네이티브는 elevation 병기 권장.
export const Shadow = {
  card: '0 1px 2px rgba(20,18,40,0.04), 0 5px 18px rgba(20,18,40,0.05)', // 소프트 카드
  cardDark: '0 1px 3px rgba(0,0,0,0.40)',
  float: '0 6px 18px rgba(0,0,0,0.22)',        // 플로팅 탭바
  fab: '0 4px 12px rgba(124,92,252,0.40)',     // 글쓰기 FAB
} as const;

// 뱃지/태그 컬러 맵 — 흩어진 인라인 태그 색을 한곳에서 관리
export const TagColors = {
  // 게시판(board)
  free: { label: '자유', fg: '#5E3FE0', bg: '#EDE8FE' },
  promo: { label: '📢 홍보', fg: '#D9730D', bg: '#FFE7CC' },
  owner: { label: '사장님', fg: '#7C5CFC', bg: '#EDE8FE' },
  staff: { label: '직장인', fg: '#0E8C6A', bg: '#DDF3EC' },
  // 매장 상태
  verify: { label: '✓ 인증', fg: '#FFFFFF', bg: '#11B981' },
  ad: { label: '광고', fg: '#FFFFFF', bg: '#7C5CFC' },
} as const;

// 다크모드 태그 오버라이드 (대비 보정용 — 필요한 것만)
export const TagColorsDark: Partial<Record<keyof typeof TagColors, { fg: string; bg: string }>> = {
  free: { fg: '#C4B5FD', bg: '#2E2546' },
  promo: { fg: '#F0A35A', bg: '#3A2A18' },
  owner: { fg: '#C4B5FD', bg: '#2E2546' },
  staff: { fg: '#6EE7B7', bg: '#13352A' },
};
