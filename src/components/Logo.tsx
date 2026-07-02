// 와벨리 로고 마크 — 물결 곡선 2줄(wave-ly). 벡터(react-native-svg)라 해상도 자유·PNG 불필요.
// withBg: 브랜드 라운드 사각 배경 + 흰 물결(앱아이콘/스플래시용). 없으면 색상 물결만(헤더용).
import Svg, { Path, Rect } from 'react-native-svg';

const WAVE_A = 'M2.5 9 c 3 -3 6.5 3 9.5 0 s 6.5 -3 9.5 0';
const WAVE_B = 'M2.5 15 c 3 -3 6.5 3 9.5 0 s 6.5 -3 9.5 0';

type Props = { size?: number; color?: string; bg?: string | null; rounded?: number };

export function Logo({ size = 30, color = '#7A2BC4', bg = null, rounded }: Props) {
  const stroke = bg ? '#FFFFFF' : color;
  const sw = { stroke, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as const };
  const rx = rounded ?? 6;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {bg ? <Rect x="0" y="0" width="24" height="24" rx={rx} fill={bg} /> : null}
      <Path {...sw} d={WAVE_A} />
      <Path {...sw} d={WAVE_B} />
    </Svg>
  );
}

export default Logo;
