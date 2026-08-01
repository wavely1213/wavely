// 동네레벨 배경 — 앱(RN) 대체안. NEIGHBORHOOD_LEVEL.md §3-4 '앱(RN) 대체안 — 정적 2레이어 상한'.
//
// 웹은 워시·패턴·하이라이트 3레이어 + 모션이지만, 앱은 **워시 1장 + 패턴 1장**까지가 상한이다.
// 하이라이트·모션(낙하·스윕·스파클·글로우 애니)은 웹 전용. 앱이 얌전한 건 정상이며
// 억지로 레이어를 늘리지 말 것(§3-4 주석).
// 그라디언트는 신규 네이티브 의존성 없이 react-native-svg의 LinearGradient/RadialGradient로만 만든다.
import { View } from 'react-native';
import Svg, {
  Circle, Defs, G, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop,
} from 'react-native-svg';

export type BgKey = 'plain' | 'wave' | 'dots' | 'ripple' | 'mountain' | 'lake' | 'sakura' | 'firework' | 'founder';
export const BG_KEYS: BgKey[] = ['plain', 'wave', 'dots', 'ripple', 'mountain', 'lake', 'sakura', 'firework', 'founder'];
export const BG_NAME: Record<BgKey, string> = {
  plain: '단색', wave: '물결', dots: '물방울', ripple: '파문', mountain: '봉의산 능선',
  lake: '의암호 윤슬', sakura: '벚꽃 흩날림', firework: '축제 불꽃', founder: '창단 물결',
};

// 워시 3스톱 — §3-4 표의 light/dark 값을 그대로 옮김(추측 금지).
type Wash = { kind: 'linear' | 'radial' | 'none'; light: [string, string, string]; dark: [string, string, string] };
const WASH: Record<BgKey, Wash> = {
  plain: { kind: 'none', light: ['#FFFFFF', '#FFFFFF', '#FFFFFF'], dark: ['#0C0C0E', '#0C0C0E', '#0C0C0E'] },
  wave: { kind: 'none', light: ['#FFFFFF', '#FFFFFF', '#FFFFFF'], dark: ['#0C0C0E', '#0C0C0E', '#0C0C0E'] },
  dots: { kind: 'linear', light: ['#E6F6FE', '#F5FCFF', '#FFFFFF'], dark: ['#0F2E42', '#0B1C28', '#0C0C0E'] },
  ripple: { kind: 'radial', light: ['#E2F4FC', '#F4FBFE', '#FFFFFF'], dark: ['#0E2C3E', '#0A1A24', '#0C0C0E'] },
  mountain: { kind: 'linear', light: ['#DDEAE5', '#E9F3EF', '#FFFFFF'], dark: ['#14332A', '#0F241E', '#0C0C0E'] },
  lake: { kind: 'linear', light: ['#DBE9F0', '#E9F2F6', '#FFFFFF'], dark: ['#10303E', '#0D2230', '#0C0C0E'] },
  sakura: { kind: 'linear', light: ['#F8DDE7', '#F7E7EE', '#FFFFFF'], dark: ['#33161F', '#1E1015', '#0C0C0E'] },
  firework: { kind: 'radial', light: ['#FBE2D2', '#F6E5DC', '#FFFFFF'], dark: ['#3A1A0C', '#1D1210', '#0C0C0E'] },
  founder: { kind: 'linear', light: ['#F2E7C8', '#EFE7D6', '#FFFFFF'], dark: ['#3A2F14', '#201B10', '#0C0C0E'] },
};
// 패턴 잉크 — 틴트는 '장소의 색'(§3-4 가드레일 5). 브랜드 스카이 일색 금지.
const INK: Record<BgKey, string> = {
  plain: 'transparent', wave: '#0EA5E9', dots: '#38BDF8', ripple: '#0EA5E9',
  mountain: '#3F8F6B', lake: '#2C7DA0', sakura: '#DB6E97', firework: '#F26D1F', founder: '#C08D12',
};
const OPACITY: Record<BgKey, number> = {
  plain: 0, wave: 0.18, dots: 0.2, ripple: 0.22, mountain: 0.26,
  lake: 0.26, sakura: 0.3, firework: 0.32, founder: 0.3,
};

