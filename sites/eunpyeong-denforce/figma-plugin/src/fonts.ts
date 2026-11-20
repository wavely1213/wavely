// 'KFA 글꼴 적용' 규칙 — 순수 함수 (테스트: tests/figma-plugin.test.ts).
// 피그마 원격 작업(Claude 연결)에서는 KFA고딕을 쓸 수 없어 디자인 세션이 Noto Sans KR 로 임시 스타일을 만들었다.
// 소유자가 자기 컴퓨터에 KFA고딕을 설치하고 데스크톱에서 버튼을 누르면 Noto Sans KR 을 KFAGothic TTF 로 바꾼다 (소유자 결정 "기본적으로 KFA 폰트로").
// 글꼴 파일은 플러그인/저장소에 넣지 않는다 — KFA 라이선스상 제3자 배포 금지 (KNOWN_ISSUES I-007).

export type FontRef = { family: string; style: string };

/** 사이트 글꼴 — src/fonts/KFAGothic-*.woff2 안의 이름 (design/tokens.json font/family 첫 글꼴) */
export const KFA_FAMILY = "KFAGothic TTF";
export const KFA_STYLES = ["Regular", "Bold"] as const;
export type KfaStyle = (typeof KFA_STYLES)[number];
/** 바꿀 임시 글꼴 */
export const SOURCE_FAMILY = "Noto Sans KR";

const WEIGHT_WORDS: Array<[RegExp, number]> = [
  [/^(thin|hairline)$/, 100],
  [/^(extralight|ultralight)$/, 200],
  [/^light$/, 300],
  [/^(regular|normal|book|roman|)$/, 400],
  [/^medium$/, 500],
  [/^(semibold|demibold)$/, 600],
  [/^bold$/, 700],
  [/^(extrabold|ultrabold)$/, 800],
  [/^(black|heavy)$/, 900],
];

/** 스타일 이름 → 굵기 숫자 ('SemiBold' 600, 'Bold Italic' 700, '500' 500). 모르면 400 */
export function styleWeight(style: string): number {
  const s = style.toLowerCase().replace(/italic|oblique/g, "").replace(/[\s_-]/g, "");
  if (/^\d{3}$/.test(s)) return Number(s);
  for (const [re, w] of WEIGHT_WORDS) if (re.test(s)) return w;
  return 400;
}

/** Regular 와 Medium 이하는 Regular, SemiBold 이상은 Bold (KFA고딕은 두 굵기뿐) */
export function kfaStyleFor(style: string): KfaStyle {
  return styleWeight(style) >= 600 ? "Bold" : "Regular";
}

/** 바꿀 글꼴이면 KFA 글꼴, 아니면 null (이미 KFA 이거나 다른 글꼴은 그대로) */
export function swapToKfa(font: FontRef): FontRef | null {
  return font.family.trim() === SOURCE_FAMILY ? { family: KFA_FAMILY, style: kfaStyleFor(font.style) } : null;
}

/** 이 컴퓨터에 없는 KFA 스타일 — 하나라도 없으면 아무것도 바꾸지 않는다 */
export function missingKfaStyles(available: FontRef[]): KfaStyle[] {
  return KFA_STYLES.filter((style) => !available.some((f) => f.family === KFA_FAMILY && f.style === style));
}
