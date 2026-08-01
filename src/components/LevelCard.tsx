// 동네레벨 — 앱(RN) 레벨 카드 + 등급 테두리 링. cosmetic-only(검색순위·광고노출 무관).
// get_level_card RPC 미배포면 렌더 안 함(dormant) — 웹과 동일 정책.
// RN엔 conic-gradient가 없어 핸드오프 링의 메탈릭을 SVG LinearGradient 스톱으로 재현(색값은 핸드오프 원본).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Txt';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { useScheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

// get_level_card RPC 반환 계약(§1). dong/joined_at/activity는 화면 B 활동·신뢰 존용.
export type LevelCardData = {
  nickname: string; level: number; tier: string; xp: number;
  xp_into_level?: number; xp_span?: number;
  progress_pct: number;
  equipped_title: string | null; equipped_border: string | null; equipped_background?: string | null;
  dong?: string | null; joined_at?: string | null;
  activity?: { posts?: number; comments?: number; likes_received?: number; visits_verified?: number; streak_days?: number };
  unlocks?: { kind: string; key: string; earned_at?: string }[];
};
// 칭호·뱃지는 서버가 key만 준다 → 표시명은 클라 상수표(§4·§5). 매핑이 없으면 'owner' 같은 원문 키가 그대로 노출된다.
export const TITLE_NAME: Record<string, string> = {
  rookie: '새내기 이웃', guardian: '동네 지킴이', chatter: '수다쟁이', localboss: '○○동 터줏대감',
  hunter: '맛집 헌터', beloved: '사랑받는 글쟁이', evangelist: '전도사', captain: '동네 반장', regular: '이달의 단골',
};
const TITLE_RARE = new Set(['localboss', 'hunter', 'beloved', 'captain', 'regular']);
export const BADGE_NAME: Record<string, string> = {
  owner: '사장님', biz: '사업자인증', resident_6m: '오래된 주민', popular: '인기글러', neighbor: '인증이웃',
};
// localboss는 동 이름을 주입한다(§4): '효자동 터줏대감'.
export const titleLabel = (key?: string | null, dong?: string | null) =>
  !key ? '' : key === 'localboss' ? `${dong || '우리'}동 터줏대감`.replace('동동', '동') : (TITLE_NAME[key] || key);