// 패턴 1장 — 웹 타일 SVG와 같은 모티브를 RN 프리미티브로. 타일 크기는 웹 --patsz를 따름.
function Tile({ k, ink }: { k: BgKey; ink: string }) {
  switch (k) {
    case 'wave':
      return <Path d="M0 15 Q16 3 32 15 T64 15 T96 15 T128 15" fill="none" stroke={ink} strokeWidth={4.6} strokeLinecap="round" />;
    case 'dots':
      return (
        <G fill={ink}>
          <Circle cx={6} cy={6.5} r={2.6} /><Circle cx={18.5} cy={14} r={1.8} opacity={0.72} /><Circle cx={9.5} cy={21} r={1.2} opacity={0.5} />
        </G>
      );
    case 'ripple':
      return (
        <G>
          <Circle cx={36} cy={36} r={3.4} fill={ink} />
          <Circle cx={36} cy={36} r={10} fill="none" stroke={ink} strokeWidth={3.4} />
          <Circle cx={36} cy={36} r={20} fill="none" stroke={ink} strokeWidth={2.2} opacity={0.66} />
          <Circle cx={36} cy={36} r={30.5} fill="none" stroke={ink} strokeWidth={1.4} opacity={0.4} />
        </G>
      );
    case 'mountain':
      return (
        <G fill={ink}>
          <Path d="M0 50 L28 26 L48 40 L78 12 L106 38 L130 22 L156 42 L180 30 L180 64 L0 64Z" opacity={0.5} />
          <Path d="M0 58 L34 40 L58 51 L90 28 L118 49 L144 38 L180 52 L180 64 L0 64Z" opacity={0.92} />
        </G>
      );
    case 'lake':
      return (
        <G fill={ink}>
          <Rect x={4} y={6} width={26} height={3.4} rx={1.7} />
          <Rect x={36} y={15} width={38} height={3} rx={1.5} opacity={0.72} />
          <Rect x={78} y={5} width={18} height={2.6} rx={1.3} opacity={0.56} />
          <Rect x={12} y={26} width={30} height={2.8} rx={1.4} opacity={0.5} />
          <Rect x={52} y={34} width={42} height={2.4} rx={1.2} opacity={0.36} />
        </G>
      );
    case 'sakura':
      return (
        <G fill={ink}>
          {[0, 72, 144, 216, 288].map((a) => (
            <Path key={a} d="M0 -5 a2.7 4.6 0 1 0 0.01 0Z" transform={`translate(17,19) rotate(${a})`} />
          ))}
          {[0, 72, 144, 216, 288].map((a) => (
            <Path key={`b${a}`} d="M0 -5 a2.7 4.6 0 1 0 0.01 0Z" transform={`translate(55,52) scale(.82) rotate(${a})`} opacity={0.8} />
          ))}
        </G>
      );
    case 'firework':
      return (
        <G>
          <G stroke={ink} strokeWidth={2.1} strokeLinecap="round" fill="none">
            <Path d="M44 44V20M44 44l17-14M44 44h24M44 44l17 14M44 44v24M44 44l-17 14M44 44H20M44 44L27 30" />
          </G>
          <G fill={ink}>
            <Circle cx={44} cy={44} r={3.6} /><Circle cx={44} cy={17} r={2} /><Circle cx={71} cy={44} r={2} />
            <Circle cx={44} cy={71} r={2} /><Circle cx={17} cy={44} r={2} />
          </G>
        </G>
      );
    case 'founder':
      return (
        <G fill={ink}>
          <Path d="M0 24 L14 11 L28 24 L42 11 L56 24 L56 31 L42 18 L28 31 L14 18 L0 31Z" />
          <Path d="M0 44 L14 31 L28 44 L42 31 L56 44 L56 49 L42 36 L28 49 L14 36 L0 49Z" opacity={0.55} />
        </G>
      );
    default:
      return null;
  }
}
const TILE: Record<BgKey, [number, number]> = {
  plain: [1, 1], wave: [128, 44], dots: [26, 26], ripple: [72, 72], mountain: [180, 64],
  lake: [104, 44], sakura: [78, 78], firework: [88, 88], founder: [56, 56],
};

/** 배경 1장. 적용 범위는 도감 장착 카드·프로필 히어로·리그 헤더 세 곳만(§3-4 가드레일 2). */
export function LevelBg({ bg = 'plain', dark = false, radius = 0 }: { bg?: BgKey | string | null; dark?: boolean; radius?: number }) {
  const k = (BG_KEYS.includes(bg as BgKey) ? bg : 'plain') as BgKey;
  const w = WASH[k];
  const stops = dark ? w.dark : w.light;
  const [tw, th] = TILE[k];
  const pid = `lvbg-p-${k}`;
  const gid = `lvbg-g-${k}`;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius, overflow: 'hidden' }} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          {w.kind === 'linear' && (
            <LinearGradient id={gid} x1="0.12" y1="0" x2="0.88" y2="1">
              <Stop offset="0" stopColor={stops[0]} /><Stop offset="0.5" stopColor={stops[1]} /><Stop offset="1" stopColor={stops[2]} />
            </LinearGradient>
          )}
          {w.kind === 'radial' && (
            <RadialGradient id={gid} cx="0.22" cy="0.18" r="0.95">
              <Stop offset="0" stopColor={stops[0]} /><Stop offset="0.5" stopColor={stops[1]} /><Stop offset="1" stopColor={stops[2]} />
            </RadialGradient>
          )}
          {k !== 'plain' && (
            <Pattern id={pid} patternUnits="userSpaceOnUse" width={tw} height={th}>
              <Tile k={k} ink={INK[k]} />
            </Pattern>
          )}
        </Defs>
        {/* ① 워시 */}
        {w.kind !== 'none' && <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${gid})`} />}
        {/* ② 패턴 — 여기까지가 앱 상한 */}
        {k !== 'plain' && <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${pid})`} opacity={OPACITY[k]} />}
      </Svg>
    </View>
  );
}

export default LevelBg;
