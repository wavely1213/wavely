import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { boardLabel } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { useScheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Hot = { id: string; board: string; dong: string | null; title: string; body_preview: string | null; image_url: string | null; media_type: string | null; created_at: string; anonymous: boolean; like_count: number; comment_count: number };

const RANGES = [{ d: 1, l: '오늘' }, { d: 7, l: '이번주' }, { d: 30, l: '한달' }];

export default function HotScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session } = useAuth();
  const [rows, setRows] = useState<Hot[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.rpc('hot_posts', { p_dong: null, p_days: days, p_limit: 30 });
    setRows((data as Hot[]) ?? []);
    setLoading(false);
  }, [session, days]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border, backgroundColor: c.card }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Icon name="fire" size={16} color={c.text} /><Text style={[styles.hTitle, { color: c.text }]}>인기글</Text></View>
        <View style={{ width: 40 }} />
      </View>
      <View style={[styles.tabBar, { backgroundColor: c.card, borderColor: c.border }]}>
        {RANGES.map((r) => (
          <Pressable key={r.d} onPress={() => setDays(r.d)} style={[styles.tab, { backgroundColor: days === r.d ? c.primary : c.background }]}>
            <Text style={{ color: days === r.d ? c.onPrimary : c.textSecondary, fontWeight: '700', fontSize: 12.5 }}>{r.l}</Text>
          </Pressable>
        ))}
      </View>

      {!session ? (
        <View style={styles.center}><Text style={{ color: c.textSecondary }}>로그인 후 이용해주세요</Text></View>
      ) : loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} />
      ) : rows.length === 0 ? (
        <View style={styles.center}><Icon name="fire" size={40} color={c.textSecondary} /><Text style={{ color: c.textSecondary, marginTop: 6 }}>아직 인기글이 없어요</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {rows.map((p, i) => (
            <Pressable key={p.id} onPress={() => router.push(`/post/${p.id}`)} style={[styles.row, { borderColor: c.border }]}>
              <Text style={[styles.rank, { color: i < 3 ? c.primary : c.textSecondary }]}>{i + 1}</Text>
              {p.image_url ? <Image source={{ uri: p.image_url }} style={[styles.thumb, { backgroundColor: c.primarySoft }]} contentFit="cover" transition={120} /> : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Avatar url={null} fallback={p.anonymous ? '🕶️' : '🙂'} size={18} bg={c.primarySoft} />
                  <View style={[styles.tag, { backgroundColor: c.primarySoft }]}><Text style={{ color: c.primary, fontSize: 10.5, fontWeight: '800' }}>{boardLabel(p.board)}</Text></View>
                  {p.dong ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Icon name="pin" size={11} color={c.textSecondary} /><Text style={{ color: c.textSecondary, fontSize: 11 }}>{p.dong}</Text></View> : null}
                </View>
                <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{p.title}</Text>
                <View style={[styles.meta, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                  <Icon name="heart" size={12} color={c.textSecondary} />
                  <Text style={{ color: c.textSecondary, fontSize: 12 }}>{p.like_count}</Text>
                  <Text style={{ color: c.textSecondary, fontSize: 12 }}> · </Text>
                  <Icon name="chat" size={12} color={c.textSecondary} />
                  <Text style={{ color: c.textSecondary, fontSize: 12 }}>{p.comment_count}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  hTitle: { fontSize: 16, fontWeight: '800' },
  tabBar: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  tab: { paddingHorizontal: 15, paddingVertical: 7, borderRadius: 999 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  rank: { fontSize: 17, fontWeight: '900', width: 22, textAlign: 'center' },
  thumb: { width: 52, height: 52, borderRadius: 10 },
  tag: { paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 5 },
  title: { fontSize: 14.5, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 4 },
});
