// 와벨리 통일 아이콘셋 — 단색(monochrome) 2px 라인 아이콘(feather 스타일). 이모지 대체.
// 사용: <Icon name="fire" size={22} color={c.primary} />. react-native-svg 기반.
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

export type IconName =
  | 'fire' | 'cart' | 'briefcase' | 'bell' | 'chart' | 'search' | 'edit' | 'pin'
  | 'chat' | 'lock' | 'megaphone' | 'store' | 'star' | 'bookmark' | 'heart' | 'user'
  | 'plus' | 'check' | 'chevronDown' | 'chevronRight' | 'chevronLeft' | 'play' | 'home'
  | 'map' | 'card' | 'x' | 'note' | 'refresh' | 'wallet' | 'building' | 'clock'
  | 'image' | 'trash' | 'share' | 'phone' | 'settings' | 'shield' | 'sparkles' | 'inbox';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export function Icon({ name, size = 22, color = '#111', strokeWidth = 2 }: Props) {
  const s = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render(name, s, color)}
    </Svg>
  );
}

function render(name: IconName, s: any, color: string) {
  switch (name) {
    case 'fire':
      return <Path {...s} d="M12 3c.5 2.5 2 3.6 3 5 1.2 1.6 1.5 3 1.5 4a4.5 4.5 0 1 1-9 0c0-1.3.5-2.4 1.3-3.2C9 13 9.2 12 9 10.5c1.4.6 2 1.6 2.2 2.6C12 11.5 11.4 8 12 3Z" />;
    case 'cart':
      return <>
        <Path {...s} d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.2L20 7H6" />
        <Circle {...s} cx="9.5" cy="19" r="1.4" /><Circle {...s} cx="17.5" cy="19" r="1.4" />
      </>;
    case 'briefcase':
      return <>
        <Rect {...s} x="3" y="7.5" width="18" height="12.5" rx="2.5" />
        <Path {...s} d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3 12.5h18" />
      </>;
    case 'bell':
      return <>
        <Path {...s} d="M6 9a6 6 0 0 1 12 0c0 4.5 1.8 5.8 2 6H4c.2-.2 2-1.5 2-6Z" />
        <Path {...s} d="M10 19a2 2 0 0 0 4 0" />
      </>;
    case 'chart':
      return <><Polyline {...s} points="3,17 9,11 13,15 21,7" /><Polyline {...s} points="15,7 21,7 21,13" /></>;
    case 'search':
      return <><Circle {...s} cx="11" cy="11" r="6.5" /><Path {...s} d="M16 16l4.5 4.5" /></>;
    case 'edit':
      return <><Path {...s} d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16z" /><Path {...s} d="M13.5 6.5l3 3" /></>;
    case 'pin':
      return <><Path {...s} d="M12 21c4-4 7-7.4 7-11a7 7 0 1 0-14 0c0 3.6 3 7 7 11Z" /><Circle {...s} cx="12" cy="10" r="2.5" /></>;
    case 'chat':
      return <Path {...s} d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2Z" />;
    case 'lock':
      return <><Rect {...s} x="4.5" y="10.5" width="15" height="9.5" rx="2.5" /><Path {...s} d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" /></>;
    case 'megaphone':
      return <><Path {...s} d="M4 10v4a1.5 1.5 0 0 0 1.5 1.5H8l8 4V4.5l-8 4H5.5A1.5 1.5 0 0 0 4 10Z" /><Path {...s} d="M8 15.5V19a1.5 1.5 0 0 0 3 0v-2" /></>;
    case 'store':
      return <><Path {...s} d="M4 9l1.2-4.2A1.5 1.5 0 0 1 6.6 3.5h10.8a1.5 1.5 0 0 1 1.4 1.3L20 9M5 9.5v9.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /><Path {...s} d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M10 20v-5h4v5" /></>;
    case 'star':
      return <Path {...s} d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />;
    case 'bookmark':
      return <Path {...s} d="M6 4.5h12a.5.5 0 0 1 .5.5v15l-6.5-4.2L5.5 20V5a.5.5 0 0 1 .5-.5Z" />;
    case 'heart':
      return <Path {...s} d="M12 20S4 15 4 9.5A3.8 3.8 0 0 1 12 7a3.8 3.8 0 0 1 8 2.5C20 15 12 20 12 20Z" />;
    case 'user':
      return <><Circle {...s} cx="12" cy="8" r="3.6" /><Path {...s} d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" /></>;
    case 'plus':
      return <Path {...s} d="M12 5v14M5 12h14" />;
    case 'check':
      return <Polyline {...s} points="5,12.5 10,17.5 19.5,7" />;
    case 'chevronDown':
      return <Polyline {...s} points="6,9 12,15 18,9" />;
    case 'chevronRight':
      return <Polyline {...s} points="9,6 15,12 9,18" />;
    case 'chevronLeft':
      return <Polyline {...s} points="15,6 9,12 15,18" />;
    case 'play':
      return <Path stroke={color} strokeWidth={s.strokeWidth} strokeLinejoin="round" fill={color} d="M8 5.5v13l11-6.5z" />;
    case 'home':
      return <Path {...s} d="M4 11l8-6.5 8 6.5M6 9.8V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.8" />;
    case 'map':
      return <><Path {...s} d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" /><Path {...s} d="M9 4v14M15 6v14" /></>;
    case 'card':
      return <><Rect {...s} x="3" y="6" width="18" height="12" rx="2.5" /><Path {...s} d="M3 10h18" /></>;
    case 'x':
      return <Path {...s} d="M6 6l12 12M18 6L6 18" />;
    case 'note':
      return <><Path {...s} d="M6 3.5h8L18.5 8v12.5a0 0 0 0 1 0 0H6a0 0 0 0 1 0 0Z" /><Path {...s} d="M13.5 3.5V8h5M8.5 12.5h7M8.5 16h5" /></>;
    case 'refresh':
      return <><Path {...s} d="M20 11a8 8 0 1 0-.5 4" /><Polyline {...s} points="20,4 20,11 13,11" /></>;
    case 'wallet':
      return <><Rect {...s} x="3.5" y="6" width="17" height="13" rx="2.5" /><Path {...s} d="M16 12.5h1.5" /><Path {...s} d="M3.5 9h13a1.5 1.5 0 0 1 0 3" /></>;
    case 'building':
      return <><Rect {...s} x="5" y="3.5" width="14" height="16.5" rx="1.5" /><Path {...s} d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 20v-2.5h4V20" /></>;
    case 'clock':
      return <><Circle {...s} cx="12" cy="12" r="8.5" /><Polyline {...s} points="12,7 12,12 16,14" /></>;
    case 'image':
      return <><Rect {...s} x="3.5" y="4.5" width="17" height="15" rx="2.5" /><Circle {...s} cx="9" cy="10" r="1.8" /><Path {...s} d="M4 17l5-4 4 3 3-2.5 4 3.5" /></>;
    case 'trash':
      return <><Path {...s} d="M4.5 6.5h15M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5M6.5 6.5l1 12.5a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-12.5" /></>;
    case 'share':
      return <><Circle {...s} cx="18" cy="6" r="2.5" /><Circle {...s} cx="6" cy="12" r="2.5" /><Circle {...s} cx="18" cy="18" r="2.5" /><Path {...s} d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></>;
    case 'phone':
      return <Path {...s} d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15 15 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z" />;
    case 'settings':
      return <><Circle {...s} cx="12" cy="12" r="3" /><Path {...s} d="M12 3.5v2.2M12 18.3v2.2M4.5 8l1.9 1.1M17.6 14.9l1.9 1.1M19.5 8l-1.9 1.1M6.4 14.9L4.5 16" /></>;
    case 'shield':
      return <Path {...s} d="M12 3.5l7 2.5v5c0 5-3.5 8-7 9.5C8.5 19 5 16 5 11V6l7-2.5Z" />;
    case 'sparkles':
      return <Path {...s} d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z" />;
    case 'inbox':
      return <><Path {...s} d="M4 13l2.5-7.5A1.5 1.5 0 0 1 8 4.5h8a1.5 1.5 0 0 1 1.5 1L20 13v5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18Z" /><Path {...s} d="M4 13h4l1.5 2.5h5L16 13h4" /></>;
    default:
      return null;
  }
}

export default Icon;
