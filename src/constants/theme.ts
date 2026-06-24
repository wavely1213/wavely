/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

import liveConfig from '@/constants/ui-config.json';
import draftConfig from '@/constants/ui-config.draft.json';
// 디자인 단일 진실 소스(SSOT) — 마스터 핸드오프. 색/라운드/그림자/배지/광고/폰트는 여기서만.
import { Colors as TokenColors, Radius, Shadow, TagColors, AdProducts, Font } from '@/constants/wavely.tokens';
export { Radius, Shadow, TagColors, AdProducts, Font };

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
 *  - 기본 팔레트는 SSOT(wavely.tokens.ts)에서 가져오고, UI 에디터(ui-config.json)가 덮어쓸 수 있습니다.
 *  - 라이트: 밝은 바이올렛 / 다크: 딥 퍼플 (danger/warn 포함)
 */
const DEFAULT_COLORS = TokenColors;

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

// Radius·Shadow·TagColors·AdProducts·Font 는 SSOT(wavely.tokens.ts)에서 import 후 위에서 재수출됨.

// 다크모드 태그 오버라이드 (대비 보정용 — 필요한 것만, SSOT 외 화면 전용)
export const TagColorsDark: Partial<Record<keyof typeof TagColors, { fg: string; bg: string }>> = {
  free: { fg: '#C4B5FD', bg: '#2E2546' },
  promo: { fg: '#F0A35A', bg: '#3A2A18' },
  owner: { fg: '#C4B5FD', bg: '#2E2546' },
  staff: { fg: '#6EE7B7', bg: '#13352A' },
};
