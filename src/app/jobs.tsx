import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DongPicker } from '@/components/DongPicker';
import { mergeDongs } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { useScheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export const PAY_TYPES: Record<string, string> = { hourly: '시급', daily: '일급', monthly: '월급', negotiable: '협의' };

type Job = { id: string; kind: string; title: string; pay_type: string | null; pay: number | null; work_time: string | null; dong: string | null; status: string; created_at: string };

function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return `${Math.max(1, Math.floor(d / 60))}분 전`;
  if (d < 86400) return `${Math.floor(d / 3600)}시간 전`; return `${Math.floor(d / 86400)}일 전`;
}
function payText(j: Job) {
  if (j.pay_type === 'negotiable' || !j.pay) return '협의';
  return `${PAY_TYPES[j.pay_type ?? ''] ?? ''} ${j.pay.toLocaleString()}원`;
}

export default function JobsScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<'all' | 'hiring' | 'seeking'>('all');
  const [dong, setDong] = useState<string | null>(null);
  const [dongOptions, setDongOptions] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [debSearch, setDebSearch] = useState('');
  // 검색어는 입력 즉시가 아니라 350ms 디바운스 후에만 쿼리(키 입력마다 DB 호출 방지)
  useEffect(() => { const t = setTimeout(() => setDebSearch(search), 350); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    supabase.rpc('dong_list').then(({ data }) => setDongOptions(mergeDongs(((data as any[]) ?? []).map((d) => d.dong))));
    let q = supabase.from('jobs').select('id,kind,title,pay_type,pay,work_time,dong,status,created_at').order('created_at', { ascending: false }).limit(60);
    if (kind !== 'all') q = q.eq('kind', kind);
    if (dong) q = q.eq('dong', dong);
    if (debSearch.trim()) q = q.ilike('title', `%${debSearch.trim()}%`);
    const { data } = await q;
    setJobs((data as Job[]) ?? []);
    setLoading(false);
  }, [kind, dong, debSearch]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const TABS: { k: typeof kind; l: string }[] = [{ k: 'all', l: '전체' }, { k: 'hiring', l: '🙋 구인(알바)' }, { k: 'seeking', l: '✋ 구직' }];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border, backgroundColor: c.card }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <Text style={[styles.hTitle, { color: c.text }]}>💼 구인구직</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.tabBar, { backgroundColor: c.card, borderColor: c.border }]}>
        {TABS.map((t) => (
          <Pressable key={t.k} onPress={() => setKind(t.k)} style={[styles.tab, { backgroundColor: kind === t.k ? c.primary : c.background }]}>
            <Text style={{ color: kind === t.k ? c.onPrimary : c.textSecondary, fontWeight: '700', fontSize: 12.5 }}>{t.l}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.dongBar, { backgroundColor: c.card, borderColor: c.border }]}>
        <DongPicker value={dong} options={dongOptions} onChange={setDong} allLabel="춘천시 전체" />
        <View style={[styles.searchBox, { backgroundColor: c.background, borderColor: c.border }]}>
          <Text style={{ fontSize: 13 }}>🔍</Text>
          <TextInput style={[styles.searchInput, { color: c.text }]} placeholder="검색" placeholderTextColor={c.textSecondary} value={search} onChangeText={setSearch} returnKeyType="search" />
        </View>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} />
      ) : jobs.length === 0 ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}>
          <View style={styles.center}><Text style={{ fontSize: 40, marginBottom: 6 }}>💼</Text><Text style={{ color: c.textSecondary }}>아직 공고가 없어요. 첫 글을 올려보세요!</Text></View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 110 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}>
          {jobs.map((j) => (
            <Pressable key={j.id} onPress={() => router.push(`/jobs/${j.id}`)} style={[styles.row, { borderColor: c.border, opacity: j.status === 'closed' ? 0.55 : 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <View style={[styles.kindBadge, { backgroundColor: j.kind === 'hiring' ? c.primarySoft : '#FFE7CC' }]}>
                  <Text style={{ color: j.kind === 'hiring' ? c.primaryDeep : '#D9730D', fontSize: 11, fontWeight: '800' }}>{j.kind === 'hiring' ? '구인' : '구직'}</Text>
                </View>
                {j.status === 'closed' ? <View style={[styles.kindBadge, { backgroundColor: c.backgroundElement }]}><Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '800' }}>마감</Text></View> : null}
                <Text style={{ color: c.textSecondary, fontSize: 11.5, marginLeft: 'auto' }}>{j.dong ? `📍${j.dong} · ` : ''}{ago(j.created_at)}</Text>
              </View>
              <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{j.title}</Text>
              <Text style={[styles.pay, { color: c.primaryDeep }]}>💰 {payText(j)}{j.work_time ? ` · ${j.work_time}` : ''}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Pressable style={[styles.fab, { backgroundColor: c.primary }]} onPress={() => router.push(session ? '/job-new' : '/login')}>
        <Text style={styles.fabTxt}>＋ 공고 올리기</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  hTitle: { fontSize: 16, fontWeight: '800' },
  tabBar: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  tab: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 },
  dongBar: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 13.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 6 },
  kindBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  title: { fontSize: 15.5, fontWeight: '700' },
  pay: { fontSize: 13.5, fontWeight: '700' },
  fab: { position: 'absolute', right: 18, bottom: 28, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 999, boxShadow: '0 3px 8px rgba(0,0,0,0.2)', elevation: 5 },
  fabTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
