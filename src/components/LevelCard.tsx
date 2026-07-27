// 동네레벨 — 앱(RN) 레벨 카드 + 등급 테두리 링. cosmetic-only(검색순위·광고노출 무관).
// get_level_card RPC 미배포면 렌더 안 함(dormant) — 웹과 동일 정책.
// RN엔 conic-gradient가 없어 핸드오프 링의 메탈릭을 SVG LinearGradient 스톱으로 재현(색값은 핸드오프 원본).
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { useScheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export type LevelCardData = {
  nickname: string; level: number; tier: string; xp: number;
  progress_pct: number; equipped_title: string | null; equipped_border: string | null;
  unlocks?: { kind: string; key: string; earned_at?: string }[];
};

// 핸드오프 '와벨리 동네레벨.html' 링 팔레트(--tc + conic 스톱 일부)를 SVG용으로 옮김.
export const TIER_RING: Record<string, { tc: string; stops: [string, string, string] }> = {
  bronze: { tc: '#B0764A', stops: ['#8A5330', '#F0C9A3', '#B0764A'] },
  silver: { tc: '#8E9CB0', stops: ['#6E7A8C', '#F5F8FB', '#8E9CB0'] },
  gold: { tc: '#C8991F', stops: ['#9A7518', '#FFF6CE', '#C8991F'] },
  platinum: { tc: '#6FA5B4', stops: ['#47818F', '#F4FCFE', '#6FA5B4'] },
  diamond: { tc: '#38BDF8', stops: ['#7DD3FC', '#F5D0FE', '#67E8F9'] },
  founder: { tc: '#D9A527', stops: ['#12263F', '#F2DA85', '#1E3A5F'] },
  season_sakura: { tc: '#E88BAE', stops: ['#DB6E97', '#FFF5F8', '#E88BAE'] },
  streak_30: { tc: '#E8752F', stops: ['#B3350A', '#FDE9A8', '#E8752F'] },
  sponsor: { tc: '#0EA5E9', stops: ['#0369A1', '#EAF8FE', '#0EA5E9'] },
};
export const TIER_LABEL: Record<string, string> = { bronze: '브론즈', silver: '실버', gold: '골드', platinum: '플래티넘', diamond: '다이아' };

export function LevelRing({ tier = 'bronze', border, size = 58, label = '와' }: { tier?: string; border?: string | null; size?: number; label?: string }) {
  const scheme = useScheme();
  const c = Colors[scheme];
  const key = (border && TIER_RING[border]) ? border : (TIER_RING[tier] ? tier : 'bronze');
  const ring = TIER_RING[key];
  const rw = 3.5;                       // 링 두께(핸드오프 --rw)
  const gap = 2;                        // 링↔아바타 간격(--gap)
  const box = size + (gap + rw) * 2;
  const r = (box - rw) / 2;
  const gid = 'lvring-' + key;
  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={box} height={box} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={ring.stops[0]} />
            <Stop offset="50%" stopColor={ring.stops[1]} />
            <Stop offset="100%" stopColor={ring.stops[2]} />
          </LinearGradient>
        </Defs>
        <Circle cx={box / 2} cy={box / 2} r={r} stroke={`url(#${gid})`} strokeWidth={rw} fill="none" />
      </Svg>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: c.primaryDeep, fontWeight: '800', fontSize: size * 0.4 }}>{(label || '와').slice(0, 1)}</Text>
      </View>
    </View>
  );
}

// 마이페이지용 레벨 카드. RPC 미배포·비로그인 시 null(dormant).
export function LevelCard({ userId, onPressDogam }: { userId?: string | null; onPressDogam?: () => void }) {
  const scheme = useScheme();
  const c = Colors[scheme];
  const [card, setCard] = useState<LevelCardData | null>(null);

  const load = useCallback(async () => {
    if (!userId) { setCard(null); return; }
    try {
      const { data, error } = await supabase.rpc('get_level_card', { p_user: userId });
      if (error || !data) { setCard(null); return; }
      setCard(data as LevelCardData);
    } catch { setCard(null); }
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  if (!card) return null;   // dormant — RPC 배포 전엔 아무것도 렌더하지 않음
  const pct = Math.max(0, Math.min(100, card.progress_pct || 0));
  const badges = (card.unlocks || []).filter((u) => u.kind === 'badge').slice(0, 6);
  return (
    <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <LevelRing tier={card.tier} border={card.equipped_border} size={52} label={card.nickname} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: c.text }} numberOfLines={1}>{card.nickname}</Text>
            {!!card.equipped_title && (
              <View style={[s.tchip, { backgroundColor: c.primarySoft }]}><Text style={{ color: c.primaryDeep, fontSize: 11.5, fontWeight: '800' }}>{card.equipped_title}</Text></View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: c.textSecondary }}>Lv {card.level} · {TIER_LABEL[card.tier] || '브론즈'}</Text>
            <View style={[s.bar, { backgroundColor: c.backgroundSelected }]}>
              <View style={{ width: `${pct}%`, height: '100%', backgroundColor: c.primary, borderRadius: 999 }} />
            </View>
            <Text style={{ fontSize: 11.5, color: c.textSecondary }}>{pct}%</Text>
          </View>
        </View>
      </View>
      {badges.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {badges.map((b) => (
            <View key={b.key} style={[s.badge, { borderColor: c.verify }]}><Text style={{ fontSize: 11, fontWeight: '700', color: c.verify }}>{b.key}</Text></View>
          ))}
        </View>
      )}
      <Text style={{ fontSize: 11.5, lineHeight: 17, color: c.textSecondary, marginTop: 10 }}>
        레벨은 얼마나 활동했는지, 뱃지는 무엇이 확인됐는지를 뜻해요. 높은 레벨이 신뢰를 보장하지는 않아요.
      </Text>
      {!!onPressDogam && (
        <Pressable onPress={onPressDogam} style={[s.dogam, { borderColor: c.border, backgroundColor: c.background }]}>
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: c.text }}>아이템 도감 열기</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: 14, marginBottom: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  tchip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  bar: { flex: 1, height: 8, borderRadius: 999, overflow: 'hidden' },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  dogam: { marginTop: 10, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

export default LevelCard;