// 앱 링 정본 = NEIGHBORHOOD_LEVEL.md §3-3 표(선형 3스톱). 웹 conic에서 임의 발췌 금지.
// 공통: 135° 대각(x1=0 y1=0 x2=1 y2=1), 오프셋 0/0.5/1, stroke 3.5, 링↔얼굴 간격 2px.
// ⚠ 이전 값은 9종 모두 스톱 순서가 표와 달랐다(어두운색이 0번). 표 그대로 밝은색→중간→어두운색.
// med: 특수 아이템 코너 메달(§3-3 '특수 메달 적용 · 비용 0'). spin: 다이아만 10s 회전(앱 유일 모션).
export const TIER_RING: Record<string, { tc: string; stops: [string, string, string]; med?: MedKey; spin?: boolean }> = {
  bronze: { tc: '#B0764A', stops: ['#F0C9A3', '#B0764A', '#8A5330'] },
  silver: { tc: '#8E9CB0', stops: ['#F5F8FB', '#8E9CB0', '#6E7A8C'] },
  gold: { tc: '#C8991F', stops: ['#FFF6CE', '#C8991F', '#9A7518'] },
  platinum: { tc: '#6FA5B4', stops: ['#F4FCFE', '#6FA5B4', '#47818F'] },
  diamond: { tc: '#38BDF8', stops: ['#7DD3FC', '#F5D0FE', '#A7F3D0'], spin: true },
  founder: { tc: '#D9A527', stops: ['#F2DA85', '#1E3A5F', '#5D8FC7'], med: 'founder' },
  season_sakura: { tc: '#E88BAE', stops: ['#FFF5F8', '#F0A6C0', '#DB6E97'], med: 'sakura' },
  streak_30: { tc: '#E8752F', stops: ['#FDE9A8', '#E8752F', '#B3350A'], med: 'streak' },
  sponsor: { tc: '#0EA5E9', stops: ['#EAF8FE', '#0EA5E9', '#0369A1'], med: 'sponsor' },
};
type MedKey = 'founder' | 'sakura' | 'streak' | 'sponsor';
// 메달 글리프·배경 — 웹 .med.m-*(index.css)와 동일 path/색.
const MED: Record<MedKey, { d: string; bg: string; fg: string }> = {
  founder: { d: 'M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.4l6-.8z', bg: '#D9A527', fg: '#fff' },
  sakura: { d: 'M12 2c1.6 2 2.4 3.7 2.4 5.2 1.4-.7 3.1-.9 5.4-.4-.8 2.4-2 3.8-3.3 4.6 1.3.8 2.5 2.2 3.3 4.6-2.3.5-4 .3-5.4-.4 0 1.5-.8 3.2-2.4 5.2-1.6-2-2.4-3.7-2.4-5.2-1.4.7-3.1.9-5.4.4.8-2.4 2-3.8 3.3-4.6C6.2 10.6 5 9.2 4.2 6.8c2.3-.5 4-.3 5.4.4C9.6 5.7 10.4 4 12 2z', bg: '#DB6E97', fg: '#fff' },
  streak: { d: 'M13 2c.5 3.4-1.2 5-2.8 6.6C8.4 10.4 7 12 7 14.6A6.2 6.2 0 0 0 13.2 21c3.6 0 6.3-2.7 6.3-6.4 0-4.4-3.4-6.6-3.4-6.6.3 2-1 3.2-1.8 3.2-1.2 0-1.7-1-1.7-2.6 0-2.2.9-4 .4-6.6z', bg: '#E8752F', fg: '#fff' },
  sponsor: { d: 'M4 4h16l1 5a3 3 0 0 1-5.7 1.4A3 3 0 0 1 12 12a3 3 0 0 1-3.3-1.6A3 3 0 0 1 3 9zM5 13v7h14v-7', bg: '#0284C7', fg: '#fff' },
};
export const TIER_LABEL: Record<string, string> = { bronze: '브론즈', silver: '실버', gold: '골드', platinum: '플래티넘', diamond: '다이아' };

