import { Text, View, type ViewStyle } from 'react-native';
import { useScheme } from '@/lib/theme';
import { TagColors, TagColorsDark } from '@/constants/theme';

type Variant = keyof typeof TagColors;

/**
 * 게시판/인증/광고 태그 (디자인 핸드오프 §2).
 * - variant: free/promo/owner/staff/verify/ad
 * - label: 넘기면 기본 라벨을 덮어씀 (예: 📍동네 태그)
 * - tone: 임의 색 지정 (variant 없이 단독 사용)
 * 다크모드에선 TagColorsDark 오버라이드가 있으면 자동 적용.
 */
export function Tag({ variant, label, tone, style }: {
  variant?: Variant;
  label?: string;
  tone?: { fg: string; bg: string };
  style?: ViewStyle;
}) {
  const scheme = useScheme();
  const base = variant ? TagColors[variant] : null;
  const darkOv = variant && scheme === 'dark' ? TagColorsDark[variant] : null;
  const fg = tone?.fg ?? darkOv?.fg ?? base?.fg ?? '#86829A';
  const bg = tone?.bg ?? darkOv?.bg ?? base?.bg ?? '#F1EFF7';
  const text = label ?? base?.label ?? '';
  return (
    <View style={[{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: bg }, style]}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: fg }}>{text}</Text>
    </View>
  );
}
