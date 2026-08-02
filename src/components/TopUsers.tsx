// 동네 랭킹 — XP 상위 이웃 TOP3. 웹(RailRank)과 같은 규칙·같은 데이터.
// cosmetic-only(§0 불변식): 이 순위는 검색·광고·매장추천에 어떤 영향도 주지 않는다.
// 노출 규칙은 서버(get_top_users)가 판정한다 — 관리자 제외 · rank_hidden 제외 · XP 0 제외.
// 2명 미만이면(경쟁이 없으면) 위젯 자체를 렌더하지 않는다. RPC 미배포면 조용히 숨는다.
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Txt';

import { LevelRing, TIER_LABEL } from '@/components/LevelCard';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useScheme } from '@/lib/theme';

type TopUser = { id: string; nickname: string; level: number; xp: number; tier: string; border: string | null; avatar: string | null };
const tierOf = (lvl: number) => (lvl >= 50 ? 'diamond' : lvl >= 35 ? 'platinum' : lvl >= 20 ? 'gold' : lvl >= 10 ? 'silver' : 'bronze');
const MEDAL = ['🥇', '🥈', '🥉'];

export function TopUsers({ onPress }: { onPress?: () => void }) {
  const scheme = useScheme();
  const c = Colors[scheme];
  const [top, setTop] = useState<TopUser[] | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_top_users', { p_limit: 3 });
      if (error || !Array.isArray(data)) { setTop([]); return; }
      setTop((data as any[]).map((p) => ({
        id: p.user_id, nickname: p.nickname || '회원', level: p.lvl || 1, xp: p.xp || 0,
        tier: tierOf(p.lvl || 1), border: p.equipped_border || null, avatar: p.avatar_url || null,
      })));
    } catch { setTop([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!top || top.length < 2) return null;   // 경쟁이 없으면 랭킹이 아니다
  return (
    <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={s.head}>
        <Text style={[s.headT, { color: c.text }]}>동네 랭킹</Text>
        {!!onPress && (
          <Pressable onPress={onPress} hitSlop={8}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.textSecondary }}>내 레벨 →</Text>
          </Pressable>
        )}
      </View>
      {top.map((u, i) => (
        <View key={u.id} style={s.row}>
          <Text style={[s.medal, { color: c.textSecondary }]}>{MEDAL[i] || String(i + 1)}</Text>
          <LevelRing tier={u.tier} border={u.border} size={32} label={u.nickname} img={u.avatar} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.nick, { color: c.text }]} numberOfLines={1}>{u.nickname}</Text>
            <Text style={[s.sub, { color: c.textSecondary }]}>Lv {u.level} · {TIER_LABEL[u.tier] || '브론즈'}</Text>
          </View>
        </View>
      ))}
      <Text style={[s.note, { color: c.textSecondary }]}>활동할수록 레벨이 올라요 · 꾸미기 전용이에요</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: 14, marginTop: 12, borderRadius: 16, borderWidth: 1, paddingBottom: 6, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  headT: { flex: 1, fontSize: 14.5, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 7 },
  medal: { width: 22, textAlign: 'center', fontSize: 15, fontWeight: '800' },
  nick: { fontSize: 13.5, fontWeight: '700' },
  sub: { fontSize: 11.5, marginTop: 1 },
  note: { fontSize: 11, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, lineHeight: 16 },
});

export default TopUsers;