export function LevelRing({ tier = 'bronze', border, size = 58, label = '와', img, anon = false }:
  { tier?: string; border?: string | null; size?: number; label?: string; img?: string | null; anon?: boolean }) {
  const scheme = useScheme();
  const c = Colors[scheme];
  const rw = 3.5;                       // 링 두께(§3-3 stroke-width)
  const gap = 2;                        // 링↔얼굴 간격(§3-3)
  const box = size + (gap + rw) * 2;    // 뷰박스 s+11
  const r = (box - rw) / 2;             // r = (s+11-3.5)/2
  const key = (border && TIER_RING[border]) ? border : (TIER_RING[tier] ? tier : 'bronze');
  const ring = TIER_RING[key];
  const gid = 'lvring-' + key;
  const spin = useRef(new Animated.Value(0)).current;
  // 다이아 회전 10s — §3-3에서 앱에 유일하게 허용된 모션. 다른 등급은 정지.
  useEffect(() => {
    if (anon || !ring.spin) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [anon, ring.spin, spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // 익명 = 회색 무광 링, 테두리·메달 없음(§7-C).
  const face = (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: anon ? c.backgroundElement : c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      {img && !anon
        ? <Image source={{ uri: img }} style={{ width: size, height: size }} contentFit="cover" />
        : <Text style={{ color: anon ? c.textSecondary : c.primaryDeep, fontWeight: '800', fontSize: size * 0.4 }}>{anon ? '익' : (label || '와').slice(0, 1)}</Text>}
    </View>
  );
  if (anon) {
    return (
      <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={box} height={box} style={StyleSheet.absoluteFill}>
          <Circle cx={box / 2} cy={box / 2} r={r} stroke={c.border} strokeWidth={2} fill="none" />
        </Svg>
        {face}
      </View>
    );
  }
  // 메달은 링 지름에 비례(웹 --s*.44). 아주 작은 인라인 링에선 글리프가 뭉개지므로 생략.
  const medKey = ring.med;
  const medSize = Math.max(17, Math.round(size * 0.44));
  const showMed = !!medKey && size >= 36;
  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, ring.spin ? { transform: [{ rotate }] } : null]}>
        <Svg width={box} height={box}>
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={ring.stops[0]} />
              <Stop offset="0.5" stopColor={ring.stops[1]} />
              <Stop offset="1" stopColor={ring.stops[2]} />
            </LinearGradient>
          </Defs>
          <Circle cx={box / 2} cy={box / 2} r={r} stroke={`url(#${gid})`} strokeWidth={rw} fill="none" />
        </Svg>
      </Animated.View>
      {face}
      {showMed && (
        <View style={{
          position: 'absolute', right: 0, bottom: 0, width: medSize, height: medSize, borderRadius: medSize / 2,
          backgroundColor: MED[medKey!].bg, borderWidth: 2, borderColor: c.background,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Svg width={medSize * 0.56} height={medSize * 0.56} viewBox="0 0 24 24">
            <Path d={MED[medKey!].d} fill={MED[medKey!].fg} />
          </Svg>
        </View>
      )}
    </View>
  );
}

// 마이페이지용 레벨 카드. RPC 미배포·비로그인 시 null(dormant).
export function LevelCard({ userId, avatarUrl, onPressDogam }: { userId?: string | null; avatarUrl?: string | null; onPressDogam?: () => void }) {
  const scheme = useScheme();
  const c = Colors[scheme];
  const [card, setCard] = useState<LevelCardData | null>(null);

  const [lvUp, setLvUp] = useState<number | null>(null);
  const load = useCallback(async () => {
    if (!userId) { setCard(null); return; }
    try {
      const { data, error } = await supabase.rpc('get_level_card', { p_user: userId });
      if (error || !data) { setCard(null); return; }
      const c2 = data as LevelCardData;
      setCard(c2);
      // 기기별 AsyncStorage 기준이라 다른 기기에서 오른 레벨은 그 기기에서 1회만 알린다(중복 알림 방지).
      try {
        const K = 'wv_lv_seen:' + userId;
        const seen = Number((await AsyncStorage.getItem(K)) || 0);
        if (seen && c2.level > seen) setLvUp(c2.level);
        await AsyncStorage.setItem(K, String(c2.level));
      } catch { /* 저장 실패는 무시 — 알림만 못 뜬다 */ }
    } catch { setCard(null); }
  }, [userId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (lvUp == null) return;
    const t = setTimeout(() => setLvUp(null), 2600);   // 웹과 동일 2.6s
    return () => clearTimeout(t);
  }, [lvUp]);

  if (!card) return null;   // dormant — RPC 배포 전엔 아무것도 렌더하지 않음
  // 레벨업 감지 — 서버가 leveled_up 플래그를 안 주므로 직전에 본 레벨과 비교한다.
  // 승급 광선·컨페티는 §3-3 '앱 이펙트 범위'에서 미적용으로 확정 → 앱은 토스트만.
  const pct = Math.max(0, Math.min(100, card.progress_pct || 0));
  const badges = (card.unlocks || []).filter((u) => u.kind === 'badge').slice(0, 6);
  return (
    <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
      {lvUp != null && (
        <View style={[s.lvup, { backgroundColor: c.primarySoft, borderColor: c.primary }]}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: c.primaryDeep }}>🎉 Lv {lvUp} 달성</Text>
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: c.primaryDeep, marginTop: 2 }}>도감에서 새 아이템을 확인해 보세요</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <LevelRing tier={card.tier} border={card.equipped_border} size={52} label={card.nickname} img={avatarUrl} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: c.text }} numberOfLines={1}>{card.nickname}</Text>
            {!!card.equipped_title && (
              <View style={[s.tchip, { backgroundColor: TITLE_RARE.has(card.equipped_title) ? '#FFF6CE' : c.primarySoft, borderWidth: TITLE_RARE.has(card.equipped_title) ? 1 : 0, borderColor: '#E8C463' }]}>
                <Text style={{ color: TITLE_RARE.has(card.equipped_title) ? '#9A7518' : c.primaryDeep, fontSize: 11.5, fontWeight: '800' }}>{titleLabel(card.equipped_title, card.dong)}</Text>
              </View>
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
            <View key={b.key} style={[s.badge, { borderColor: c.verify }]}><Text style={{ fontSize: 11, fontWeight: '700', color: c.verify }}>{BADGE_NAME[b.key] || b.key}</Text></View>
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
